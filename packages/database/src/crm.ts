import { TypedSupabaseClient } from './client';
import {
  Result,
  ok,
  err,
  Lead,
  Contact,
  CrmTask,
  CrmActivity,
  CrmDashboardStats,
  LeadStatus,
  LeadPriority,
  ContactType,
  CrmTaskType,
  CrmTaskStatus,
  CrmActivityType,
  LEAD_STATUSES,
} from '@estatepilot/shared';

export interface LeadListOptions {
  search?: string;
  status?: LeadStatus;
  priority?: LeadPriority;
  source?: string;
  assignedToId?: string;
  contactId?: string;
  page?: number;
  limit?: number;
  sortBy?: 'created_at' | 'qualification_score' | 'estimated_budget_max' | 'first_name';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateLeadPayload {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  status?: LeadStatus;
  priority?: LeadPriority;
  source?: string;
  contactId?: string | null;
  assignedToId?: string | null;
  qualificationScore?: number;
  intentSummary?: string | null;
  estimatedBudgetMin?: number | null;
  estimatedBudgetMax?: number | null;
  currency?: string;
  propertyPreferences?: Record<string, unknown>;
  notes?: string | null;
}

export interface CreateContactPayload {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  type?: ContactType;
  address?: Record<string, unknown>;
  tags?: string[];
  assignedToId?: string | null;
}

export interface CreateTaskPayload {
  leadId?: string | null;
  contactId?: string | null;
  title: string;
  description?: string | null;
  taskType?: CrmTaskType;
  status?: CrmTaskStatus;
  priority?: LeadPriority;
  dueDate?: string | null;
  assignedToId?: string | null;
}

export interface CreateActivityPayload {
  leadId?: string | null;
  contactId?: string | null;
  type: CrmActivityType;
  title: string;
  description?: string | null;
  metadata?: Record<string, unknown>;
}

// ==============================================================================
// 1. Leads Management
// ==============================================================================

export async function getLeads(
  client: TypedSupabaseClient,
  organizationId: string,
  options: LeadListOptions = {}
): Promise<Result<PaginatedResult<Lead>, Error>> {
  if (!organizationId) {
    return err(new Error('organizationId is required'));
  }

  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const offset = (page - 1) * limit;
  const sortBy = options.sortBy || 'created_at';
  const sortOrder = options.sortOrder === 'asc' ? 'asc' : 'desc';

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (client.from as any)('leads')
      .select(`
        id,
        organization_id,
        contact_id,
        first_name,
        last_name,
        email,
        phone,
        status,
        priority,
        source,
        qualification_score,
        intent_summary,
        estimated_budget_min,
        estimated_budget_max,
        currency,
        property_preferences,
        assigned_to_id,
        branch_id,
        last_contacted_at,
        created_at,
        updated_at,
        deleted_at,
        assigned_to:profiles!leads_assigned_to_id_fkey(id, first_name, last_name, email, avatar_url),
        contact:contacts!leads_contact_id_fkey(id, first_name, last_name, company, email, phone)
      `, { count: 'exact' })
      .eq('organization_id', organizationId)
      .is('deleted_at', null);

    if (options.status) {
      query = query.eq('status', options.status);
    }
    if (options.priority) {
      query = query.eq('priority', options.priority);
    }
    if (options.source) {
      query = query.eq('source', options.source);
    }
    if (options.assignedToId) {
      query = query.eq('assigned_to_id', options.assignedToId);
    }
    if (options.contactId) {
      query = query.eq('contact_id', options.contactId);
    }
    if (options.search) {
      const q = options.search.trim();
      query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
    }

    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return err(new Error(`Failed to fetch leads: ${error.message}`));
    }

    const total = count || 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const leads: Lead[] = (data || []).map((row: any) => ({
      id: row.id,
      organizationId: row.organization_id,
      contactId: row.contact_id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      status: row.status,
      priority: row.priority,
      source: row.source,
      qualificationScore: row.qualification_score,
      intentSummary: row.intent_summary,
      estimatedBudgetMin: row.estimated_budget_min,
      estimatedBudgetMax: row.estimated_budget_max,
      currency: row.currency,
      propertyPreferences: row.property_preferences,
      assignedToId: row.assigned_to_id,
      branchId: row.branch_id,
      lastContactedAt: row.last_contacted_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
      assignedTo: row.assigned_to
        ? {
            id: row.assigned_to.id,
            email: row.assigned_to.email,
            firstName: row.assigned_to.first_name,
            lastName: row.assigned_to.last_name,
            avatarUrl: row.assigned_to.avatar_url,
            timeZone: 'UTC',
            locale: 'en',
            isPlatformAdmin: false,
            createdAt: '',
            updatedAt: '',
          }
        : undefined,
      contact: row.contact
        ? {
            id: row.contact.id,
            organizationId: row.organization_id,
            firstName: row.contact.first_name,
            lastName: row.contact.last_name,
            email: row.contact.email,
            phone: row.contact.phone,
            company: row.contact.company,
            type: 'client',
            tags: [],
            createdAt: '',
            updatedAt: '',
          }
        : undefined,
    }));

    return ok({
      data: leads,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    return err(error instanceof Error ? error : new Error('Unknown error fetching leads'));
  }
}

export async function getLeadById(
  client: TypedSupabaseClient,
  organizationId: string,
  leadId: string
): Promise<Result<Lead, Error>> {
  if (!organizationId || !leadId) {
    return err(new Error('organizationId and leadId are required'));
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: leadData, error: leadError } = await (client.from as any)('leads')
      .select(`
        *,
        assigned_to:profiles!leads_assigned_to_id_fkey(id, first_name, last_name, email, avatar_url),
        contact:contacts!leads_contact_id_fkey(id, first_name, last_name, company, email, phone)
      `)
      .eq('organization_id', organizationId)
      .eq('id', leadId)
      .is('deleted_at', null)
      .single();

    if (leadError) {
      return err(new Error(`Lead not found: ${leadError.message}`));
    }

    // Fetch associated tasks
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tasksData } = await (client.from as any)('tasks')
      .select(`
        *,
        assigned_to:profiles!tasks_assigned_to_id_fkey(id, first_name, last_name, email, avatar_url)
      `)
      .eq('organization_id', organizationId)
      .eq('lead_id', leadId)
      .is('deleted_at', null)
      .order('due_date', { ascending: true });

    // Fetch recent activities
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: activitiesData } = await (client.from as any)('activities')
      .select(`
        *,
        created_by:profiles!activities_created_by_id_fkey(id, first_name, last_name, email, avatar_url)
      `)
      .eq('organization_id', organizationId)
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(30);

    const lead: Lead = {
      id: leadData.id,
      organizationId: leadData.organization_id,
      contactId: leadData.contact_id,
      firstName: leadData.first_name,
      lastName: leadData.last_name,
      email: leadData.email,
      phone: leadData.phone,
      status: leadData.status,
      priority: leadData.priority,
      source: leadData.source,
      qualificationScore: leadData.qualification_score,
      intentSummary: leadData.intent_summary,
      estimatedBudgetMin: leadData.estimated_budget_min,
      estimatedBudgetMax: leadData.estimated_budget_max,
      currency: leadData.currency,
      propertyPreferences: leadData.property_preferences,
      assignedToId: leadData.assigned_to_id,
      branchId: leadData.branch_id,
      lastContactedAt: leadData.last_contacted_at,
      createdAt: leadData.created_at,
      updatedAt: leadData.updated_at,
      deletedAt: leadData.deleted_at,
      assignedTo: leadData.assigned_to
        ? {
            id: leadData.assigned_to.id,
            email: leadData.assigned_to.email,
            firstName: leadData.assigned_to.first_name,
            lastName: leadData.assigned_to.last_name,
            avatarUrl: leadData.assigned_to.avatar_url,
            timeZone: 'UTC',
            locale: 'en',
            isPlatformAdmin: false,
            createdAt: '',
            updatedAt: '',
          }
        : undefined,
      contact: leadData.contact
        ? {
            id: leadData.contact.id,
            organizationId: leadData.organization_id,
            firstName: leadData.contact.first_name,
            lastName: leadData.contact.last_name,
            email: leadData.contact.email,
            phone: leadData.contact.phone,
            company: leadData.contact.company,
            type: 'client',
            tags: [],
            createdAt: '',
            updatedAt: '',
          }
        : undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tasks: (tasksData || []).map((t: any) => ({
        id: t.id,
        organizationId: t.organization_id,
        leadId: t.lead_id,
        contactId: t.contact_id,
        title: t.title,
        description: t.description,
        taskType: t.task_type,
        status: t.status,
        priority: t.priority,
        dueDate: t.due_date,
        completedAt: t.completed_at,
        assignedToId: t.assigned_to_id,
        createdById: t.created_by_id,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        deletedAt: t.deleted_at,
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recentActivities: (activitiesData || []).map((a: any) => ({
        id: a.id,
        organizationId: a.organization_id,
        leadId: a.lead_id,
        contactId: a.contact_id,
        type: a.type,
        title: a.title,
        description: a.description,
        metadata: a.metadata,
        createdById: a.created_by_id,
        createdAt: a.created_at,
        createdBy: a.created_by
          ? {
              id: a.created_by.id,
              email: a.created_by.email,
              firstName: a.created_by.first_name,
              lastName: a.created_by.last_name,
              avatarUrl: a.created_by.avatar_url,
              timeZone: 'UTC',
              locale: 'en',
              isPlatformAdmin: false,
              createdAt: '',
              updatedAt: '',
            }
          : undefined,
      })),
    };

    return ok(lead);
  } catch (error) {
    return err(error instanceof Error ? error : new Error('Unknown error retrieving lead'));
  }
}

export async function createLead(
  client: TypedSupabaseClient,
  organizationId: string,
  payload: CreateLeadPayload,
  authorProfileId?: string
): Promise<Result<Lead, Error>> {
  if (!organizationId) {
    return err(new Error('organizationId is required'));
  }
  if (!payload.firstName?.trim() || !payload.lastName?.trim()) {
    return err(new Error('First and last name are required'));
  }

  try {
    // 1. Create Lead
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (client.from as any)('leads')
      .insert({
        organization_id: organizationId,
        contact_id: payload.contactId || null,
        first_name: payload.firstName.trim(),
        last_name: payload.lastName.trim(),
        email: payload.email?.trim() || null,
        phone: payload.phone?.trim() || null,
        status: payload.status || 'new',
        priority: payload.priority || 'medium',
        source: payload.source || 'website',
        qualification_score: payload.qualificationScore ?? 50,
        intent_summary: payload.intentSummary?.trim() || null,
        estimated_budget_min: payload.estimatedBudgetMin ?? null,
        estimated_budget_max: payload.estimatedBudgetMax ?? null,
        currency: payload.currency || 'USD',
        property_preferences: payload.propertyPreferences || {},
        assigned_to_id: payload.assignedToId || null,
        last_contacted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return err(new Error(`Failed to create lead: ${error.message}`));
    }

    // 2. Automatically record initial activity
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (client.from as any)('activities').insert({
      organization_id: organizationId,
      lead_id: data.id,
      contact_id: payload.contactId || null,
      type: 'status_change',
      title: 'Lead Ingested',
      description: payload.notes
        ? `Lead received via ${payload.source || 'website'}. Note: ${payload.notes}`
        : `Lead captured from ${payload.source || 'website'}.`,
      metadata: { source: payload.source, initialScore: payload.qualificationScore ?? 50 },
      created_by_id: authorProfileId || null,
    });

    // 3. If notes provided, also record separate note activity
    if (payload.notes?.trim()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (client.from as any)('activities').insert({
        organization_id: organizationId,
        lead_id: data.id,
        contact_id: payload.contactId || null,
        type: 'note',
        title: 'Initial Intake Note',
        description: payload.notes.trim(),
        created_by_id: authorProfileId || null,
      });
    }

    return getLeadById(client, organizationId, data.id);
  } catch (error) {
    return err(error instanceof Error ? error : new Error('Unknown error creating lead'));
  }
}

export async function updateLead(
  client: TypedSupabaseClient,
  organizationId: string,
  leadId: string,
  payload: Partial<CreateLeadPayload>,
  editorProfileId?: string
): Promise<Result<Lead, Error>> {
  if (!organizationId || !leadId) {
    return err(new Error('organizationId and leadId are required'));
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };

    if (payload.firstName !== undefined) updateData.first_name = payload.firstName.trim();
    if (payload.lastName !== undefined) updateData.last_name = payload.lastName.trim();
    if (payload.email !== undefined) updateData.email = payload.email?.trim() || null;
    if (payload.phone !== undefined) updateData.phone = payload.phone?.trim() || null;
    if (payload.status !== undefined) updateData.status = payload.status;
    if (payload.priority !== undefined) updateData.priority = payload.priority;
    if (payload.source !== undefined) updateData.source = payload.source;
    if (payload.qualificationScore !== undefined) updateData.qualification_score = payload.qualificationScore;
    if (payload.intentSummary !== undefined) updateData.intent_summary = payload.intentSummary?.trim() || null;
    if (payload.estimatedBudgetMin !== undefined) updateData.estimated_budget_min = payload.estimatedBudgetMin;
    if (payload.estimatedBudgetMax !== undefined) updateData.estimated_budget_max = payload.estimatedBudgetMax;
    if (payload.currency !== undefined) updateData.currency = payload.currency;
    if (payload.propertyPreferences !== undefined) updateData.property_preferences = payload.propertyPreferences;
    if (payload.assignedToId !== undefined) updateData.assigned_to_id = payload.assignedToId || null;
    if (payload.contactId !== undefined) updateData.contact_id = payload.contactId || null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (client.from as any)('leads')
      .update(updateData)
      .eq('organization_id', organizationId)
      .eq('id', leadId)
      .is('deleted_at', null);

    if (error) {
      return err(new Error(`Failed to update lead: ${error.message}`));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (client.from as any)('activities').insert({
      organization_id: organizationId,
      lead_id: leadId,
      type: 'note',
      title: 'Lead Profile Updated',
      description: 'Lead profile attributes modified.',
      created_by_id: editorProfileId || null,
    });

    return getLeadById(client, organizationId, leadId);
  } catch (error) {
    return err(error instanceof Error ? error : new Error('Unknown error updating lead'));
  }
}

export async function updateLeadStatus(
  client: TypedSupabaseClient,
  organizationId: string,
  leadId: string,
  newStatus: LeadStatus,
  reason?: string,
  editorProfileId?: string
): Promise<Result<Lead, Error>> {
  if (!organizationId || !leadId) {
    return err(new Error('organizationId and leadId are required'));
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing, error: fetchErr } = await (client.from as any)('leads')
      .select('status')
      .eq('organization_id', organizationId)
      .eq('id', leadId)
      .is('deleted_at', null)
      .single();

    if (fetchErr || !existing) {
      return err(new Error('Lead not found'));
    }

    const previousStatus = existing.status;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (client.from as any)('leads')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
        last_contacted_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId)
      .eq('id', leadId);

    if (error) {
      return err(new Error(`Failed to update status: ${error.message}`));
    }

    // Record stage move activity
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (client.from as any)('activities').insert({
      organization_id: organizationId,
      lead_id: leadId,
      type: 'stage_moved',
      title: `Pipeline Stage: ${previousStatus.toUpperCase()} → ${newStatus.toUpperCase()}`,
      description: reason ? `Reason: ${reason}` : `Stage advanced to ${newStatus}.`,
      metadata: { previousStatus, newStatus, reason },
      created_by_id: editorProfileId || null,
    });

    return getLeadById(client, organizationId, leadId);
  } catch (error) {
    return err(error instanceof Error ? error : new Error('Unknown error changing lead status'));
  }
}

export async function assignLead(
  client: TypedSupabaseClient,
  organizationId: string,
  leadId: string,
  assignedToId: string,
  assignerProfileId?: string
): Promise<Result<Lead, Error>> {
  if (!organizationId || !leadId || !assignedToId) {
    return err(new Error('organizationId, leadId, and assignedToId are required'));
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (client.from as any)('leads')
      .update({
        assigned_to_id: assignedToId,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId)
      .eq('id', leadId)
      .is('deleted_at', null);

    if (error) {
      return err(new Error(`Failed to assign lead: ${error.message}`));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (client.from as any)('activities').insert({
      organization_id: organizationId,
      lead_id: leadId,
      type: 'note',
      title: 'Lead Reassigned',
      description: 'Lead assigned to designated team agent.',
      metadata: { assignedToId },
      created_by_id: assignerProfileId || null,
    });

    return getLeadById(client, organizationId, leadId);
  } catch (error) {
    return err(error instanceof Error ? error : new Error('Unknown error assigning lead'));
  }
}

export async function deleteLead(
  client: TypedSupabaseClient,
  organizationId: string,
  leadId: string,
  profileId?: string
): Promise<Result<boolean, Error>> {
  if (!organizationId || !leadId) {
    return err(new Error('organizationId and leadId are required'));
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (client.from as any)('leads')
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId)
      .eq('id', leadId);

    if (error) {
      return err(new Error(`Failed to delete lead: ${error.message}`));
    }

    return ok(true);
  } catch (error) {
    return err(error instanceof Error ? error : new Error('Unknown error deleting lead'));
  }
}

// ==============================================================================
// 2. Contacts Management
// ==============================================================================

export async function getContacts(
  client: TypedSupabaseClient,
  organizationId: string,
  options: { search?: string; type?: ContactType; page?: number; limit?: number } = {}
): Promise<Result<PaginatedResult<Contact>, Error>> {
  if (!organizationId) {
    return err(new Error('organizationId is required'));
  }

  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const offset = (page - 1) * limit;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (client.from as any)('contacts')
      .select(`
        *,
        assigned_to:profiles!contacts_assigned_to_id_fkey(id, first_name, last_name, email, avatar_url)
      `, { count: 'exact' })
      .eq('organization_id', organizationId)
      .is('deleted_at', null);

    if (options.type) {
      query = query.eq('type', options.type);
    }
    if (options.search) {
      const q = options.search.trim();
      query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,company.ilike.%${q}%`);
    }

    query = query.order('created_at', { ascending: false });
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return err(new Error(`Failed to list contacts: ${error.message}`));
    }

    const total = count || 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contacts: Contact[] = (data || []).map((c: any) => ({
      id: c.id,
      organizationId: c.organization_id,
      firstName: c.first_name,
      lastName: c.last_name,
      email: c.email,
      phone: c.phone,
      company: c.company,
      type: c.type,
      address: c.address,
      tags: c.tags || [],
      assignedToId: c.assigned_to_id,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      deletedAt: c.deleted_at,
    }));

    return ok({
      data: contacts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    return err(error instanceof Error ? error : new Error('Unknown error listing contacts'));
  }
}

export async function createContact(
  client: TypedSupabaseClient,
  organizationId: string,
  payload: CreateContactPayload,
  authorProfileId?: string
): Promise<Result<Contact, Error>> {
  if (!organizationId) {
    return err(new Error('organizationId is required'));
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (client.from as any)('contacts')
      .insert({
        organization_id: organizationId,
        first_name: payload.firstName.trim(),
        last_name: payload.lastName.trim(),
        email: payload.email?.trim() || null,
        phone: payload.phone?.trim() || null,
        company: payload.company?.trim() || null,
        type: payload.type || 'client',
        address: payload.address || {},
        tags: payload.tags || [],
        assigned_to_id: payload.assignedToId || null,
      })
      .select()
      .single();

    if (error) {
      return err(new Error(`Failed to create contact: ${error.message}`));
    }

    return ok({
      id: data.id,
      organizationId: data.organization_id,
      firstName: data.first_name,
      lastName: data.last_name,
      email: data.email,
      phone: data.phone,
      company: data.company,
      type: data.type,
      address: data.address,
      tags: data.tags || [],
      assignedToId: data.assigned_to_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      deletedAt: data.deleted_at,
    });
  } catch (error) {
    return err(error instanceof Error ? error : new Error('Unknown error creating contact'));
  }
}

// ==============================================================================
// 3. Tasks & Follow-ups
// ==============================================================================

export async function getTasks(
  client: TypedSupabaseClient,
  organizationId: string,
  options: { leadId?: string; contactId?: string; status?: CrmTaskStatus; assignedToId?: string; limit?: number } = {}
): Promise<Result<CrmTask[], Error>> {
  if (!organizationId) {
    return err(new Error('organizationId is required'));
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (client.from as any)('tasks')
      .select(`
        *,
        assigned_to:profiles!tasks_assigned_to_id_fkey(id, first_name, last_name, email, avatar_url)
      `)
      .eq('organization_id', organizationId)
      .is('deleted_at', null);

    if (options.leadId) query = query.eq('lead_id', options.leadId);
    if (options.contactId) query = query.eq('contact_id', options.contactId);
    if (options.status) query = query.eq('status', options.status);
    if (options.assignedToId) query = query.eq('assigned_to_id', options.assignedToId);

    query = query.order('due_date', { ascending: true });
    if (options.limit) query = query.limit(options.limit);

    const { data, error } = await query;

    if (error) {
      return err(new Error(`Failed to fetch tasks: ${error.message}`));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tasks: CrmTask[] = (data || []).map((t: any) => ({
      id: t.id,
      organizationId: t.organization_id,
      leadId: t.lead_id,
      contactId: t.contact_id,
      title: t.title,
      description: t.description,
      taskType: t.task_type,
      status: t.status,
      priority: t.priority,
      dueDate: t.due_date,
      completedAt: t.completed_at,
      assignedToId: t.assigned_to_id,
      createdById: t.created_by_id,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      deletedAt: t.deleted_at,
    }));

    return ok(tasks);
  } catch (error) {
    return err(error instanceof Error ? error : new Error('Unknown error fetching tasks'));
  }
}

export async function createTask(
  client: TypedSupabaseClient,
  organizationId: string,
  payload: CreateTaskPayload,
  authorProfileId?: string
): Promise<Result<CrmTask, Error>> {
  if (!organizationId || !payload.title?.trim()) {
    return err(new Error('organizationId and task title are required'));
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (client.from as any)('tasks')
      .insert({
        organization_id: organizationId,
        lead_id: payload.leadId || null,
        contact_id: payload.contactId || null,
        title: payload.title.trim(),
        description: payload.description?.trim() || null,
        task_type: payload.taskType || 'follow_up',
        status: payload.status || 'pending',
        priority: payload.priority || 'medium',
        due_date: payload.dueDate || null,
        assigned_to_id: payload.assignedToId || null,
        created_by_id: authorProfileId || null,
      })
      .select()
      .single();

    if (error) {
      return err(new Error(`Failed to create task: ${error.message}`));
    }

    // If linked to lead, record activity
    if (payload.leadId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (client.from as any)('activities').insert({
        organization_id: organizationId,
        lead_id: payload.leadId,
        contact_id: payload.contactId || null,
        type: payload.taskType === 'visit' ? 'visit_scheduled' : 'note',
        title: `Task Created: ${payload.title}`,
        description: payload.description || `Scheduled for ${payload.dueDate || 'immediate action'}.`,
        metadata: { taskId: data.id, taskType: payload.taskType },
        created_by_id: authorProfileId || null,
      });
    }

    return ok({
      id: data.id,
      organizationId: data.organization_id,
      leadId: data.lead_id,
      contactId: data.contact_id,
      title: data.title,
      description: data.description,
      taskType: data.task_type,
      status: data.status,
      priority: data.priority,
      dueDate: data.due_date,
      completedAt: data.completed_at,
      assignedToId: data.assigned_to_id,
      createdById: data.created_by_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      deletedAt: data.deleted_at,
    });
  } catch (error) {
    return err(error instanceof Error ? error : new Error('Unknown error creating task'));
  }
}

export async function updateTaskStatus(
  client: TypedSupabaseClient,
  organizationId: string,
  taskId: string,
  status: CrmTaskStatus,
  profileId?: string
): Promise<Result<boolean, Error>> {
  if (!organizationId || !taskId) {
    return err(new Error('organizationId and taskId are required'));
  }

  try {
    const isCompleted = status === 'completed';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updated, error } = await (client.from as any)('tasks')
      .update({
        status,
        completed_at: isCompleted ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId)
      .eq('id', taskId)
      .select('lead_id, title')
      .single();

    if (error) {
      return err(new Error(`Failed to update task: ${error.message}`));
    }

    if (updated?.lead_id && isCompleted) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (client.from as any)('activities').insert({
        organization_id: organizationId,
        lead_id: updated.lead_id,
        type: 'task_completed',
        title: `Task Completed: ${updated.title}`,
        description: 'Follow-up task marked resolved.',
        metadata: { taskId },
        created_by_id: profileId || null,
      });
    }

    return ok(true);
  } catch (error) {
    return err(error instanceof Error ? error : new Error('Unknown error updating task'));
  }
}

// ==============================================================================
// 4. Activity Timeline & Notes
// ==============================================================================

export async function createActivity(
  client: TypedSupabaseClient,
  organizationId: string,
  payload: CreateActivityPayload,
  authorProfileId?: string
): Promise<Result<CrmActivity, Error>> {
  if (!organizationId || !payload.title?.trim()) {
    return err(new Error('organizationId and title are required'));
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (client.from as any)('activities')
      .insert({
        organization_id: organizationId,
        lead_id: payload.leadId || null,
        contact_id: payload.contactId || null,
        type: payload.type || 'note',
        title: payload.title.trim(),
        description: payload.description?.trim() || null,
        metadata: payload.metadata || {},
        created_by_id: authorProfileId || null,
      })
      .select()
      .single();

    if (error) {
      return err(new Error(`Failed to create activity: ${error.message}`));
    }

    return ok({
      id: data.id,
      organizationId: data.organization_id,
      leadId: data.lead_id,
      contactId: data.contact_id,
      type: data.type,
      title: data.title,
      description: data.description,
      metadata: data.metadata,
      createdById: data.created_by_id,
      createdAt: data.created_at,
    });
  } catch (error) {
    return err(error instanceof Error ? error : new Error('Unknown error recording activity'));
  }
}

// ==============================================================================
// 5. CRM Dashboard Real-Time Metrics Aggregation
// ==============================================================================

export async function getCrmDashboardMetrics(
  client: TypedSupabaseClient,
  organizationId: string
): Promise<Result<CrmDashboardStats, Error>> {
  if (!organizationId) {
    return err(new Error('organizationId is required'));
  }

  try {
    // 1. Fetch active leads
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: leads, error: leadsErr } = await (client.from as any)('leads')
      .select('id, status, source, estimated_budget_max, created_at')
      .eq('organization_id', organizationId)
      .is('deleted_at', null);

    if (leadsErr) {
      return err(new Error(`Failed to load CRM stats: ${leadsErr.message}`));
    }

    const allLeads = leads || [];
    const totalLeads = allLeads.length;
    const newLeads = allLeads.filter((l: { status: string }) => l.status === 'new').length;
    const qualifiedLeads = allLeads.filter((l: { status: string }) => l.status === 'qualified').length;
    const activeDeals = allLeads.filter((l: { status: string }) =>
      ['proposal', 'negotiation'].includes(l.status)
    ).length;

    // 2. Fetch pending follow-ups due
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: followUpsDueCount } = await (client.from as any)('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'pending')
      .is('deleted_at', null);

    const followUpsDue = followUpsDueCount || 0;

    // 3. Compute pipeline overview across all 8 standard stages
    const stageLabels: Record<LeadStatus, string> = {
      new: 'New Inquiries',
      contacted: 'Contacted',
      qualified: 'Qualified',
      proposal: 'Proposal Sent',
      negotiation: 'In Negotiation',
      closed_won: 'Closed Won',
      closed_lost: 'Closed Lost',
      unqualified: 'Unqualified',
    };

    const pipelineOverview = LEAD_STATUSES.map((st) => {
      const stageLeads = allLeads.filter((l: { status: string }) => l.status === st);
      const stageCount = stageLeads.length;
      const totalValue = stageLeads.reduce(
        (sum: number, l: { estimated_budget_max: number | null }) => sum + (Number(l.estimated_budget_max) || 0),
        0
      );
      return {
        stage: st,
        label: stageLabels[st],
        count: stageCount,
        totalValue,
        percentage: totalLeads > 0 ? Math.round((stageCount / totalLeads) * 100) : 0,
      };
    });

    // 4. Compute lead source breakdown
    const sourceCounts: Record<string, number> = {};
    for (const l of allLeads) {
      const src = l.source || 'website';
      sourceCounts[src] = (sourceCounts[src] || 0) + 1;
    }

    const sourceLabels: Record<string, string> = {
      website: 'Direct Website',
      direct_website: 'Direct Website',
      portal: 'Property Portals',
      referral: 'Client Referrals',
      walk_in: 'Walk-in Visitors',
      phone: 'Inbound Phone Calls',
      social: 'Social Media Campaigns',
      ad: 'Paid Digital Ads',
      other: 'Other Sources',
    };

    const sourceBreakdown = Object.entries(sourceCounts).map(([src, cnt]) => ({
      source: src,
      label: sourceLabels[src] || src,
      count: cnt,
      percentage: totalLeads > 0 ? Math.round((cnt / totalLeads) * 100) : 0,
    }));

    // 5. Fetch recent 10 activities
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: recentActivitiesData } = await (client.from as any)('activities')
      .select(`
        id,
        organization_id,
        lead_id,
        contact_id,
        type,
        title,
        description,
        metadata,
        created_by_id,
        created_at,
        created_by:profiles!activities_created_by_id_fkey(id, first_name, last_name, email, avatar_url)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(10);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recentActivities: CrmActivity[] = (recentActivitiesData || []).map((a: any) => ({
      id: a.id,
      organizationId: a.organization_id,
      leadId: a.lead_id,
      contactId: a.contact_id,
      type: a.type,
      title: a.title,
      description: a.description,
      metadata: a.metadata,
      createdById: a.created_by_id,
      createdAt: a.created_at,
      createdBy: a.created_by
        ? {
            id: a.created_by.id,
            email: a.created_by.email,
            firstName: a.created_by.first_name,
            lastName: a.created_by.last_name,
            avatarUrl: a.created_by.avatar_url,
            timeZone: 'UTC',
            locale: 'en',
            isPlatformAdmin: false,
            createdAt: '',
            updatedAt: '',
          }
        : undefined,
    }));

    return ok({
      totalLeads,
      newLeads,
      qualifiedLeads,
      activeDeals,
      followUpsDue,
      pipelineOverview,
      sourceBreakdown,
      recentActivities,
    });
  } catch (error) {
    return err(error instanceof Error ? error : new Error('Unknown error generating CRM metrics'));
  }
}
