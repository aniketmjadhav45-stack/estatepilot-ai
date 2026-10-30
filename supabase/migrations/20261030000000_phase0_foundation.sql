-- ==============================================================================
-- EstatePilot AI — Phase 0 Database Foundation Migration
-- Description: Core schema, identity, multi-tenancy, RBAC, RLS & seed data
-- Version: 20261030000000
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "citext";

-- Ensure auth schema exists in case of running outside standard Supabase container
CREATE SCHEMA IF NOT EXISTS auth;

-- 2. ENUM TYPES
DO $$ BEGIN
    CREATE TYPE org_type AS ENUM ('individual', 'agency', 'enterprise');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE membership_status AS ENUM ('active', 'invited', 'suspended');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE property_type AS ENUM (
        'apartment', 'condo', 'single_family', 'villa', 'townhouse',
        'commercial', 'land', 'industrial', 'penthouse', 'duplex'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE listing_type AS ENUM ('sale', 'rent', 'lease');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE property_status AS ENUM (
        'draft', 'active', 'pending', 'under_contract', 'sold', 'leased', 'withdrawn'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE lead_status AS ENUM (
        'new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost', 'unqualified'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE lead_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE deal_status AS ENUM ('open', 'won', 'lost', 'abandoned');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE appointment_status AS ENUM (
        'scheduled', 'confirmed', 'completed', 'rescheduled', 'cancelled', 'no_show'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE ai_run_status AS ENUM (
        'queued', 'in_progress', 'completed', 'failed', 'requires_approval', 'cancelled'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. COMMON TRIGGER FUNCTIONS
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. IDENTITY & ORGANIZATIONS

-- 4.1 Profiles (User Details)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email CITEXT NOT NULL UNIQUE,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    time_zone TEXT NOT NULL DEFAULT 'UTC',
    locale TEXT NOT NULL DEFAULT 'en-US',
    is_platform_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4.2 Organizations (Tenants)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug CITEXT NOT NULL UNIQUE,
    org_type org_type NOT NULL DEFAULT 'individual',
    default_currency TEXT NOT NULL DEFAULT 'USD',
    default_timezone TEXT NOT NULL DEFAULT 'UTC',
    logo_url TEXT,
    website TEXT,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TRIGGER trg_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4.3 Roles
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    is_system_role BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.4 Permissions
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    module TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.5 Role Permissions Mapping
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 4.6 Branches
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    address TEXT,
    phone TEXT,
    email CITEXT,
    is_headquarters BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TRIGGER trg_branches_updated_at
BEFORE UPDATE ON public.branches
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4.7 Teams
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TRIGGER trg_teams_updated_at
BEFORE UPDATE ON public.teams
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4.8 Memberships (Associates Profiles with Organizations & Roles)
CREATE TABLE IF NOT EXISTS public.memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id),
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    status membership_status NOT NULL DEFAULT 'active',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(organization_id, profile_id)
);

CREATE TRIGGER trg_memberships_updated_at
BEFORE UPDATE ON public.memberships
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4.9 Team Members
CREATE TABLE IF NOT EXISTS public.team_members (
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
    is_team_lead BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (team_id, membership_id)
);

-- 4.10 Audit Logs (Immutable)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    diff JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Disallow updates and deletes on audit_logs
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit log entries are immutable and cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_log_immutable
BEFORE UPDATE OR DELETE ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();

-- 4.11 System Settings (Platform-wide)
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. RLS SECURITY HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION auth.uid() 
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.current_user_org_ids() 
RETURNS SETOF UUID AS $$
    SELECT organization_id 
    FROM public.memberships 
    WHERE profile_id = auth.uid() 
      AND status = 'active'
      AND deleted_at IS NULL;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_org_member(target_org_id UUID) 
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.memberships 
        WHERE profile_id = auth.uid() 
          AND organization_id = target_org_id 
          AND status = 'active'
          AND deleted_at IS NULL
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_super_admin() 
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE id = auth.uid() 
          AND is_platform_admin = TRUE 
          AND deleted_at IS NULL
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.has_permission(target_org_id UUID, required_perm_key TEXT) 
RETURNS BOOLEAN AS $$
    SELECT public.is_super_admin() OR EXISTS (
        SELECT 1 
        FROM public.memberships m
        JOIN public.role_permissions rp ON rp.role_id = m.role_id
        JOIN public.permissions p ON p.id = rp.permission_id
        WHERE m.profile_id = auth.uid()
          AND m.organization_id = target_org_id
          AND m.status = 'active'
          AND m.deleted_at IS NULL
          AND p.key = required_perm_key
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 6. ROW LEVEL SECURITY (RLS) POLICIES

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile and profiles in their orgs"
ON public.profiles FOR SELECT
USING (
    id = auth.uid() OR
    id IN (
        SELECT profile_id 
        FROM public.memberships 
        WHERE organization_id IN (SELECT public.current_user_org_ids())
    ) OR
    public.is_super_admin()
);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their own organizations"
ON public.organizations FOR SELECT
USING (
    id IN (SELECT public.current_user_org_ids()) OR
    public.is_super_admin()
);

CREATE POLICY "Org owners and admins can update their organization"
ON public.organizations FOR UPDATE
USING (
    public.has_permission(id, 'org:settings:write') OR
    public.is_super_admin()
);

-- Memberships
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view memberships in their organizations"
ON public.memberships FOR SELECT
USING (
    organization_id IN (SELECT public.current_user_org_ids()) OR
    profile_id = auth.uid() OR
    public.is_super_admin()
);

CREATE POLICY "Admins can manage memberships in their organization"
ON public.memberships FOR ALL
USING (
    public.has_permission(organization_id, 'org:members:write') OR
    public.is_super_admin()
);

-- Branches
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view branches in their organization"
ON public.branches FOR SELECT
USING (
    organization_id IN (SELECT public.current_user_org_ids()) OR
    public.is_super_admin()
);

CREATE POLICY "Admins can manage branches in their organization"
ON public.branches FOR ALL
USING (
    public.has_permission(organization_id, 'org:branches:write') OR
    public.is_super_admin()
);

-- Teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view teams in their organization"
ON public.teams FOR SELECT
USING (
    organization_id IN (SELECT public.current_user_org_ids()) OR
    public.is_super_admin()
);

CREATE POLICY "Admins and leads can manage teams in their organization"
ON public.teams FOR ALL
USING (
    public.has_permission(organization_id, 'org:teams:write') OR
    public.is_super_admin()
);

-- Audit Logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs for their organization"
ON public.audit_logs FOR SELECT
USING (
    (organization_id IN (SELECT public.current_user_org_ids()) AND public.has_permission(organization_id, 'audit:read')) OR
    public.is_super_admin()
);

-- 7. SEED DATA

-- 7.1 Seed Roles
INSERT INTO public.roles (code, name, description, is_system_role) VALUES
('super_admin', 'Super Administrator', 'Full platform administrative access', TRUE),
('org_owner', 'Organization Owner', 'Complete control over organization, billing, and settings', TRUE),
('org_admin', 'Organization Administrator', 'Manages users, branches, teams, and general operations', TRUE),
('branch_manager', 'Branch Manager', 'Manages a specific branch, its teams, and branch inventory', TRUE),
('team_lead', 'Team Lead', 'Oversees a team of agents, lead assignment, and pipeline review', TRUE),
('senior_agent', 'Senior Real Estate Agent', 'Experienced agent with full listing, deal, and AI capabilities', TRUE),
('agent', 'Real Estate Agent', 'Standard agent managing assigned leads, listings, and clients', TRUE),
('support_staff', 'Support Staff / Assistant', 'Operational support, scheduling, and read-only viewing', TRUE)
ON CONFLICT (code) DO NOTHING;

-- 7.2 Seed Core Permissions across 28 Modules
INSERT INTO public.permissions (key, name, description, module) VALUES
('org:settings:read', 'View Organization Settings', 'Read company profiles, branding and config', 'organization'),
('org:settings:write', 'Edit Organization Settings', 'Modify company profiles, branding and config', 'organization'),
('org:members:read', 'View Organization Members', 'List team members and invitations', 'organization'),
('org:members:write', 'Manage Organization Members', 'Invite, modify, and remove members', 'organization'),
('org:branches:write', 'Manage Branches', 'Create, update, and manage branch offices', 'organization'),
('org:teams:write', 'Manage Teams', 'Create and modify team structures', 'organization'),
('properties:read', 'View Properties', 'View active and archived property listings', 'properties'),
('properties:write', 'Create & Edit Properties', 'Create and modify property listing details', 'properties'),
('properties:publish', 'Publish Properties', 'Publish listings to portals and public sites', 'properties'),
('properties:delete', 'Delete Properties', 'Archive or delete property listings', 'properties'),
('leads:read', 'View Leads & Contacts', 'View contacts and lead records', 'crm'),
('leads:write', 'Create & Edit Leads', 'Create and edit leads and contact profiles', 'crm'),
('leads:assign', 'Assign Leads', 'Reassign leads to other team members', 'crm'),
('deals:read', 'View Deals & Pipelines', 'Access sales funnels and deal boards', 'sales'),
('deals:write', 'Manage Deals', 'Move stages, edit values, and manage contracts', 'sales'),
('appointments:read', 'View Calendar & Appointments', 'View scheduled viewings and visits', 'appointments'),
('appointments:write', 'Book & Edit Appointments', 'Schedule and reschedule appointments', 'appointments'),
('inbox:read', 'View Communications', 'Read WhatsApp, email, and SMS conversations', 'communication'),
('inbox:write', 'Send Communications', 'Dispatch emails, WhatsApp messages, and SMS', 'communication'),
('ai:invoke', 'Invoke AI Agents', 'Trigger specialist AI agents on CRM records', 'ai'),
('ai:approve', 'Approve AI Actions', 'Sign off on sensitive AI tool calls', 'ai'),
('workflows:manage', 'Manage Workflows', 'Design and activate automated business workflows', 'workflows'),
('billing:manage', 'Manage Billing & Plans', 'View invoices and modify subscription tiers', 'billing'),
('audit:read', 'View Security Audit Logs', 'Inspect immutable audit logs', 'security')
ON CONFLICT (key) DO NOTHING;

-- 7.3 Map Permissions to Roles
-- Org Owner gets all permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r 
CROSS JOIN public.permissions p
WHERE r.code = 'org_owner'
ON CONFLICT DO NOTHING;

-- Org Admin gets all except billing:manage
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r 
CROSS JOIN public.permissions p
WHERE r.code = 'org_admin' AND p.key != 'billing:manage'
ON CONFLICT DO NOTHING;

-- Agent gets operational read/write
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r 
CROSS JOIN public.permissions p
WHERE r.code = 'agent' AND p.key IN (
    'properties:read', 'properties:write',
    'leads:read', 'leads:write',
    'deals:read', 'deals:write',
    'appointments:read', 'appointments:write',
    'inbox:read', 'inbox:write',
    'ai:invoke'
)
ON CONFLICT DO NOTHING;
