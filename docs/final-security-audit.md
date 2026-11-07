# EstatePilot AI — Final Independent Pre-Deployment Security Audit

**Audit Date**: October 30, 2026  
**Auditor**: Principal SaaS Security Architect & Lead Database Auditor  
**Audit Scope**: Phase 0 Foundation & Phase 1 Production Auth, RBAC, Invitations & RLS  
**Deployment Target**: `mqclumntvjlhjzvhkydp` (`https://mqclumntvjlhjzvhkydp.supabase.co`)  
**Deployment Authorization Status**: Pre-Deployment Audit ONLY — Remote Deployment NOT Authorized  

---

## Executive Summary & Deployment Readiness Decision

### **VERDICT: NOT READY (BLOCKING FINDINGS IDENTIFIED)**

While the core multi-tenant architecture and helper functions are well-structured, a rigorous independent line-by-line security review revealed **2 Critical and 3 High-Severity vulnerabilities** in the SQL migrations that must be resolved prior to any remote deployment:
1. **Critical**: Tenant-owned junction table `public.team_members` lacks Row Level Security (RLS), permitting cross-tenant tampering and self-elevation to `is_team_lead`.
2. **Critical**: Catalog and system configuration tables (`roles`, `permissions`, `role_permissions`, `system_settings`) lack RLS, exposing RBAC mappings and platform configurations to arbitrary client manipulation.
3. **High**: `accept_invitation_atomic` allows profile ID impersonation via an unvalidated `p_profile_id` parameter.
4. **High**: `public.profiles.email` is mutable under standard client UPDATE policies, allowing an attacker to change their profile email to spoof invitation acceptance.
5. **High**: `get_invitation_by_token` is declared `STABLE` but executes a state-modifying `UPDATE`, which triggers a fatal PostgreSQL runtime transaction abort.

All findings can be corrected cleanly in local migration files before applying to Supabase.

---

## 1. Prioritized Vulnerability Register

| ID | Severity | Category | Target Object | Impact Summary |
|:---|:---:|:---|:---|:---|
| **SEC-01** | **CRITICAL** | Tenant Isolation | Table: `public.team_members` | RLS is disabled; allows cross-tenant read/write and unauthorized team lead self-promotion. |
| **SEC-02** | **CRITICAL** | RBAC Integrity | Tables: `public.roles`, `permissions`, `role_permissions`, `system_settings` | RLS is disabled; authenticated clients can tamper with RBAC mappings and platform settings. |
| **SEC-03** | **HIGH** | Authorization Bypass | Function: `accept_invitation_atomic()` | `p_profile_id` parameter is unverified against caller identity, allowing profile impersonation. |
| **SEC-04** | **HIGH** | Email Spoofing | Table: `public.profiles` / Function: `accept_invitation_atomic()` | Profiles `UPDATE` policy allows changing `email`, enabling invitation hijacking. |
| **SEC-05** | **HIGH** | Runtime Crash / Side-Effect | Function: `get_invitation_by_token()` | Declared `STABLE` while executing an `UPDATE`; triggers PostgreSQL error and violates read idempotency. |
| **SEC-06** | **MEDIUM** | Migration Portability | Function: `auth.uid()` in Phase 0 | Unconditional `CREATE OR REPLACE FUNCTION auth.uid()` can fail due to owner permissions in hosted Supabase. |
| **SEC-07** | **LOW** | Privacy / Enumeration | Function: `get_invitation_by_token()` | Full email address is returned to unauthenticated callers holding a token. |

---

## 2. Detailed Technical Audit & Findings

### Finding SEC-01 [CRITICAL]: Missing Row Level Security on `public.team_members`
- **File**: [`supabase/migrations/20261030000000_phase0_foundation.sql`](file:///c:/Users/Anuraj/OneDrive/Desktop/SAAS%20Product/supabase/migrations/20261030000000_phase0_foundation.sql#L206-L212)
- **Vulnerability Description**:
  The `public.team_members` table is defined as:
  ```sql
  CREATE TABLE IF NOT EXISTS public.team_members (
      team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
      membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
      is_team_lead BOOLEAN NOT NULL DEFAULT FALSE,
      PRIMARY KEY (team_id, membership_id)
  );
  ```
  `ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;` is completely omitted.
- **Exploitation Scenario**:
  Because PostgREST grants default table access to the `authenticated` role, any logged-in user from Organization A can insert records into `public.team_members` belonging to Organization B, or elevate any member to `is_team_lead = TRUE`.
- **Proposed Correction**:
  ```sql
  ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Team members view policy"
  ON public.team_members FOR SELECT
  USING (
      team_id IN (
          SELECT id FROM public.teams 
          WHERE organization_id IN (SELECT public.current_user_org_ids())
      ) OR
      public.is_super_admin()
  );

  CREATE POLICY "Team members manage policy"
  ON public.team_members FOR ALL
  USING (
      team_id IN (
          SELECT id FROM public.teams 
          WHERE public.has_permission(organization_id, 'org:teams:write')
      ) OR
      public.is_super_admin()
  );
  ```

---

### Finding SEC-02 [CRITICAL]: Missing RLS on System Catalog & Configuration Tables
- **File**: [`supabase/migrations/20261030000000_phase0_foundation.sql`](file:///c:/Users/Anuraj/OneDrive/Desktop/SAAS%20Product/supabase/migrations/20261030000000_phase0_foundation.sql#L124-L148)
- **Vulnerability Description**:
  Tables `public.roles`, `public.permissions`, `public.role_permissions`, and `public.system_settings` lack `ENABLE ROW LEVEL SECURITY;`.
- **Exploitation Scenario**:
  An authenticated agent can issue `POST /rest/v1/role_permissions` to add `billing:manage` or `audit:read` to the `agent` role code, escalating privileges across the entire application. Similarly, `system_settings` can be altered or overwritten.
- **Proposed Correction**:
  ```sql
  -- Enable RLS
  ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

  -- Read-only policies for authenticated users
  CREATE POLICY "Roles read policy" ON public.roles FOR SELECT TO authenticated USING (true);
  CREATE POLICY "Permissions read policy" ON public.permissions FOR SELECT TO authenticated USING (true);
  CREATE POLICY "Role permissions read policy" ON public.role_permissions FOR SELECT TO authenticated USING (true);

  -- Admin-only policy for system settings
  CREATE POLICY "System settings admin policy" ON public.system_settings FOR ALL
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
  ```

---

### Finding SEC-03 [HIGH]: Caller Profile Impersonation in `accept_invitation_atomic`
- **File**: [`supabase/migrations/20261031000000_phase1_auth_rls.sql`](file:///c:/Users/Anuraj/OneDrive/Desktop/SAAS%20Product/supabase/migrations/20261031000000_phase1_auth_rls.sql#L485-L492)
- **Vulnerability Description**:
  The function defines:
  ```sql
  CREATE OR REPLACE FUNCTION public.accept_invitation_atomic(
      p_token_hash TEXT,
      p_profile_id UUID DEFAULT NULL
  )
  ...
  v_user_id := COALESCE(p_profile_id, public.current_auth_user_id());
  ```
  The function does not assert that `p_profile_id` matches `public.current_auth_user_id()`.
- **Exploitation Scenario**:
  User A (authenticated) calls `accept_invitation_atomic` passing `p_profile_id => 'uuid_of_user_b'`. If an invitation was issued to User B's email, the query matches User B's email on profile lookup, accepts the invite, and associates User B into the organization without User B's action.
- **Proposed Correction**:
  Enforce that `p_profile_id` must match `public.current_auth_user_id()` unless the caller is platform super-admin:
  ```sql
  v_user_id := public.current_auth_user_id();
  IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'AuthenticationRequired: User must be signed in.';
  END IF;

  IF p_profile_id IS NOT NULL AND p_profile_id <> v_user_id AND NOT public.is_super_admin() THEN
      RAISE EXCEPTION 'AccessDenied: Cannot accept invitations on behalf of another user.';
  END IF;
  ```

---

### Finding SEC-04 [HIGH]: Email Spoofing Risk via Mutable `public.profiles.email`
- **File**: [`supabase/migrations/20261031000000_phase1_auth_rls.sql`](file:///c:/Users/Anuraj/OneDrive/Desktop/SAAS%20Product/supabase/migrations/20261031000000_phase1_auth_rls.sql#L359-L373)
- **Vulnerability Description**:
  The `Profiles update policy` enforces:
  `WITH CHECK ((id = public.current_auth_user_id() AND is_platform_admin = FALSE) OR public.is_super_admin())`
  While this protects `is_platform_admin`, it places **zero constraint on modifying the `email` column**.
  In `accept_invitation_atomic`, the recipient email verification checks:
  `SELECT email INTO v_user_email FROM public.profiles WHERE id = v_user_id;`
- **Exploitation Scenario**:
  Attacker registers with `attacker@evil.com`. They discover or obtain a valid invitation token sent to `target_exec@brokerage.com`. The attacker calls:
  `UPDATE profiles SET email = 'target_exec@brokerage.com' WHERE id = auth.uid();`
  The update succeeds. They then call `accept_invitation_atomic(p_token_hash)`. The email verification check passes, granting the attacker full membership.
- **Proposed Correction**:
  1. Add an immutable column check on `public.profiles.email` preventing regular users from altering their email directly (email changes must occur via Supabase Auth email change flow).
  2. In `accept_invitation_atomic`, prioritize matching against the cryptographically signed JWT email claim:
  ```sql
  v_user_email := COALESCE(
      NULLIF(current_setting('request.jwt.claim.email', true), '')::CITEXT,
      (SELECT email FROM public.profiles WHERE id = v_user_id)
  );
  ```

---

### Finding SEC-05 [HIGH]: State Mutation in `STABLE` Function `get_invitation_by_token`
- **File**: [`supabase/migrations/20261031000000_phase1_auth_rls.sql`](file:///c:/Users/Anuraj/OneDrive/Desktop/SAAS%20Product/supabase/migrations/20261031000000_phase1_auth_rls.sql#L430-L472)
- **Vulnerability Description**:
  The function header specifies:
  ```sql
  CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token_hash TEXT)
  RETURNS JSONB AS $$
  ...
  $$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
  ```
  Inside the function:
  ```sql
  IF v_invitation.expires_at < NOW() THEN
      UPDATE public.organization_invitations 
      SET status = 'expired', updated_at = NOW() 
      WHERE id = v_invitation.id;
  ```
- **Exploitation / Operational Impact**:
  In PostgreSQL, calling `UPDATE` inside a function marked `STABLE` triggers a hard transaction abort at runtime:
  `ERROR: cannot execute UPDATE in a read-only transaction (or function)`.
  Any invitee querying an expired invite will receive a 500 server crash rather than an informative response. Furthermore, read RPCs must be strictly idempotent.
- **Proposed Correction**:
  Remove the `UPDATE` statement from `get_invitation_by_token`. Simply return `{ "status": "expired", "message": "Invitation has expired." }`. The database status change will occur atomically during acceptance or through an automated maintenance schedule.

---

### Finding SEC-06 [MEDIUM]: Unconditional `CREATE OR REPLACE FUNCTION auth.uid()`
- **File**: [`supabase/migrations/20261030000000_phase0_foundation.sql`](file:///c:/Users/Anuraj/OneDrive/Desktop/SAAS%20Product/supabase/migrations/20261030000000_phase0_foundation.sql#L249-L256)
- **Vulnerability Description**:
  Lines 249–256 attempt to create or replace `auth.uid()`.
- **Impact**:
  In hosted Supabase, `auth.uid()` already exists and is owned by `supabase_admin`. A migration executing under the `postgres` role may fail with:
  `ERROR: must be owner of function uid`.
- **Proposed Correction**:
  Wrap the declaration in an existence check:
  ```sql
  DO $$ BEGIN
      IF NOT EXISTS (
          SELECT 1 FROM pg_proc p 
          JOIN pg_namespace n ON n.oid = p.pronamespace 
          WHERE n.nspname = 'auth' AND p.proname = 'uid'
      ) THEN
          CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS ...
      END IF;
  END $$;
  ```

---

### Finding SEC-07 [LOW]: Email Exposure in Public Invitation Lookup
- **File**: [`supabase/migrations/20261031000000_phase1_auth_rls.sql`](file:///c:/Users/Anuraj/OneDrive/Desktop/SAAS%20Product/supabase/migrations/20261031000000_phase1_auth_rls.sql#L462)
- **Vulnerability Description**:
  `get_invitation_by_token` returns the plaintext email address to any caller with the raw token.
- **Proposed Correction**:
  Mask the email (e.g. `a***e@example.com`) if the caller's session does not match the invitation email.

---

## 3. Testing Environment Honesty Statement

In strict adherence to engineering integrity standards:

1. **Local Test Nature**:
   - The 61 automated tests pass in our local test suite ([tests/integration/postgresql-rls.test.js](file:///c:/Users/Anuraj/OneDrive/Desktop/SAAS%20Product/tests/integration/postgresql-rls.test.js), [tests/integration/local-database-verification.test.js](file:///c:/Users/Anuraj/OneDrive/Desktop/SAAS%20Product/tests/integration/local-database-verification.test.js), [tests/unit/invitation-lifecycle.test.js](file:///c:/Users/Anuraj/OneDrive/Desktop/SAAS%20Product/tests/unit/invitation-lifecycle.test.js)).
   - **Engine Used**: In-memory Node.js v22 SQLite (`node:sqlite DatabaseSync`) and an in-memory JavaScript RLS policy simulator.
2. **Explicit Limitation**:
   - **Docker is NOT installed** on this machine.
   - **Local PostgreSQL service is NOT running** (`psql not found`).
   - Therefore, **actual live PostgreSQL RLS policy execution against an authentic PostgreSQL daemon has NOT yet been performed**.
   - These tests prove structural, logical, and constraint correctness, but do not replace live PostgreSQL execution.

---

## 4. Remediation Plan (Awaiting Authorization)

Before any remote Supabase migration is executed:

1. **Apply SQL Patches Locally**:
   - Add RLS to `team_members`, `roles`, `permissions`, `role_permissions`, `system_settings`.
   - Disallow caller impersonation in `accept_invitation_atomic`.
   - Disallow email updates in `profiles` and verify `request.jwt.claim.email`.
   - Make `get_invitation_by_token` purely read-only (remove `UPDATE`).
   - Guard `auth.uid()` creation.
2. **Re-run Local Test Suite**: Verify 61+ tests pass cleanly.
3. **Report Back to User**: Present patched files for final approval before connecting to Supabase.
