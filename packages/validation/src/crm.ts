import { z } from 'zod';
import { LEAD_STATUSES, LEAD_PRIORITIES } from '@estatepilot/shared';

export const CONTACT_TYPES = ['client', 'buyer', 'seller', 'renter', 'landlord', 'agent', 'investor', 'other'] as const;
export const TASK_TYPES = ['call', 'email', 'visit', 'meeting', 'follow_up', 'task', 'review'] as const;
export const TASK_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'] as const;
export const ACTIVITY_TYPES = [
  'note',
  'call_logged',
  'email_sent',
  'status_change',
  'stage_moved',
  'task_completed',
  'visit_scheduled',
  'ai_interaction',
] as const;

export const CreateContactSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Valid email required').optional().or(z.literal('')),
  phone: z.string().min(5, 'Valid phone required').optional().or(z.literal('')),
  company: z.string().max(150).optional().or(z.literal('')),
  type: z.enum(CONTACT_TYPES).default('client'),
  tags: z.array(z.string()).default([]),
  assignedToId: z.string().uuid().optional().or(z.literal('')),
});

export type CreateContactInput = z.infer<typeof CreateContactSchema>;

export const UpdateContactSchema = CreateContactSchema.partial();
export type UpdateContactInput = z.infer<typeof UpdateContactSchema>;

export const CreateLeadSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Valid email required').optional().or(z.literal('')),
  phone: z.string().min(5, 'Valid phone required').optional().or(z.literal('')),
  status: z.enum(LEAD_STATUSES).default('new'),
  priority: z.enum(LEAD_PRIORITIES).default('medium'),
  source: z.string().default('website'),
  contactId: z.string().uuid().optional().or(z.literal('')),
  assignedToId: z.string().uuid().optional().or(z.literal('')),
  qualificationScore: z.number().int().min(0).max(100).default(50),
  intentSummary: z.string().max(500).optional().or(z.literal('')),
  estimatedBudgetMin: z.number().nonnegative().optional(),
  estimatedBudgetMax: z.number().nonnegative().optional(),
  currency: z.string().length(3).default('USD'),
  propertyPreferences: z.record(z.unknown()).default({}),
  notes: z.string().max(2000).optional().or(z.literal('')),
});

export type CreateLeadInput = z.infer<typeof CreateLeadSchema>;

export const UpdateLeadSchema = CreateLeadSchema.partial();
export type UpdateLeadInput = z.infer<typeof UpdateLeadSchema>;

export const UpdateLeadStatusSchema = z.object({
  leadId: z.string().uuid('Valid Lead ID is required'),
  status: z.enum(LEAD_STATUSES),
  reason: z.string().max(500).optional().or(z.literal('')),
});

export type UpdateLeadStatusInput = z.infer<typeof UpdateLeadStatusSchema>;

export const AssignLeadSchema = z.object({
  leadId: z.string().uuid('Valid Lead ID is required'),
  assignedToId: z.string().uuid('Valid Profile ID is required'),
});

export type AssignLeadInput = z.infer<typeof AssignLeadSchema>;

export const CreateTaskSchema = z.object({
  leadId: z.string().uuid().optional().or(z.literal('')),
  contactId: z.string().uuid().optional().or(z.literal('')),
  title: z.string().min(1, 'Task title is required').max(200),
  description: z.string().max(2000).optional().or(z.literal('')),
  taskType: z.enum(TASK_TYPES).default('follow_up'),
  status: z.enum(TASK_STATUSES).default('pending'),
  priority: z.enum(LEAD_PRIORITIES).default('medium'),
  dueDate: z.string().optional().or(z.literal('')),
  assignedToId: z.string().uuid().optional().or(z.literal('')),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

export const UpdateTaskStatusSchema = z.object({
  taskId: z.string().uuid('Valid Task ID is required'),
  status: z.enum(TASK_STATUSES),
});

export type UpdateTaskStatusInput = z.infer<typeof UpdateTaskStatusSchema>;

export const CreateActivityNoteSchema = z.object({
  leadId: z.string().uuid().optional().or(z.literal('')),
  contactId: z.string().uuid().optional().or(z.literal('')),
  type: z.enum(ACTIVITY_TYPES).default('note'),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Content is required').max(5000),
  metadata: z.record(z.unknown()).default({}),
});

export type CreateActivityNoteInput = z.infer<typeof CreateActivityNoteSchema>;
