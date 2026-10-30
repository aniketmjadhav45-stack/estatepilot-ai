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
