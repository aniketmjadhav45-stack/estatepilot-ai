import { z } from 'zod';

export const CreateOrganizationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(150),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase letters, numbers, and hyphens'),
  orgType: z.enum(['individual', 'agency', 'enterprise']).default('individual'),
  defaultCurrency: z.string().length(3).default('USD'),
  defaultTimezone: z.string().default('UTC'),
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

export type CreateOrganizationInput = z.infer<typeof CreateOrganizationSchema>;

export const UpdateOrganizationSchema = CreateOrganizationSchema.partial();
export type UpdateOrganizationInput = z.infer<typeof UpdateOrganizationSchema>;

export const CreateInvitationSchema = z.object({
  email: z.string().email('Please enter a valid email address').toLowerCase(),
  roleCode: z.enum([
    'org_admin',
    'branch_manager',
    'team_lead',
    'senior_agent',
    'agent',
    'support_staff'
  ]),
  branchId: z.string().uuid().optional().nullable(),
  expiresInHours: z.number().int().min(1).max(720).default(168), // Up to 30 days
});

export type CreateInvitationInput = z.infer<typeof CreateInvitationSchema>;

export const AcceptInvitationSchema = z.object({
  token: z.string().min(10, 'Invitation token is required'),
});

export type AcceptInvitationInput = z.infer<typeof AcceptInvitationSchema>;

export const SwitchOrganizationSchema = z.object({
  organizationId: z.string().uuid('Valid organization ID is required'),
});

export type SwitchOrganizationInput = z.infer<typeof SwitchOrganizationSchema>;
