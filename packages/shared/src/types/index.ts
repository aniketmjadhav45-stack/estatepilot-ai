import {
  CurrencyCode,
  AreaUnitCode,
  PropertyType,
  ListingType,
  PropertyStatus,
  LeadStatus,
  LeadPriority,
  DealStatus,
  OrgType,
  MembershipStatus,
} from '../constants';

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface TenantScopedEntity extends BaseEntity {
  organizationId: string;
}

export interface UserProfile extends BaseEntity {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  timeZone: string;
  locale: string;
  isPlatformAdmin: boolean;
}

export interface Organization extends BaseEntity {
  name: string;
  slug: string;
  orgType: OrgType;
  defaultCurrency: CurrencyCode;
  defaultTimezone: string;
  logoUrl?: string | null;
  website?: string | null;
  settings: Record<string, unknown>;
}

export interface Branch extends TenantScopedEntity {
  name: string;
  code?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  isHeadquarters: boolean;
}

export interface Team extends TenantScopedEntity {
  branchId?: string | null;
  name: string;
  description?: string | null;
}

export interface Membership extends TenantScopedEntity {
  profileId: string;
  roleId: string;
  branchId?: string | null;
  status: MembershipStatus;
  isDefault: boolean;
  invitedBy?: string | null;
  profile?: UserProfile;
  role?: Role;
}

export interface Role {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isSystemRole: boolean;
}

export interface Permission {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  module: string;
}

export interface TenantContext {
  organizationId: string;
  userId: string;
  roleCode: string;
  permissions: string[];
  branchId?: string | null;
}

// ------------------------------------------------------------------------------
// CRM Module Interfaces (Phase 2)
// ------------------------------------------------------------------------------

export type ContactType = 'client' | 'buyer' | 'seller' | 'renter' | 'landlord' | 'agent' | 'investor' | 'other';

export interface Contact extends TenantScopedEntity {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  type: ContactType;
  address?: Record<string, unknown>;
  tags: string[];
  assignedToId?: string | null;
  assignedTo?: UserProfile;
}

export type CrmTaskType = 'call' | 'email' | 'visit' | 'meeting' | 'follow_up' | 'task' | 'review';
export type CrmTaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface CrmTask extends TenantScopedEntity {
  leadId?: string | null;
  contactId?: string | null;
  title: string;
  description?: string | null;
  taskType: CrmTaskType;
  status: CrmTaskStatus;
  priority: LeadPriority;
  dueDate?: string | null;
  completedAt?: string | null;
  assignedToId?: string | null;
  createdById?: string | null;
  assignedTo?: UserProfile;
}

export type CrmActivityType =
  | 'note'
  | 'call_logged'
  | 'email_sent'
  | 'status_change'
  | 'stage_moved'
  | 'task_completed'
  | 'visit_scheduled'
  | 'ai_interaction';

export interface CrmActivity {
  id: string;
  organizationId: string;
  leadId?: string | null;
  contactId?: string | null;
  type: CrmActivityType;
  title: string;
  description?: string | null;
  metadata?: Record<string, unknown>;
  createdById?: string | null;
  createdAt: string;
  createdBy?: UserProfile;
}

export interface Lead extends TenantScopedEntity {
  contactId?: string | null;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  status: LeadStatus;
  priority: LeadPriority;
  source: string;
  qualificationScore: number;
  intentSummary?: string | null;
  estimatedBudgetMin?: number | null;
  estimatedBudgetMax?: number | null;
  currency: string;
  propertyPreferences?: Record<string, unknown>;
  assignedToId?: string | null;
  branchId?: string | null;
  lastContactedAt?: string | null;
  assignedTo?: UserProfile;
  contact?: Contact;
  tasks?: CrmTask[];
  recentActivities?: CrmActivity[];
}

export interface CrmPipelineStageMetric {
  stage: LeadStatus;
  label: string;
  count: number;
  totalValue: number;
  percentage: number;
}

export interface CrmSourceMetric {
  source: string;
  label: string;
  count: number;
  percentage: number;
}

export interface CrmDashboardStats {
  totalLeads: number;
  newLeads: number;
  qualifiedLeads: number;
  activeDeals: number;
  followUpsDue: number;
  pipelineOverview: CrmPipelineStageMetric[];
  sourceBreakdown: CrmSourceMetric[];
  recentActivities: CrmActivity[];
}
