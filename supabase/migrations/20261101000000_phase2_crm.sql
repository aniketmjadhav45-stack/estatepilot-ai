-- ==============================================================================
-- EstatePilot AI — Phase 2 CRM Database Migration
-- Target: PostgreSQL 16+ (Supabase / Local PG)
-- Tables: contacts, leads, tasks, activities
-- Multi-Tenancy: Strict organization_id enforcement + RLS policies
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Contacts Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    type TEXT NOT NULL DEFAULT 'client' CHECK (type IN ('client', 'buyer', 'seller', 'renter', 'landlord', 'agent', 'investor', 'other')),
    address JSONB NOT NULL DEFAULT '{}'::jsonb,
    tags TEXT[] NOT NULL DEFAULT '{}',
    assigned_to_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_contacts_org ON public.contacts(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_assigned ON public.contacts(assigned_to_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts(organization_id, lower(email)) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_type ON public.contacts(organization_id, type) WHERE deleted_at IS NULL;

-- ------------------------------------------------------------------------------
-- 2. Leads Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
        'new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost', 'unqualified'
    )),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    source TEXT NOT NULL DEFAULT 'website' CHECK (source IN (
        'website', 'portal', 'referral', 'walk_in', 'phone', 'social', 'ad', 'direct_website', 'other'
    )),
    qualification_score INT NOT NULL DEFAULT 0 CHECK (qualification_score >= 0 AND qualification_score <= 100),
    intent_summary TEXT,
    estimated_budget_min NUMERIC(15,2),
    estimated_budget_max NUMERIC(15,2),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    property_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    assigned_to_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    last_contacted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_leads_org ON public.leads(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_priority ON public.leads(organization_id, priority) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_source ON public.leads(organization_id, source) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON public.leads(assigned_to_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_contact ON public.leads(contact_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(organization_id, created_at DESC) WHERE deleted_at IS NULL;

-- ------------------------------------------------------------------------------
-- 3. Tasks Table (Follow-ups, viewings, reminders)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    task_type TEXT NOT NULL DEFAULT 'follow_up' CHECK (task_type IN (
        'call', 'email', 'visit', 'meeting', 'follow_up', 'task', 'review'
    )),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    assigned_to_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tasks_org ON public.tasks(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_lead ON public.tasks(lead_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(organization_id, due_date) WHERE deleted_at IS NULL AND status = 'pending';
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON public.tasks(assigned_to_id) WHERE deleted_at IS NULL;

-- ------------------------------------------------------------------------------
-- 4. Activities Table (Timeline, notes, calls, emails, status changes)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'note', 'call_logged', 'email_sent', 'status_change', 'stage_moved', 'task_completed', 'visit_scheduled', 'ai_interaction'
    )),
    title TEXT NOT NULL,
    description TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activities_org ON public.activities(organization_id);
CREATE INDEX IF NOT EXISTS idx_activities_lead ON public.activities(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_contact ON public.activities(contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON public.activities(organization_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 5. Automatic updated_at Triggers
-- ------------------------------------------------------------------------------
CREATE OR REPLACE TRIGGER set_contacts_updated_at
    BEFORE UPDATE ON public.contacts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER set_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER set_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 6. Row Level Security Policies
-- ------------------------------------------------------------------------------
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Contacts RLS
DROP POLICY IF EXISTS tenant_isolation_contacts ON public.contacts;
CREATE POLICY tenant_isolation_contacts ON public.contacts
    FOR ALL
    TO authenticated
    USING (public.is_org_member(organization_id))
    WITH CHECK (public.is_org_member(organization_id));

-- Leads RLS
DROP POLICY IF EXISTS tenant_isolation_leads ON public.leads;
CREATE POLICY tenant_isolation_leads ON public.leads
    FOR ALL
    TO authenticated
    USING (public.is_org_member(organization_id))
    WITH CHECK (public.is_org_member(organization_id));

-- Tasks RLS
DROP POLICY IF EXISTS tenant_isolation_tasks ON public.tasks;
CREATE POLICY tenant_isolation_tasks ON public.tasks
    FOR ALL
    TO authenticated
    USING (public.is_org_member(organization_id))
    WITH CHECK (public.is_org_member(organization_id));

-- Activities RLS
DROP POLICY IF EXISTS tenant_isolation_activities ON public.activities;
CREATE POLICY tenant_isolation_activities ON public.activities
    FOR ALL
    TO authenticated
    USING (public.is_org_member(organization_id))
    WITH CHECK (public.is_org_member(organization_id));

-- Service Role Full Bypass Grants
GRANT ALL ON TABLE public.contacts TO service_role;
GRANT ALL ON TABLE public.leads TO service_role;
GRANT ALL ON TABLE public.tasks TO service_role;
GRANT ALL ON TABLE public.activities TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.contacts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.leads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.activities TO authenticated;
