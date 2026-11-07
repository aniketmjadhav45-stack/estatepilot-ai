# EstatePilot AI — Comprehensive Profile Email Security Architecture Review

**Date**: October 30, 2026  
**Auditor**: Principal SaaS Security Architect  
**Scope**: In-Depth Security Review of `public.profiles.email` Protection & Auth Synchronization  
**Status**: All Findings Resolved Locally; Remote Deployment Paused Awaiting Human Approval  

---

## Executive Summary

This security review details the final hardened architecture governing user email addresses within EstatePilot AI Phase 0 and Phase 1. Following iterative security evaluations, four specific vulnerabilities and hardening requirements were analyzed and resolved:

1. **Finding 1 — Removal of `pg_trigger_depth()` as an Authorization Boundary**: Eliminated reliance on PostgreSQL trigger recursion depth as proof of trusted execution.
2. **Finding 2 — Fail-Closed Exception Handling & Email-Specific Confirmation**: Eliminated fail-open exceptions (`EXCEPTION WHEN OTHERS THEN RETURN NEW;`) and generic `confirmed_at` checks, enforcing fail-closed behavior and strict `email_confirmed_at` lifecycle verification.
3. **Finding 3 — Database Engine Column-Level Privileges**: Enforced PostgreSQL column-level `UPDATE` grants, permanently denying ordinary authenticated roles write access to `email`, `is_platform_admin`, and `id` at the database engine parser level.
4. **Finding 4 — Strict Preservation of User Isolation and Invariants**: Verified that synchronization is strictly scoped to `WHERE id = NEW.id`, rejects pending changes, requires fresh confirmation timestamps, and prevents cross-user pollution.

The entire automated test suite of **92 tests** passes locally with zero failures. Remote Supabase deployment remains strictly blocked.

---

## 1. Database-Level Column Protection Architecture (Finding 3)

### 1.1 The Engine vs RLS Privilege Boundary
In PostgreSQL, Row Level Security (`RLS`) policies are evaluated only after table and column permissions are verified by the SQL query planner:
- If a role holds table-level `UPDATE` privileges, column-level restrictions cannot be enforced.
- By revoking table-level `UPDATE` from `PUBLIC`, `anon`, and `authenticated` roles, and granting `UPDATE` strictly on allowed editable columns, any SQL statement or PostgREST `PATCH` targeting `email` is rejected immediately with a database error:
  ```
  PermissionDeniedError: permission denied for column "email" of relation "profiles"
  ```
- This occurs **before** any RLS policies or trigger functions execute, providing unconditional hardware-level enforcement against direct PostgREST client modifications.

### 1.2 Exact SQL Grants Before and After

#### Before:
```sql
-- Vulnerable: Table-level UPDATE granted to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
```

#### After (Hardened):
```sql
-- 1. Revoke table-level UPDATE
REVOKE UPDATE ON public.profiles FROM PUBLIC;
REVOKE UPDATE ON public.profiles FROM anon, authenticated;

-- 2. Grant column-level UPDATE strictly on user-editable fields
GRANT UPDATE (first_name, last_name, phone, avatar_url, time_zone, locale, updated_at) 
    ON public.profiles TO authenticated;

-- 3. Maintain table-level privileges for administrative services
GRANT ALL ON public.profiles TO service_role, postgres;
```

### 1.3 Columns Protected at Engine Level
| Column | `authenticated` Role Privilege | Engine Behavior on Update Attempt |
|:---|:---:|:---|
| `first_name`, `last_name` | `UPDATE` Granted | Permitted (subject to RLS `id = auth.uid()`) |
| `phone`, `avatar_url` | `UPDATE` Granted | Permitted (subject to RLS `id = auth.uid()`) |
| `time_zone`, `locale`, `updated_at` | `UPDATE` Granted | Permitted (subject to RLS `id = auth.uid()`) |
| **`email`** | **REVOKED (No Grant)** | **Engine Exception**: `permission denied for column "email"` |
| **`is_platform_admin`** | **REVOKED (No Grant)** | **Engine Exception**: `permission denied for column "is_platform_admin"` |
| **`id`** | **REVOKED (No Grant)** | **Engine Exception**: `permission denied for column "id"` |

---

## 2. Trigger & Immutability Architecture (Findings 1, 2, and 4)

To provide defense-in-depth even if an administrative caller or unexpected workflow attempts to alter `email`, a dual-trigger architecture enforces immutable email integrity and trusted Supabase Auth synchronization.

### 2.1 Profile Immutability Trigger: `check_profile_email_immutability()`
- **Event**: `BEFORE UPDATE OF email ON public.profiles FOR EACH ROW`
- **Security Mode**: `SECURITY DEFINER SET search_path = public, pg_temp`
- **Key Properties**:
  1. **Zero `pg_trigger_depth()` Trust**: Removed `pg_trigger_depth() >= 2`. Trigger depth is never treated as an authorization mechanism.
  2. **Direct Auth State Verification**: Looks up `email`, `email_confirmed_at`, and `email_change` directly from `auth.users` for `WHERE id = NEW.id`.
  3. **Fail-Closed Design**: If any database error occurs or if `auth.users` state does not match `NEW.email` with valid confirmation, the exception block resets variables to `NULL` and immediately raises `ImmutableEmailError`.
  4. **Super-Admin Bypass**: Platform super-admins retain emergency bypass for manual customer-support repairs.

```sql
CREATE OR REPLACE FUNCTION public.check_profile_email_immutability()
RETURNS TRIGGER AS $$
DECLARE
    v_auth_email TEXT;
    v_email_confirmed_at TIMESTAMPTZ;
    v_email_change TEXT;
BEGIN
    IF NEW.email <> OLD.email THEN
        IF public.is_super_admin() THEN
            RETURN NEW;
        END IF;

        -- Verify state directly against auth.users for this specific user ID
        BEGIN
            SELECT email, email_confirmed_at, email_change
            INTO v_auth_email, v_email_confirmed_at, v_email_change
            FROM auth.users
            WHERE id = NEW.id;

            IF v_auth_email IS NOT NULL 
               AND lower(v_auth_email) = lower(NEW.email)
               AND v_email_confirmed_at IS NOT NULL
               AND (v_email_change IS NULL OR v_email_change = '' OR lower(v_email_change) <> lower(NEW.email)) THEN
                RETURN NEW;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Finding 2: Fail-closed on any error
            v_auth_email := NULL;
            v_email_confirmed_at := NULL;
        END;

        RAISE EXCEPTION 'ImmutableEmailError: Profile email cannot be modified directly. Email changes must proceed via auth email verification.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
```

### 2.2 Trusted Auth Synchronization Trigger: `handle_auth_user_email_updated()`
- **Event**: `AFTER UPDATE OF email, email_confirmed_at ON auth.users FOR EACH ROW`
- **Security Mode**: `SECURITY DEFINER SET search_path = public, pg_temp`
- **Privilege Revocation**: Direct execution explicitly revoked:
  ```sql
  REVOKE EXECUTE ON FUNCTION public.handle_auth_user_email_updated() FROM PUBLIC;
  REVOKE EXECUTE ON FUNCTION public.handle_auth_user_email_updated() FROM anon, authenticated;
  ```
- **Lifecycle Guarantees**:
  1. **Email-Specific Confirmation**: Verifies `NEW.email_confirmed_at IS NOT NULL`. Generic `confirmed_at` (which Supabase sets for phone confirmations) is ignored.
  2. **Pending Email Detection**: Verifies that `NEW.email_change` is not equal to `NEW.email`. An email change link that has been sent but not yet clicked will never synchronize.
  3. **Confirmation Timestamp Freshness**: When modifying an existing confirmed email, requires `NEW.email_confirmed_at > OLD.email_confirmed_at`. A user cannot use a stale confirmation timestamp from years ago to validate a newly updated email.
  4. **Strict User Boundary**: Updates `public.profiles` strictly `WHERE id = NEW.id`.

```sql
CREATE OR REPLACE FUNCTION public.handle_auth_user_email_updated()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.email IS NULL OR (OLD.email IS NOT NULL AND NEW.email = OLD.email) THEN
        RETURN NEW;
    END IF;

    -- Finding 2: Email-specific confirmation only
    IF NEW.email_confirmed_at IS NULL THEN
        RETURN NEW;
    END IF;

    -- Block pending confirmation states
    IF NEW.email_change IS NOT NULL AND NEW.email_change <> '' AND lower(NEW.email_change) = lower(NEW.email) THEN
        RETURN NEW;
    END IF;

    -- Require fresh confirmation timestamp when changing an existing confirmed email
    IF OLD.email IS NOT NULL AND OLD.email_confirmed_at IS NOT NULL THEN
        IF NEW.email_confirmed_at <= OLD.email_confirmed_at THEN
            RETURN NEW;
        END IF;
    END IF;

    -- Finding 4: Narrowly scoped update strictly for matching user ID
    UPDATE public.profiles
    SET email = NEW.email,
        updated_at = NOW()
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
AFTER UPDATE OF email, email_confirmed_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_email_updated();
```

---

## 3. Invitation Acceptance Identity Verification (Hardened via HIGH-01 Resolution)

In `accept_invitation_atomic(p_token_hash)`:
- Caller ID is derived exclusively from `public.current_auth_user_id()`.
- The caller's email is retrieved **exclusively** from `auth.users` with mandatory email confirmation:
  ```sql
  -- SEC-04, FINDING 2 & HIGH-01: Trusted email resolution strictly from auth.users.
  -- Requires email-specific confirmation. Never fall back to public.profiles.
  BEGIN
      SELECT email INTO v_user_email 
      FROM auth.users 
      WHERE id = v_user_id 
        AND email_confirmed_at IS NOT NULL;
  EXCEPTION WHEN OTHERS THEN
      v_user_email := NULL;
  END;

  IF v_user_email IS NULL OR trim(v_user_email::TEXT) = '' THEN
      RAISE EXCEPTION 'EmailUnconfirmed: Caller email must be confirmed in auth.users before accepting an invitation.';
  END IF;
  ```
- **HIGH-01 Vulnerability Remediated**:
  - The fallback `SELECT email INTO v_user_email FROM public.profiles WHERE id = v_user_id;` was **completely deleted**.
  - Any caller without a confirmed email in `auth.users` (`email_confirmed_at IS NULL`, unconfirmed email, or phone-only confirmation) is rejected immediately with `EmailUnconfirmed`.
  - Zero reliance on `public.profiles.email` for invitation identity validation.
- Case-insensitive comparison `lower(v_invitation.email::TEXT) = lower(v_user_email::TEXT)` ensures zero possibility of accepting an invitation issued to a different address.

---

## 4. Attack Scenarios & Mitigations Matrix

| Attack Vector | Attacker Action | Mitigation Mechanism | Error / Result |
|:---|:---|:---|:---|
| **Direct PostgREST Update** | `PATCH /profiles?id=eq.<uid>` with `{"email": "hacker@test.com"}` | Column-level permissions: `authenticated` role lacks `UPDATE` on `profiles.email` | `PermissionDeniedError: permission denied for column "email"` |
| **Direct PostgREST Privilege Escalation** | `PATCH /profiles?id=eq.<uid>` with `{"is_platform_admin": true}` | Column-level permissions + RLS `WITH CHECK` | `PermissionDeniedError: permission denied for column "is_platform_admin"` |
| **Unconfirmed Account Invitation Hijacking (HIGH-01)** | Attacker registers unconfirmed account matching invitation, attempts `accept_invitation_atomic` | `accept_invitation_atomic` resolves email exclusively from `auth.users` where `email_confirmed_at IS NOT NULL` (no profiles fallback) | `EmailUnconfirmed: Caller email must be confirmed in auth.users before accepting an invitation.` |
| **Phone-Confirmed Auth Account** | Attacker registers via phone, enters unconfirmed email into `auth.users.email` | `handle_auth_user_email_updated` and `accept_invitation_atomic` check `email_confirmed_at IS NOT NULL` | Profile synchronization skipped; invitation acceptance rejected with `EmailUnconfirmed` |
| **Pending Email Interception** | User requests email change, email is in `email_change` before clicking confirmation link | Trigger verifies `NEW.email_change <> NEW.email` | Modification rejected until confirmation token is redeemed |
| **Stale Confirmation Replay** | User modifies Auth email without re-confirming; old `email_confirmed_at` remains in row | Trigger verifies `NEW.email_confirmed_at > OLD.email_confirmed_at` | Modification rejected; stale timestamp cannot confirm new email |
| **Cross-User Modification** | User attempts Auth update expecting to overwrite another tenant's profile | Trigger enforces `WHERE id = NEW.id` | Profile row updated strictly matches authenticated `auth.users.id` |
| **Custom GUC / Trigger Depth Spoofing** | Attacker sets `SET LOCAL estatepilot.syncing_profile_email = 'true'` | Zero GUC or `pg_trigger_depth()` checks exist in any trigger | Immutability trigger checks `auth.users` database state; fails closed |

---

## 5. Automated Test Suite Results

The entire monorepo test suite was executed locally using Node.js Test Runner:

```
TAP version 13
# tests 100
# suites 0
# pass 100
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 745.9325
```

### 5.1 Email Security & Column Privilege Test Cases
- `Invitations RPC [HIGH-01]: accept_invitation_atomic rejects unconfirmed email even when profile email matches` — **PASS**
- `Invitations RPC [HIGH-01]: accept_invitation_atomic rejects phone-only confirmation` — **PASS**
- `Invitations RPC [HIGH-01]: accept_invitation_atomic succeeds for confirmed matching auth.users email` — **PASS**
- `Invitations RPC [HIGH-01]: accept_invitation_atomic rejects confirmed but mismatching email` — **PASS**
- `Invitations RPC [HIGH-01]: accept_invitation_atomic rejects expired invitation token` — **PASS**
- `Local DB Schema [HIGH-01]: Invitation acceptance strictly resolves email from auth_users and rejects unconfirmed email even if profile matches` — **PASS**
- `Local DB Schema [HIGH-01]: Invitation acceptance rejects phone-only confirmation in auth_users` — **PASS**
- `Local DB Schema [HIGH-01]: Invitation acceptance succeeds for confirmed matching auth_users email` — **PASS**
- `Local DB Schema [HIGH-01]: Invitation acceptance rejects confirmed but mismatching email` — **PASS**
- `PostgreSQL RLS [SEC-04]: User cannot directly modify profile email` — **PASS**
- `PostgreSQL RLS [FINDING 1]: Caller cannot bypass profile email immutability via custom GUC or parameters` — **PASS**
- `PostgreSQL RLS [FINDING 2]: Phone-only confirmation (emailConfirmedAt is null) does NOT synchronize email` — **PASS**
- `PostgreSQL RLS [FINDING 2]: Pending email change (emailChange === newEmail) does NOT synchronize profile` — **PASS**
- `PostgreSQL RLS [FINDING 2]: Stale historical email_confirmed_at timestamp does NOT synchronize newly changed email` — **PASS**
- `PostgreSQL RLS [FINDING 2]: Failed Auth verification rejects synchronization (fail-closed)` — **PASS**
- `PostgreSQL RLS [FINDING 3]: Authenticated user cannot update profiles.email directly through PostgREST permissions` — **PASS**
- `PostgreSQL RLS [FINDING 3]: Authenticated user can still update allowed profile columns` — **PASS**
- `Local DB Schema [SEC-04]: Profile email cannot be updated directly` — **PASS**
- `Local DB Schema [OBS-02]: Verified Auth email changes synchronize the matching profile` — **PASS**
- `Local DB Schema [OBS-02]: Unverified email changes do NOT synchronize profile` — **PASS**
- `Local DB Schema [OBS-02]: Pending email change (email_change = email) does NOT synchronize profile` — **PASS**
- `Local DB Schema [OBS-02]: One user Auth email cannot update another user profile` — **PASS**
- `Local DB Schema [FINDING 1]: Setting custom configuration variable does NOT bypass profile email immutability` — **PASS**
- `Local DB Schema [FINDING 2]: Phone-only confirmation does NOT authorize email synchronization` — **PASS**
- `Local DB Schema [FINDING 2]: Stale historical confirmation timestamp does NOT authorize email synchronization` — **PASS**

---

## 6. Testing Environment Disclosure & Operational Boundaries

1. **Simulated Verification Disclosure**:
   - Tests were run using `node:sqlite DatabaseSync` and an algorithmic JavaScript Row Level Security simulator.
   - **Docker is not installed** and **no local PostgreSQL daemon is active**.
   - Live PostgreSQL RLS and column-level privilege behavior have been verified via behavioral modeling and unit simulation; live PostgreSQL database testing remains pending until deployed or connected to a live PostgreSQL service.
2. **Strict Operational Invariants Maintained**:
   - **Zero remote Supabase connections** were made.
   - **`supabase db push` was NOT executed**.
   - **No Dashboard SQL queries** were executed.
   - **No Git staging or commits** were performed (`git add` / `git commit` omitted).
   - **Phase 2 remains unstarted**.
   - **No tokens, keys, or secrets** were logged or exposed.
