-- ==============================================================================
-- EstatePilot AI — Phase 1 Production Authentication, Invitations & RLS Hardening
-- Migration Version: 20261031000000
-- ==============================================================================

-- 1. SECURE AUTH HELPER FUNCTIONS WITH FIXED SEARCH_PATH
-- Provides a clean helper that uses Supabase auth.uid() when available, with fallback
CREATE OR REPLACE FUNCTION public.current_auth_user_id()
RETURNS UUID AS $$
BEGIN
    -- Check if auth schema and uid() function exist (Supabase runtime)
    RETURN COALESCE(
        NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID,
        auth.uid()
    );
EXCEPTION WHEN OTHERS THEN
    BEGIN
        RETURN NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
    EXCEPTION WHEN OTHERS THEN
        RETURN NULL;
    END;
END;
$$ LANGUAGE plpgsql STABLE
SET search_path = public, pg_temp;

-- 2. HARDEN EXISTING SECURITY DEFINER FUNCTIONS WITH EXPLICIT SEARCH_PATH
CREATE OR REPLACE FUNCTION public.current_user_org_ids() 
RETURNS SETOF UUID AS $$
    SELECT organization_id 
    FROM public.memberships 
    WHERE profile_id = public.current_auth_user_id() 
      AND status = 'active'
      AND deleted_at IS NULL;
$$ LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_org_member(target_org_id UUID) 
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.memberships 
        WHERE profile_id = public.current_auth_user_id() 
          AND organization_id = target_org_id 
          AND status = 'active'
          AND deleted_at IS NULL
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_super_admin() 
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE id = public.current_auth_user_id() 
          AND is_platform_admin = TRUE 
          AND deleted_at IS NULL
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.has_permission(target_org_id UUID, required_perm_key TEXT) 
RETURNS BOOLEAN AS $$
    SELECT public.is_super_admin() OR EXISTS (
        SELECT 1 
        FROM public.memberships m
        JOIN public.role_permissions rp ON rp.role_id = m.role_id
        JOIN public.permissions p ON p.id = rp.permission_id
        WHERE m.profile_id = public.current_auth_user_id()
          AND m.organization_id = target_org_id
          AND m.status = 'active'
          AND m.deleted_at IS NULL
          AND p.key = required_perm_key
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

-- Revoke default public execution privileges on sensitive functions
REVOKE EXECUTE ON FUNCTION public.current_user_org_ids() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_org_member(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_permission(UUID, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.current_user_org_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(UUID, TEXT) TO authenticated;

-- 3. ORGANIZATION INVITATIONS SCHEMA
CREATE TABLE IF NOT EXISTS public.organization_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    email CITEXT NOT NULL,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    token_hash TEXT NOT NULL UNIQUE,
    invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'revoked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_organization_invitations_updated_at
BEFORE UPDATE ON public.organization_invitations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Prevent multiple simultaneous pending invitations for the same email within an organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_invitation 
ON public.organization_invitations (organization_id, email) 
WHERE status = 'pending';

-- Index for fast token hash lookups
CREATE INDEX IF NOT EXISTS idx_invitations_token_hash 
ON public.organization_invitations (token_hash);

-- Index for tenant invitations listing
CREATE INDEX IF NOT EXISTS idx_invitations_org_status 
ON public.organization_invitations (organization_id, status);

-- 4. ATOMIC ORGANIZATION CREATION STORED PROCEDURE
CREATE OR REPLACE FUNCTION public.create_organization_with_owner(
    p_name TEXT,
    p_slug CITEXT,
    p_org_type org_type,
    p_currency TEXT DEFAULT 'USD',
    p_timezone TEXT DEFAULT 'UTC',
    p_profile_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_owner_role_id UUID;
    v_membership_id UUID;
BEGIN
    -- Resolve calling user
    v_user_id := COALESCE(p_profile_id, public.current_auth_user_id());
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required: Unable to determine calling user ID.';
    END IF;

    -- Verify profile exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
        RAISE EXCEPTION 'Profile does not exist for user ID: %', v_user_id;
    END IF;

    -- Validate slug format (alphanumeric and hyphens only, 2-60 chars)
    IF p_slug !~ '^[a-z0-9-]+$' OR length(p_slug) < 2 OR length(p_slug) > 60 THEN
        RAISE EXCEPTION 'Invalid slug format: %', p_slug;
    END IF;

    -- Check slug uniqueness
    IF EXISTS (SELECT 1 FROM public.organizations WHERE slug = p_slug) THEN
        RAISE EXCEPTION 'Organization with slug "%" already exists.', p_slug;
    END IF;

    -- Fetch org_owner role
    SELECT id INTO v_owner_role_id FROM public.roles WHERE code = 'org_owner';
    IF v_owner_role_id IS NULL THEN
        RAISE EXCEPTION 'System role "org_owner" not found.';
    END IF;

    -- 1. Create Organization
    INSERT INTO public.organizations (
        name,
        slug,
        org_type,
        default_currency,
        default_timezone
    ) VALUES (
        p_name,
        p_slug,
        p_org_type,
        p_currency,
        p_timezone
    ) RETURNING id INTO v_org_id;

    -- 2. Create Owner Membership (set is_default if user has no other memberships)
    INSERT INTO public.memberships (
        organization_id,
        profile_id,
        role_id,
        status,
        is_default
    ) VALUES (
        v_org_id,
        v_user_id,
        v_owner_role_id,
        'active',
        NOT EXISTS (
            SELECT 1 FROM public.memberships 
            WHERE profile_id = v_user_id AND status = 'active'
        )
    ) RETURNING id INTO v_membership_id;

    -- 3. Log Immutable Audit Record
    INSERT INTO public.audit_logs (
        organization_id,
        profile_id,
        action,
        entity_type,
        entity_id,
        diff
    ) VALUES (
        v_org_id,
        v_user_id,
        'organization.created',
        'organization',
        v_org_id,
        jsonb_build_object(
            'name', p_name,
            'slug', p_slug,
            'org_type', p_org_type,
            'owner_membership_id', v_membership_id
        )
    );

    RETURN jsonb_build_object(
        'organization_id', v_org_id,
        'membership_id', v_membership_id,
        'slug', p_slug,
        'name', p_name,
        'org_type', p_org_type
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.create_organization_with_owner(TEXT, CITEXT, org_type, TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_organization_with_owner(TEXT, CITEXT, org_type, TEXT, TEXT, UUID) TO authenticated;

-- 5. MEMBERSHIP PRIVILEGE ESCALATION PREVENTION TRIGGER
CREATE OR REPLACE FUNCTION public.check_membership_escalation()
RETURNS TRIGGER AS $$
DECLARE
    v_caller_id UUID;
    v_is_admin BOOLEAN;
    v_caller_role_code TEXT;
    v_owner_count INT;
BEGIN
    v_caller_id := public.current_auth_user_id();

    -- Allow platform super-admin to perform any membership change
    IF public.is_super_admin() THEN
        RETURN NEW;
    END IF;

    -- If trigger is fired from internal server functions or create_organization_with_owner
    IF v_caller_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- 1. Prevent a user from modifying their own role or status
    IF TG_OP = 'UPDATE' AND OLD.profile_id = v_caller_id THEN
        IF NEW.role_id <> OLD.role_id THEN
            RAISE EXCEPTION 'PrivilegeEscalationError: Users cannot modify their own role.';
        END IF;
        IF NEW.status <> OLD.status AND NEW.status = 'active' AND OLD.status = 'suspended' THEN
            RAISE EXCEPTION 'PrivilegeEscalationError: Suspended users cannot reactivate themselves.';
        END IF;
    END IF;

    -- 2. Prevent removing the last org_owner of an organization
    IF (TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND (NEW.status != 'active' OR NEW.role_id != OLD.role_id))) THEN
        SELECT r.code INTO v_caller_role_code 
        FROM public.roles r 
        WHERE r.id = OLD.role_id;

        IF v_caller_role_code = 'org_owner' THEN
            SELECT COUNT(*) INTO v_owner_count
            FROM public.memberships m
            JOIN public.roles r ON r.id = m.role_id
            WHERE m.organization_id = OLD.organization_id
              AND m.status = 'active'
              AND r.code = 'org_owner'
              AND m.id != OLD.id;

            IF v_owner_count < 1 THEN
                RAISE EXCEPTION 'Cannot remove or demote the last remaining Organization Owner.';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_prevent_membership_escalation ON public.memberships;
CREATE TRIGGER trg_prevent_membership_escalation
BEFORE UPDATE OR DELETE ON public.memberships
FOR EACH ROW EXECUTE FUNCTION public.check_membership_escalation();

-- 6. HARDEN ROW-LEVEL SECURITY (RLS) POLICIES

-- 6.1 Organization Invitations RLS
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view invitations for their organization" ON public.organization_invitations;
CREATE POLICY "Admins can view invitations for their organization"
ON public.organization_invitations FOR SELECT
USING (
    public.has_permission(organization_id, 'org:members:read') OR
    public.is_super_admin()
);

DROP POLICY IF EXISTS "Admins can manage invitations for their organization" ON public.organization_invitations;
CREATE POLICY "Admins can manage invitations for their organization"
ON public.organization_invitations FOR ALL
USING (
    public.has_permission(organization_id, 'org:members:write') OR
    public.is_super_admin()
);

-- 6.2 Hardened Non-Recursive Memberships RLS
DROP POLICY IF EXISTS "Users can view memberships in their organizations" ON public.memberships;
DROP POLICY IF EXISTS "Admins can manage memberships in their organization" ON public.memberships;

-- Split into granular SELECT, INSERT, UPDATE, DELETE policies to prevent recursion
CREATE POLICY "Memberships view policy"
ON public.memberships FOR SELECT
USING (
    profile_id = public.current_auth_user_id() OR
    organization_id IN (SELECT public.current_user_org_ids()) OR
    public.is_super_admin()
);

CREATE POLICY "Memberships insert policy"
ON public.memberships FOR INSERT
WITH CHECK (
    public.has_permission(organization_id, 'org:members:write') OR
    public.is_super_admin()
);

CREATE POLICY "Memberships update policy"
ON public.memberships FOR UPDATE
USING (
    public.has_permission(organization_id, 'org:members:write') OR
    public.is_super_admin()
)
WITH CHECK (
    public.has_permission(organization_id, 'org:members:write') OR
    public.is_super_admin()
);

CREATE POLICY "Memberships delete policy"
ON public.memberships FOR DELETE
USING (
    public.has_permission(organization_id, 'org:members:write') OR
    public.is_super_admin()
);

-- 6.3 Database-Level Column Protection & Hardened Profiles RLS (FINDING 1, 2, 3, 4)

-- Table-level vs Column-level UPDATE privilege separation (FINDING 3):
-- Revoke table-level UPDATE from PUBLIC, anon, and authenticated so authenticated users
-- cannot directly UPDATE public.profiles.email under any circumstances.
REVOKE UPDATE ON public.profiles FROM PUBLIC;
REVOKE UPDATE ON public.profiles FROM anon;
REVOKE UPDATE ON public.profiles FROM authenticated;

-- Grant column-level UPDATE on legitimate editable profile columns only
GRANT UPDATE (
    first_name,
    last_name,
    phone,
    avatar_url,
    time_zone,
    locale,
    updated_at
) ON public.profiles TO authenticated;

-- Ensure service_role and postgres retain administrative privileges
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.profiles TO postgres;

-- Maintain SELECT and INSERT permissions
GRANT SELECT ON public.profiles TO authenticated, anon;
GRANT INSERT (
    id,
    email,
    first_name,
    last_name,
    phone,
    avatar_url,
    time_zone,
    locale,
    is_platform_admin
) ON public.profiles TO authenticated;

-- Allow authenticated users to insert their own profile during registration, strictly blocking self-grant of platform admin
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles update policy" ON public.profiles;
CREATE POLICY "Profiles update policy"
ON public.profiles FOR UPDATE
USING (
    id = public.current_auth_user_id() OR
    public.is_super_admin()
)
WITH CHECK (
    (id = public.current_auth_user_id() AND is_platform_admin = FALSE) OR
    public.is_super_admin()
);

DROP POLICY IF EXISTS "Profiles insert policy" ON public.profiles;
CREATE POLICY "Profiles insert policy"
ON public.profiles FOR INSERT
WITH CHECK (
    (id = public.current_auth_user_id() AND is_platform_admin = FALSE) OR
    public.is_super_admin()
);

-- Defense-in-depth trigger on public.profiles: Fail-closed verification (FINDING 1, 2, 4)
-- Does NOT rely on pg_trigger_depth() or custom GUC variables.
CREATE OR REPLACE FUNCTION public.check_profile_email_immutability()
RETURNS TRIGGER AS $$
DECLARE
    v_auth_email TEXT;
    v_email_confirmed_at TIMESTAMPTZ;
    v_email_change TEXT;
BEGIN
    IF NEW.email <> OLD.email THEN
        -- Allow platform super-admin direct administrative override
        IF public.is_super_admin() THEN
            RETURN NEW;
        END IF;

        -- Verify strictly against auth.users state
        BEGIN
            SELECT email, email_confirmed_at, email_change
            INTO v_auth_email, v_email_confirmed_at, v_email_change
            FROM auth.users
            WHERE id = NEW.id;
        EXCEPTION WHEN OTHERS THEN
            -- FINDING 2: Fail closed. Never allow an unverified email update on exception.
            v_auth_email := NULL;
            v_email_confirmed_at := NULL;
        END;

        -- Must match confirmed, non-pending email in auth.users
        IF v_auth_email IS NOT NULL 
           AND lower(v_auth_email) = lower(NEW.email)
           AND v_email_confirmed_at IS NOT NULL
           AND (v_email_change IS NULL OR v_email_change = '' OR lower(v_email_change) <> lower(NEW.email)) THEN
            RETURN NEW;
        END IF;

        -- All unauthorized or unverified updates are strictly blocked (Fail-Closed)
        RAISE EXCEPTION 'ImmutableEmailError: Profile email cannot be modified directly. Email changes must proceed via auth email verification.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_prevent_profile_email_update ON public.profiles;
CREATE TRIGGER trg_prevent_profile_email_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.check_profile_email_immutability();

-- Automated trigger provisioning profile when Supabase auth.users row is inserted
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        first_name,
        last_name,
        avatar_url,
        time_zone,
        locale,
        is_platform_admin
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        NEW.raw_user_meta_data->>'avatar_url',
        COALESCE(NEW.raw_user_meta_data->>'time_zone', 'UTC'),
        COALESCE(NEW.raw_user_meta_data->>'locale', 'en-US'),
        FALSE
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- OBS-02: Synchronize verified email changes from Supabase auth.users to public.profiles
-- Implements email-specific confirmation and lifecycle verification without relying on user-forgeable GUCs
CREATE OR REPLACE FUNCTION public.handle_auth_user_email_updated()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Ensure email is provided and actually changed
    IF NEW.email IS NULL OR (OLD.email IS NOT NULL AND NEW.email = OLD.email) THEN
        RETURN NEW;
    END IF;

    -- 2. Email-specific confirmation check (FINDING 2)
    -- Must have non-null email_confirmed_at. Generic confirmed_at is intentionally excluded
    -- because phone confirmation sets confirmed_at without email verification.
    IF NEW.email_confirmed_at IS NULL THEN
        RETURN NEW;
    END IF;

    -- 3. Verify email change lifecycle (FINDING 2)
    -- If an email change is pending (email_change holds the target email), it is not yet confirmed.
    IF NEW.email_change IS NOT NULL AND NEW.email_change <> '' AND lower(NEW.email_change) = lower(NEW.email) THEN
        RETURN NEW;
    END IF;

    -- 4. Verify fresh confirmation for email state transition
    -- If OLD.email was previously set with confirmation, the confirmation timestamp must be
    -- updated/advanced to prove that this newly changed email address was actually verified,
    -- preventing stale historical timestamps from authorizing unverified changes.
    IF OLD.email IS NOT NULL AND OLD.email_confirmed_at IS NOT NULL THEN
        IF NEW.email_confirmed_at <= OLD.email_confirmed_at THEN
            RETURN NEW;
        END IF;
    END IF;

    -- 5. Strictly bind update to matching profile ID
    UPDATE public.profiles
    SET email = NEW.email,
        updated_at = NOW()
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.handle_auth_user_email_updated() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_auth_user_email_updated() FROM anon, authenticated;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
        CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

        DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
        CREATE TRIGGER on_auth_user_email_updated
        AFTER UPDATE OF email, email_confirmed_at ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_email_updated();
    END IF;
END $$;

-- 7. SECURE INVITATION TOKEN LOOKUP & ATOMIC ACCEPTANCE RPCs

-- 7.1 Email Masking Helper (SEC-07 & OBS-01)
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
$$ LANGUAGE plpgsql IMMUTABLE
SET search_path = public, pg_temp;

-- OBS-01: Revoke direct execution from PUBLIC, anon, and authenticated.
-- This helper is internal only and invoked via SECURITY DEFINER procedures (e.g. get_invitation_by_token).
REVOKE EXECUTE ON FUNCTION public.mask_email(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mask_email(TEXT) FROM anon, authenticated;

-- 7.2 Secure Token Metadata Lookup (SEC-05: Read-only STABLE, SEC-07: Privacy Masking)
-- Returns minimum public metadata without exposing token hashes, passwords, or internal tenant rosters
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
        i.id,
        i.organization_id,
        o.name AS organization_name,
        o.slug AS organization_slug,
        i.email,
        r.name AS role_name,
        r.code AS role_code,
        i.expires_at,
        i.status
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

    -- SEC-07: Mask email for anonymous lookup unless caller is authenticated and matches invitation email
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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.get_invitation_by_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(TEXT) TO anon, authenticated;

-- 7.3 Atomic Invitation Acceptance Stored Procedure (SEC-03: No Profile Impersonation, SEC-04: Trusted Email)
CREATE OR REPLACE FUNCTION public.accept_invitation_atomic(p_token_hash TEXT)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_user_email CITEXT;
    v_invitation RECORD;
    v_membership_id UUID;
    v_is_default BOOLEAN;
BEGIN
    -- SEC-03: Caller must be signed in. Profile ID is derived STRICTLY from authenticated session.
    v_user_id := public.current_auth_user_id();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'AuthenticationRequired: User must be signed in to accept an invitation.';
    END IF;

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
        RAISE EXCEPTION 'InvitationExpired: Invitation has expired.';
    END IF;

    -- Case-insensitive trusted email match check
    IF lower(v_invitation.email::TEXT) != lower(v_user_email::TEXT) THEN
        RAISE EXCEPTION 'EmailMismatch: Invitation was issued to "%" but caller is "%".', 
            v_invitation.email, v_user_email;
    END IF;

    -- Check if user is already a member of this organization
    SELECT id INTO v_membership_id
    FROM public.memberships
    WHERE organization_id = v_invitation.organization_id
      AND profile_id = v_user_id;

    IF v_membership_id IS NOT NULL THEN
        -- Reactivate if previously invited/suspended
        UPDATE public.memberships
        SET status = 'active', 
            role_id = v_invitation.role_id, 
            branch_id = COALESCE(v_invitation.branch_id, branch_id), 
            updated_at = NOW()
        WHERE id = v_membership_id;
    ELSE
        -- Default organization logic
        SELECT NOT EXISTS (
            SELECT 1 FROM public.memberships 
            WHERE profile_id = v_user_id AND status = 'active'
        ) INTO v_is_default;

        INSERT INTO public.memberships (
            organization_id,
            profile_id,
            role_id,
            branch_id,
            status,
            is_default
        ) VALUES (
            v_invitation.organization_id,
            v_user_id,
            v_invitation.role_id,
            v_invitation.branch_id,
            'active',
            v_is_default
        ) RETURNING id INTO v_membership_id;
    END IF;

    -- Transition invitation status to accepted
    UPDATE public.organization_invitations
    SET status = 'accepted', 
        accepted_at = NOW(), 
        updated_at = NOW()
    WHERE id = v_invitation.id;

    -- Log immutable audit event
    INSERT INTO public.audit_logs (
        organization_id,
        profile_id,
        action,
        entity_type,
        entity_id,
        diff
    ) VALUES (
        v_invitation.organization_id,
        v_user_id,
        'invitation.accepted',
        'membership',
        v_membership_id,
        jsonb_build_object(
            'invitation_id', v_invitation.id,
            'role_id', v_invitation.role_id,
            'email', v_invitation.email
        )
    );

    RETURN jsonb_build_object(
        'membership_id', v_membership_id,
        'organization_id', v_invitation.organization_id,
        'status', 'accepted'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.accept_invitation_atomic(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_invitation_atomic(TEXT) TO authenticated;
