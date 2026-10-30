import { z } from 'zod';
import { LEAD_STATUSES, LEAD_PRIORITIES } from '@estatepilot/shared';

export const CreateLeadSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Valid email required').optional().or(z.literal('')),
  phone: z.string().min(5, 'Valid phone required').optional().or(z.literal('')),
  status: z.enum(LEAD_STATUSES).default('new'),
  priority: z.enum(LEAD_PRIORITIES).default('medium'),
  source: z.string().default('direct_website'),
  assignedToId: z.string().uuid().optional(),
  estimatedBudget: z.number().positive().optional(),
  notes: z.string().optional(),
});

export type CreateLeadInput = z.infer<typeof CreateLeadSchema>;

export const UpdateLeadStatusSchema = z.object({
  leadId: z.string().uuid(),
  status: z.enum(LEAD_STATUSES),
  reason: z.string().optional(),
});

export type UpdateLeadStatusInput = z.infer<typeof UpdateLeadStatusSchema>;
