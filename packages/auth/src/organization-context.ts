import { TenantContext, Result, ok, err } from '@estatepilot/shared';
import { TypedSupabaseClient } from '@estatepilot/database';

export const ACTIVE_ORG_COOKIE = 'estatepilot_active_org';

export interface UserOrganizationMembership {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  orgType: 'individual' | 'agency' | 'enterprise';
  roleCode: string;
  roleName: string;
  isDefault: boolean;
  status: 'active' | 'invited' | 'suspended';
  branchId?: string | null;
}

/**
 * Lists all active organizations accessible to a user
 */
export async function listUserOrganizations(
  client: TypedSupabaseClient,
  userId: string
): Promise<Result<UserOrganizationMembership[], Error>> {
  try {
    const { data, error } = await client
      .from('memberships')
      .select(`
        organization_id,
        status,
        is_default,
        branch_id,
        organizations (id, name, slug, org_type),
        roles (code, name)
      `)
      .eq('profile_id', userId)
      .eq('status', 'active');

    if (error) {
      return err(new Error(`Failed to list organizations: ${error.message}`));
    }

    if (!data) {
      return ok([]);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const list: UserOrganizationMembership[] = data.map((m: any) => ({
      organizationId: m.organization_id,
      organizationName: m.organizations?.name || 'Unnamed Organization',
      organizationSlug: m.organizations?.slug || '',
      orgType: m.organizations?.org_type || 'individual',
      roleCode: m.roles?.code || 'agent',
      roleName: m.roles?.name || 'Agent',
      isDefault: m.is_default || false,
      status: m.status,
      branchId: m.branch_id,
    }));

    return ok(list);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Resolves and strictly validates that the requesting user is an active member
 * of the target organization. Falls back to default organization if requested is invalid.
 */
export async function resolveVerifiedTenantContext(
  client: TypedSupabaseClient,
  userId: string,
  preferredOrgId?: string | null
): Promise<Result<TenantContext, Error>> {
  try {
    const orgsResult = await listUserOrganizations(client, userId);
    if (!orgsResult.ok) {
      return err(orgsResult.error);
    }

    const memberships = orgsResult.value;
    if (memberships.length === 0) {
      return err(new Error('NoActiveOrganization: User does not belong to any active organization.'));
    }

    // Look for preferred organization first
    let active = preferredOrgId
      ? memberships.find((m) => m.organizationId === preferredOrgId)
      : null;

    // Fallback to default or first active membership
    if (!active) {
      active = memberships.find((m) => m.isDefault) || memberships[0];
    }

    // Fetch granular permissions mapped to role
    const { data: rolePermissions } = await client
      .from('role_permissions')
      .select('permissions(key)')
      .eq('roles.code', active.roleCode);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const perms: string[] = (rolePermissions || [])
      .map((rp: any) => rp.permissions?.key)
      .filter(Boolean);

    return ok({
      organizationId: active.organizationId,
      userId,
      roleCode: active.roleCode,
      permissions: perms,
      branchId: active.branchId,
    });
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Atomically creates an organization and assigns the caller as Owner
 */
export async function createOrganizationWithOwner(
  client: TypedSupabaseClient,
  params: {
    name: string;
    slug: string;
    orgType: 'individual' | 'agency' | 'enterprise';
    defaultCurrency?: string;
    defaultTimezone?: string;
    userId: string;
  }
): Promise<Result<{ organizationId: string; slug: string; name: string }, Error>> {
  try {
    const { data, error } = await client.rpc('create_organization_with_owner', {
      p_name: params.name,
      p_slug: params.slug.toLowerCase(),
      p_org_type: params.orgType,
      p_currency: params.defaultCurrency || 'USD',
      p_timezone: params.defaultTimezone || 'UTC',
      p_profile_id: params.userId,
    });

    if (error) {
      return err(new Error(`Failed to create organization: ${error.message}`));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = data as any;
    return ok({
      organizationId: res.organization_id,
      slug: res.slug,
      name: res.name,
    });
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Validates whether switching to a requested organization is authorized
 */
export async function validateOrganizationSwitch(
  client: TypedSupabaseClient,
  userId: string,
  targetOrgId: string
): Promise<Result<UserOrganizationMembership, Error>> {
  try {
    const orgsResult = await listUserOrganizations(client, userId);
    if (!orgsResult.ok) {
      return err(orgsResult.error);
    }

    const membership = orgsResult.value.find((m) => m.organizationId === targetOrgId);
    if (!membership) {
      return err(
        new Error(`UnauthorizedSwitch: User is not an active member of organization [${targetOrgId}].`)
      );
    }

    if (membership.status !== 'active') {
      return err(
        new Error(`MembershipSuspended: Your membership in this organization is ${membership.status}.`)
      );
    }

    return ok(membership);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}
