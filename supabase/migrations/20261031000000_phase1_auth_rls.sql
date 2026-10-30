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
