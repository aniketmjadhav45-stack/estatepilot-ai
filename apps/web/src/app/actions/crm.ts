'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createServerClient } from '@estatepilot/database';
import {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  updateLeadStatus,
  assignLead,
  deleteLead,
  getContacts,
  createContact,
  getTasks,
  createTask,
  updateTaskStatus,
  createActivity,
  getCrmDashboardMetrics,
  LeadListOptions,
} from '@estatepilot/database';
import {
  CreateLeadSchema,
  UpdateLeadSchema,
  UpdateLeadStatusSchema,
  AssignLeadSchema,
  CreateContactSchema,
  CreateTaskSchema,
  UpdateTaskStatusSchema,
  CreateActivityNoteSchema,
} from '@estatepilot/validation';
import { ACTIVE_ORG_COOKIE, recordAuditLog } from '@estatepilot/auth';
import { LeadStatus, CrmTaskStatus } from '@estatepilot/shared';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

function getContext() {
  const cookieStore = cookies();
  const token = cookieStore.get('sb-access-token')?.value || '';
  const activeOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value || 'org_apex_01';
  const userId = cookieStore.get('sb-user-id')?.value || '00000000-0000-0000-0000-000000000001';

  return {
    client: createServerClient(token),
    activeOrgId,
    userId,
  };
}

// ------------------------------------------------------------------------------
// Leads Actions
// ------------------------------------------------------------------------------

export async function getLeadsAction(options: LeadListOptions = {}): Promise<ActionResponse> {
  const { client, activeOrgId } = getContext();
  const res = await getLeads(client, activeOrgId, options);

  if (!res.ok) {
    return { success: false, error: res.error.message };
  }

  return { success: true, data: res.value };
}

export async function getLeadDetailsAction(leadId: string): Promise<ActionResponse> {
  const { client, activeOrgId } = getContext();
  const res = await getLeadById(client, activeOrgId, leadId);

  if (!res.ok) {
    return { success: false, error: res.error.message };
  }

  return { success: true, data: res.value };
}

export async function createLeadAction(rawInput: unknown): Promise<ActionResponse> {
  const parsed = CreateLeadSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || 'Invalid lead data' };
  }

  const { client, activeOrgId, userId } = getContext();
  const res = await createLead(
    client,
    activeOrgId,
    {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email || undefined,
      phone: parsed.data.phone || undefined,
      status: parsed.data.status,
      priority: parsed.data.priority,
      source: parsed.data.source,
      contactId: parsed.data.contactId || undefined,
      assignedToId: parsed.data.assignedToId || undefined,
      qualificationScore: parsed.data.qualificationScore,
      intentSummary: parsed.data.intentSummary || undefined,
      estimatedBudgetMin: parsed.data.estimatedBudgetMin,
      estimatedBudgetMax: parsed.data.estimatedBudgetMax,
      currency: parsed.data.currency,
      propertyPreferences: parsed.data.propertyPreferences,
      notes: parsed.data.notes || undefined,
    },
    userId
  );

  if (!res.ok) {
    return { success: false, error: res.error.message };
  }

  await recordAuditLog(client, {
    organizationId: activeOrgId,
    userId,
    action: 'lead.created',
    entityType: 'lead',
    entityId: res.value.id,
    diff: { firstName: parsed.data.firstName, lastName: parsed.data.lastName, status: parsed.data.status },
  });

  revalidatePath('/dashboard/leads');
  revalidatePath('/dashboard');
  return { success: true, data: res.value };
}

export async function updateLeadAction(leadId: string, rawInput: unknown): Promise<ActionResponse> {
  const parsed = UpdateLeadSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || 'Invalid lead updates' };
  }

  const { client, activeOrgId, userId } = getContext();
  const res = await updateLead(client, activeOrgId, leadId, parsed.data, userId);

  if (!res.ok) {
    return { success: false, error: res.error.message };
  }

  await recordAuditLog(client, {
    organizationId: activeOrgId,
    userId,
    action: 'lead.updated',
    entityType: 'lead',
    entityId: leadId,
  });

  revalidatePath(`/dashboard/leads/${leadId}`);
  revalidatePath('/dashboard/leads');
  revalidatePath('/dashboard');
  return { success: true, data: res.value };
}

export async function updateLeadStatusAction(
  leadId: string,
  status: LeadStatus,
  reason?: string
): Promise<ActionResponse> {
  const parsed = UpdateLeadStatusSchema.safeParse({ leadId, status, reason });
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || 'Invalid status parameters' };
  }

  const { client, activeOrgId, userId } = getContext();
  const res = await updateLeadStatus(client, activeOrgId, leadId, status, reason, userId);

  if (!res.ok) {
    return { success: false, error: res.error.message };
  }

  await recordAuditLog(client, {
    organizationId: activeOrgId,
    userId,
    action: 'lead.status_changed',
    entityType: 'lead',
    entityId: leadId,
    diff: { newStatus: status, reason },
  });

  revalidatePath(`/dashboard/leads/${leadId}`);
  revalidatePath('/dashboard/leads');
  revalidatePath('/dashboard');
  return { success: true, data: res.value };
}

export async function assignLeadAction(leadId: string, assignedToId: string): Promise<ActionResponse> {
  const parsed = AssignLeadSchema.safeParse({ leadId, assignedToId });
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || 'Invalid assignment' };
  }

  const { client, activeOrgId, userId } = getContext();
  const res = await assignLead(client, activeOrgId, leadId, assignedToId, userId);

  if (!res.ok) {
    return { success: false, error: res.error.message };
  }

  revalidatePath(`/dashboard/leads/${leadId}`);
  revalidatePath('/dashboard/leads');
  return { success: true, data: res.value };
}

export async function deleteLeadAction(leadId: string): Promise<ActionResponse> {
  const { client, activeOrgId, userId } = getContext();
  const res = await deleteLead(client, activeOrgId, leadId, userId);

  if (!res.ok) {
    return { success: false, error: res.error.message };
  }

  await recordAuditLog(client, {
    organizationId: activeOrgId,
    userId,
    action: 'lead.deleted',
    entityType: 'lead',
    entityId: leadId,
  });

  revalidatePath('/dashboard/leads');
  revalidatePath('/dashboard');
  return { success: true };
}

// ------------------------------------------------------------------------------
// Contacts Actions
// ------------------------------------------------------------------------------

export async function getContactsAction(options: { search?: string; page?: number; limit?: number } = {}): Promise<ActionResponse> {
  const { client, activeOrgId } = getContext();
  const res = await getContacts(client, activeOrgId, options);

  if (!res.ok) {
    return { success: false, error: res.error.message };
  }

  return { success: true, data: res.value };
}

export async function createContactAction(rawInput: unknown): Promise<ActionResponse> {
  const parsed = CreateContactSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || 'Invalid contact data' };
  }

  const { client, activeOrgId, userId } = getContext();
  const res = await createContact(
    client,
    activeOrgId,
    {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email || undefined,
      phone: parsed.data.phone || undefined,
      company: parsed.data.company || undefined,
      type: parsed.data.type,
      tags: parsed.data.tags,
      assignedToId: parsed.data.assignedToId || undefined,
    },
    userId
  );

  if (!res.ok) {
    return { success: false, error: res.error.message };
  }

  revalidatePath('/dashboard/contacts');
  return { success: true, data: res.value };
}

// ------------------------------------------------------------------------------
// Tasks & Follow-ups Actions
// ------------------------------------------------------------------------------

export async function getTasksAction(options: { leadId?: string; status?: CrmTaskStatus; limit?: number } = {}): Promise<ActionResponse> {
  const { client, activeOrgId } = getContext();
  const res = await getTasks(client, activeOrgId, options);

  if (!res.ok) {
    return { success: false, error: res.error.message };
  }

  return { success: true, data: res.value };
}

export async function createTaskAction(rawInput: unknown): Promise<ActionResponse> {
  const parsed = CreateTaskSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || 'Invalid task input' };
  }

  const { client, activeOrgId, userId } = getContext();
  const res = await createTask(client, activeOrgId, parsed.data, userId);

  if (!res.ok) {
    return { success: false, error: res.error.message };
  }

  if (parsed.data.leadId) {
    revalidatePath(`/dashboard/leads/${parsed.data.leadId}`);
  }
  revalidatePath('/dashboard');
  return { success: true, data: res.value };
}

export async function toggleTaskCompleteAction(taskId: string, currentStatus: CrmTaskStatus): Promise<ActionResponse> {
  const nextStatus: CrmTaskStatus = currentStatus === 'completed' ? 'pending' : 'completed';
  const parsed = UpdateTaskStatusSchema.safeParse({ taskId, status: nextStatus });
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || 'Invalid parameters' };
  }

  const { client, activeOrgId, userId } = getContext();
  const res = await updateTaskStatus(client, activeOrgId, taskId, nextStatus, userId);

  if (!res.ok) {
    return { success: false, error: res.error.message };
  }

  revalidatePath('/dashboard');
  return { success: true, data: { status: nextStatus } };
}

// ------------------------------------------------------------------------------
// Activities & Notes Actions
// ------------------------------------------------------------------------------

export async function createActivityNoteAction(rawInput: unknown): Promise<ActionResponse> {
  const parsed = CreateActivityNoteSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || 'Invalid note input' };
  }

  const { client, activeOrgId, userId } = getContext();
  const res = await createActivity(client, activeOrgId, parsed.data, userId);

  if (!res.ok) {
    return { success: false, error: res.error.message };
  }

  if (parsed.data.leadId) {
    revalidatePath(`/dashboard/leads/${parsed.data.leadId}`);
  }
  revalidatePath('/dashboard');
  return { success: true, data: res.value };
}

// ------------------------------------------------------------------------------
// CRM Dashboard Real-Time Metrics Action
// ------------------------------------------------------------------------------

export async function getCrmDashboardMetricsAction(): Promise<ActionResponse> {
  const { client, activeOrgId } = getContext();
  const res = await getCrmDashboardMetrics(client, activeOrgId);

  if (!res.ok) {
    return { success: false, error: res.error.message };
  }

  return { success: true, data: res.value };
}
