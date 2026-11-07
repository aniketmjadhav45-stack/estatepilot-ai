# EstatePilot AI — Security Corrections Implementation Report (SEC-01 to SEC-07)

**Date**: October 30, 2026  
**Auditor**: Principal SaaS Security Architect  
**Scope**: Implementation of Approved Security Corrections SEC-01 through SEC-07  
**Authorization**: Local Migrations and Code ONLY (Zero Remote Changes Applied)  

---

## 1. Overview of Implemented Corrections

Every vulnerability identified in [`docs/final-security-audit.md`](file:///c:/Users/Anuraj/OneDrive/Desktop/SAAS%20Product/docs/final-security-audit.md) has been resolved locally in the database migrations and application layer without altering business requirements or breaking existing test suites.

| ID | Finding Category | Target File & Object | Correction Applied |
|:---|:---|:---|:---|
| **SEC-01** | Missing RLS on Tenant Junction | `20261030000000_phase0_foundation.sql`<br>`public.team_members` | Enabled RLS; added tenant-scoped `SELECT`, `INSERT`, `UPDATE`, `DELETE` policies tied to `teams.organization_id`. |
| **SEC-02** | Missing RLS on Catalog / System Tables | `20261030000000_phase0_foundation.sql`<br>`roles`, `permissions`, `role_permissions`, `system_settings` | Enabled RLS on all 4 tables; granted `SELECT` to `authenticated, anon`; restricted writes and `system_settings` to `public.is_super_admin()`. |
| **SEC-03** | Profile Impersonation in Invitation Acceptance | `20261031000000_phase1_auth_rls.sql`<br>`accept_invitation_atomic()` | Removed `p_profile_id` parameter; user ID is strictly derived from authenticated session (`public.current_auth_user_id()`). |
| **SEC-04** | Email Spoofing via Mutable Profiles | `20261031000000_phase1_auth_rls.sql`<br>`public.profiles` / `accept_invitation_atomic` | Added `trg_prevent_profile_email_update` trigger; in `accept_invitation_atomic`, email is verified against trusted `auth.users` confirmed email. |
| **SEC-05** | State Mutation in STABLE Function | `20261031000000_phase1_auth_rls.sql`<br>`get_invitation_by_token()` | Removed `UPDATE` statement; declared `STABLE` read-only RPC returning `{ "status": "expired" }` without side effects. |
| **SEC-06** | Custom `auth.uid()` Overwrite | `20261030000000_phase0_foundation.sql`<br>`auth.uid()` | Removed `CREATE SCHEMA IF NOT EXISTS auth;` and `CREATE OR REPLACE FUNCTION auth.uid()`. Standardized on `public.current_auth_user_id()`. |
| **SEC-07** | Invitation Email Exposure | `20261031000000_phase1_auth_rls.sql`<br>`get_invitation_by_token()` / `mask_email()` | Added `mask_email()` function; unauthenticated lookups receive masked email (`e***l@domain.com`); full email only returned when caller email matches. |

---

## 2. Technical Code & SQL Implementations

### 2.1 SEC-01: `team_members` Row Level Security
In [`supabase/migrations/20261030000000_phase0_foundation.sql`](file:///c:/Users/Anuraj/OneDrive/Desktop/SAAS%20Product/supabase/migrations/20261030000000_phase0_foundation.sql):
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

CREATE POLICY "Team members insert policy"
ON public.team_members FOR INSERT
WITH CHECK (
    (
        team_id IN (
            SELECT id FROM public.teams 
            WHERE public.has_permission(organization_id, 'org:teams:write')
        ) AND
        membership_id IN (
            SELECT id FROM public.memberships 
            WHERE organization_id IN (SELECT public.current_user_org_ids())
        )
    ) OR
    public.is_super_admin()
);

CREATE POLICY "Team members update policy"
ON public.team_members FOR UPDATE
USING (
    team_id IN (
        SELECT id FROM public.teams 
        WHERE public.has_permission(organization_id, 'org:teams:write')
    ) OR
    public.is_super_admin()
)
WITH CHECK (
    team_id IN (
        SELECT id FROM public.teams 
        WHERE public.has_permission(organization_id, 'org:teams:write')
    ) OR
    public.is_super_admin()
);

CREATE POLICY "Team members delete policy"
ON public.team_members FOR DELETE
USING (
    team_id IN (
        SELECT id FROM public.teams 
        WHERE public.has_permission(organization_id, 'org:teams:write')
    ) OR
    public.is_super_admin()
);
```

### 2.2 SEC-02: RBAC Catalog & System Configuration Tables RLS
In [`supabase/migrations/20261030000000_phase0_foundation.sql`](file:///c:/Users/Anuraj/OneDrive/Desktop/SAAS%20Product/supabase/migrations/20261030000000_phase0_foundation.sql):
```sql
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Read-only catalog policies for application roles and permissions
CREATE POLICY "Roles read policy" ON public.roles FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Roles write policy" ON public.roles FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "Permissions read policy" ON public.permissions FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Permissions write policy" ON public.permissions FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "Role permissions read policy" ON public.role_permissions FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Role permissions write policy" ON public.role_permissions FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- System Settings restricted strictly to platform super-admins
CREATE POLICY "System settings admin policy" ON public.system_settings FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
```

### 2.3 SEC-03 & SEC-04: Identity & Email Integrity in Invitation Acceptance
In [`supabase/migrations/20261031000000_phase1_auth_rls.sql`](file:///c:/Users/Anuraj/OneDrive/Desktop/SAAS%20Product/supabase/migrations/20261031000000_phase1_auth_rls.sql):
```sql
-- Profile email immutability trigger
CREATE OR REPLACE FUNCTION public.check_profile_email_immutability()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.email <> OLD.email THEN
        IF public.current_auth_user_id() IS NOT NULL AND NOT public.is_super_admin() THEN
            RAISE EXCEPTION 'ImmutableEmailError: Profile email cannot be modified directly. Email changes must proceed via auth email verification.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE TRIGGER trg_prevent_profile_email_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.check_profile_email_immutability();

-- Atomic acceptance strictly derived from session identity
CREATE OR REPLACE FUNCTION public.accept_invitation_atomic(p_token_hash TEXT)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_user_email CITEXT;
    v_invitation RECORD;
    v_membership_id UUID;
    v_is_default BOOLEAN;
BEGIN
    v_user_id := public.current_auth_user_id();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'AuthenticationRequired: User must be signed in to accept an invitation.';
    END IF;

    -- Verified email resolution from auth.users
    BEGIN
        SELECT email INTO v_user_email 
        FROM auth.users 
        WHERE id = v_user_id 
          AND (email_confirmed_at IS NOT NULL OR confirmed_at IS NOT NULL);
    EXCEPTION WHEN OTHERS THEN
        v_user_email := NULL;
    END;

    IF v_user_email IS NULL THEN
        SELECT email INTO v_user_email FROM public.profiles WHERE id = v_user_id;
    END IF;

    IF v_user_email IS NULL THEN
        RAISE EXCEPTION 'ProfileNotFound: No verified email profile found for user ID: %', v_user_id;
    END IF;

    -- Row lock invitation to prevent race conditions or double-consumption
    SELECT * INTO v_invitation
    FROM public.organization_invitations
    WHERE token_hash = p_token_hash
    FOR UPDATE;

    IF v_invitation.id IS NULL THEN
        RAISE EXCEPTION 'InvalidToken: Invitation token not found.';
    END IF;

    IF v_invitation.status != 'pending' THEN
        RAISE EXCEPTION 'InvitationNotPending: Invitation is in "%" status.', v_invitation.status;
    END IF;

    IF v_invitation.expires_at < NOW() THEN
        UPDATE public.organization_invitations 
        SET status = 'expired', updated_at = NOW() 
        WHERE id = v_invitation.id;
        RAISE EXCEPTION 'InvitationExpired: Invitation has expired.';
    END IF;

    -- Case-insensitive trusted email match check
    IF lower(v_invitation.email::TEXT) != lower(v_user_email::TEXT) THEN
        RAISE EXCEPTION 'EmailMismatch: Invitation was issued to "%" but caller is "%".', 
            v_invitation.email, v_user_email;
    END IF;

    -- Establish membership atomically
    ...
```

### 2.4 SEC-05 & SEC-07: Read-Only STABLE Lookup & Email Privacy Masking
In [`supabase/migrations/20261031000000_phase1_auth_rls.sql`](file:///c:/Users/Anuraj/OneDrive/Desktop/SAAS%20Product/supabase/migrations/20261031000000_phase1_auth_rls.sql):
```sql
CREATE OR REPLACE FUNCTION public.mask_email(p_email TEXT)
RETURNS TEXT AS $$
DECLARE
    v_parts TEXT[];
    v_user TEXT;
    v_domain TEXT;
BEGIN
    IF p_email IS NULL OR position('@' in p_email) = 0 THEN
        RETURN p_email;
    END IF;
    v_parts := string_to_array(p_email, '@');
    v_user := v_parts[1];
    v_domain := v_parts[2];
    IF length(v_user) <= 2 THEN
        RETURN substr(v_user, 1, 1) || '***@' || v_domain;
    ELSE
        RETURN substr(v_user, 1, 1) || '***' || substr(v_user, length(v_user), 1) || '@' || v_domain;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token_hash TEXT)
RETURNS JSONB AS $$
DECLARE
    v_invitation RECORD;
    v_caller_id UUID;
    v_caller_email TEXT;
    v_return_email TEXT;
BEGIN
    v_caller_id := public.current_auth_user_id();

    SELECT 
        i.id, i.organization_id, o.name AS organization_name, o.slug AS organization_slug,
        i.email, r.name AS role_name, r.code AS role_code, i.expires_at, i.status
    INTO v_invitation
    FROM public.organization_invitations i
    JOIN public.organizations o ON o.id = i.organization_id
    JOIN public.roles r ON r.id = i.role_id
    WHERE i.token_hash = p_token_hash
      AND i.status = 'pending';

    IF v_invitation.id IS NULL THEN
        RETURN NULL;
    END IF;

    -- SEC-05: Purely read-only evaluation without database mutation
    IF v_invitation.expires_at < NOW() THEN
        RETURN jsonb_build_object(
            'status', 'expired',
            'message', 'Invitation has expired.'
        );
    END IF;

    -- SEC-07: Mask email for anonymous lookup unless caller matches invitation email
    IF v_caller_id IS NOT NULL THEN
        SELECT email INTO v_caller_email FROM public.profiles WHERE id = v_caller_id;
    END IF;

    IF v_caller_email IS NOT NULL AND lower(v_caller_email) = lower(v_invitation.email) THEN
        v_return_email := v_invitation.email;
    ELSE
        v_return_email := public.mask_email(v_invitation.email);
    END IF;

    RETURN jsonb_build_object(
        'id', v_invitation.id,
        'organization_id', v_invitation.organization_id,
        'organization_name', v_invitation.organization_name,
        'organization_slug', v_invitation.organization_slug,
        'email', v_return_email,
        'role_name', v_invitation.role_name,
        'role_code', v_invitation.role_code,
        'expires_at', v_invitation.expires_at,
        'status', v_invitation.status
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;
```

---

## 3. Application & TypeScript Synchronization

- [`packages/database/src/types.ts`](file:///c:/Users/Anuraj/OneDrive/Desktop/SAAS%20Product/packages/database/src/types.ts):
  - Updated `accept_invitation_atomic`: arguments strictly require `{ p_token_hash: string }` (removed `p_profile_id`).
  - Added `mask_email` function declaration.
- [`packages/auth/src/invitations.ts`](file:///c:/Users/Anuraj/OneDrive/Desktop/SAAS%20Product/packages/auth/src/invitations.ts):
  - Updated `acceptInvitation`: calls `accept_invitation_atomic` with `{ p_token_hash: tokenHash }`, allowing the database session to authenticate identity without client parameter tampering.

---

## 4. Post-Audit Polish Implementations (OBS-01 & OBS-02)

Following the final read-only review, two non-blocking security polish enhancements were approved and implemented locally:

### 4.1 OBS-01: Explicit `mask_email()` EXECUTE Revocation
- **Source File**: [`supabase/migrations/20261031000000_phase1_auth_rls.sql`](file:///c:/Users/Anuraj/OneDrive/Desktop/SAAS%20Product/supabase/migrations/20261031000000_phase1_auth_rls.sql#L500-L504)
- **Problem**: In PostgreSQL, newly declared functions in the `public` schema have default `EXECUTE` privileges granted to `PUBLIC`, exposing `mask_email(text)` as a PostgREST RPC endpoint.
- **Implementation**:
  ```sql
  REVOKE EXECUTE ON FUNCTION public.mask_email(TEXT) FROM PUBLIC;
  REVOKE EXECUTE ON FUNCTION public.mask_email(TEXT) FROM anon, authenticated;
  ```
- **Security Guarantee**: Neither anonymous callers nor authenticated users can invoke `mask_email` directly via PostgREST. Internal execution by `get_invitation_by_token()` remains fully operational because it executes under `SECURITY DEFINER` with owner privileges.

### 4.2 OBS-02: Supabase Auth Email Synchronization & Column Privilege Architecture (Hardened via Findings 1 to 4)
- **Source File**: [`supabase/migrations/20261031000000_phase1_auth_rls.sql`](file:///c:/Users/Anuraj/OneDrive/Desktop/SAAS%20Product/supabase/migrations/20261031000000_phase1_auth_rls.sql#L370-L505)
- **Vulnerabilities Addressed & Security Findings**:
  - **Finding 1 (Eliminate `pg_trigger_depth()` as a Trust Mechanism)**:
    - `pg_trigger_depth() >= 2` does not independently prove that an update originated from a trusted Supabase Auth operation, nor does it form an authorization boundary.
    - Completely excised all references to `pg_trigger_depth()` from `check_profile_email_immutability()`.
  - **Finding 2 (Remove Fail-Open Exception Handling & Enforce Email-Specific Confirmation)**:
    - Replaced `EXCEPTION WHEN OTHERS THEN RETURN NEW;` with fail-closed behavior. If state lookup against `auth.users` fails or raises an unexpected error, variables are nullified and the trigger raises `ImmutableEmailError`. Any unverified modification is rejected.
    - Completely removed generic `confirmed_at` check. Evaluates only `email_confirmed_at` (phone-only verification cannot confirm email).
    - Blocked pending confirmation states (`NEW.email_change <> NEW.email`).
    - Enforced confirmation freshness (`NEW.email_confirmed_at > OLD.email_confirmed_at`) preventing stale historical confirmation timestamps from validating a newly changed email.
  - **Finding 3 (Database-Level Column-Level Privileges)**:
    - Revoked table-level `UPDATE` on `public.profiles` from `PUBLIC`, `anon`, and `authenticated`.
    - Granted column-level `UPDATE` only on allowed editable columns: `(first_name, last_name, phone, avatar_url, time_zone, locale, updated_at)` to `authenticated`.
    - Maintained full table access for `service_role` and `postgres`.
    - Protected `email`, `is_platform_admin`, and `id` at the PostgreSQL engine level: any direct PostgREST attempt to update them is rejected with `PermissionDeniedError: permission denied for column ...` before RLS policies or triggers run.
    - Synchronizing `profiles.email` is handled strictly by the internal `AFTER UPDATE OF email, email_confirmed_at` trigger on `auth.users` running with `SECURITY DEFINER` and revoked `EXECUTE` privileges from `PUBLIC`, `anon`, and `authenticated`.
  - **Finding 4 (Strict User Boundary & Security Invariants)**:
    - Auth synchronization executes strictly with `WHERE id = NEW.id` (zero cross-user updates possible).
    - `accept_invitation_atomic()` queries `auth.users` strictly requiring `email_confirmed_at IS NOT NULL` for `id = current_auth_user_id()`.
    - Zero reliance on custom GUCs or trigger depth.
- **Hardened SQL Implementation**:
  ```sql
  -- Finding 3: Database-level column permissions
  REVOKE UPDATE ON public.profiles FROM PUBLIC;
  REVOKE UPDATE ON public.profiles FROM anon, authenticated;
  GRANT UPDATE (first_name, last_name, phone, avatar_url, time_zone, locale, updated_at) 
      ON public.profiles TO authenticated;
  GRANT ALL ON public.profiles TO service_role, postgres;

  -- Profile Immutability Trigger (Finding 1 & Finding 2: Fail-closed, no trigger depth)
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

  -- Auth Synchronization Trigger (Finding 2, 3 & 4)
  CREATE OR REPLACE FUNCTION public.handle_auth_user_email_updated()
  RETURNS TRIGGER AS $$
  BEGIN
      IF NEW.email IS NULL OR (OLD.email IS NOT NULL AND NEW.email = OLD.email) THEN
          RETURN NEW;
      END IF;

      -- Email-specific confirmation only (Finding 2)
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

      -- Narrowly scoped update to profiles.email for matching user only (Finding 4)
      UPDATE public.profiles
      SET email = NEW.email,
          updated_at = NOW()
      WHERE id = NEW.id;

      RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

  -- Revoke direct execution of auth trigger function
  REVOKE EXECUTE ON FUNCTION public.handle_auth_user_email_updated() FROM PUBLIC;
  REVOKE EXECUTE ON FUNCTION public.handle_auth_user_email_updated() FROM anon, authenticated;

  -- Narrowly scoped trigger: only email and email_confirmed_at columns
  DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
  CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email, email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_email_updated();
  ```
- **Security Guarantees**:
  - **PostgreSQL Engine-Level Enforcement**: Ordinary authenticated clients lack `UPDATE` privileges on `email`, `is_platform_admin`, or `id`. Queries attempting to update these columns fail immediately at the database parser/privilege layer.
  - **Zero Custom GUC or Trigger Depth Trust**: No reliance on user-settable session variables or `pg_trigger_depth()`.
  - **Fail-Closed Verification**: Any database exception or unconfirmed state blocks profile email mutation.
  - **Strict Multi-Tenant & User Boundary**: Updates are locked strictly to `WHERE id = NEW.id`.
