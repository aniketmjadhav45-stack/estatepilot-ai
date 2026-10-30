import { ROLE_PERMISSIONS_MAP } from './permissions';

export interface EvaluationContext {
  userId: string;
  roleCode: string;
  organizationId: string;
  userPermissions?: string[];
  isPlatformAdmin?: boolean;
  branchId?: string | null;
  teamIds?: string[];
}

/**
 * Evaluates whether an acting user has the required permission
 */
export function hasPermission(
  ctx: EvaluationContext,
  requiredPermission: string
): boolean {
  if (ctx.isPlatformAdmin || ctx.roleCode === 'super_admin') {
    return true;
  }

  // Check explicit assigned permissions first if provided
  if (ctx.userPermissions && ctx.userPermissions.length > 0) {
    if (ctx.userPermissions.includes(requiredPermission)) {
      return true;
    }
  }

  // Role-based lookup
  const rolePerms = ROLE_PERMISSIONS_MAP[ctx.roleCode] || [];
  return rolePerms.includes(requiredPermission);
}

/**
 * Throws an authorization error if the acting user lacks the required permission
 */
export function requirePermission(
  ctx: EvaluationContext,
  requiredPermission: string
): void {
  if (!hasPermission(ctx, requiredPermission)) {
    throw new Error(
      `AccessDenied: Role [${ctx.roleCode}] lacks required permission [${requiredPermission}].`
    );
  }
}

/**
 * Validates that the active context matches the target organization
 */
export function requireOrganizationMembership(
  ctx: EvaluationContext,
  targetOrganizationId: string
): void {
  if (ctx.isPlatformAdmin || ctx.roleCode === 'super_admin') {
    return;
  }

  if (!ctx.organizationId || ctx.organizationId !== targetOrganizationId) {
    throw new Error(
      `CrossTenantViolation: Active organization [${ctx.organizationId}] does not match target [${targetOrganizationId}].`
    );
  }
}

/**
 * Enforces that a valid, active organization context is present
 */
export function requireActiveOrganization(
  ctx: Partial<EvaluationContext> | null | undefined
): EvaluationContext {
  if (!ctx || !ctx.organizationId || !ctx.userId) {
    throw new Error(
      'UnauthorizedContext: No active organization context found. Please select or join an organization.'
    );
  }
  return ctx as EvaluationContext;
}

/**
 * Validates branch access for multi-branch organizations
 */
export function requireBranchAccess(
  ctx: EvaluationContext,
  targetBranchId?: string | null
): void {
  if (ctx.isPlatformAdmin || ctx.roleCode === 'super_admin' || ctx.roleCode === 'org_owner' || ctx.roleCode === 'org_admin') {
    // Org owners and platform admins have cross-branch visibility
    return;
  }

  if (!targetBranchId) {
    return;
  }

  if (ctx.branchId && ctx.branchId !== targetBranchId) {
    throw new Error(
      `BranchAccessDenied: User assigned to branch [${ctx.branchId}] cannot access branch [${targetBranchId}].`
    );
  }
}

/**
 * Validates team access within a branch or organization
 */
export function requireTeamAccess(
  ctx: EvaluationContext,
  targetTeamId: string
): void {
  if (ctx.isPlatformAdmin || ctx.roleCode === 'super_admin' || ctx.roleCode === 'org_owner' || ctx.roleCode === 'org_admin') {
    return;
  }

  if (ctx.teamIds && !ctx.teamIds.includes(targetTeamId)) {
    throw new Error(
      `TeamAccessDenied: User does not belong to team [${targetTeamId}].`
    );
  }
}

/**
 * Evaluates whether an acting user has all required permissions
 */
export function hasAllPermissions(
  ctx: EvaluationContext,
  requiredPermissions: string[]
): boolean {
  return requiredPermissions.every((perm) => hasPermission(ctx, perm));
}

/**
 * Evaluates whether an acting user has at least one of the specified permissions
 */
export function hasAnyPermission(
  ctx: EvaluationContext,
  requiredPermissions: string[]
): boolean {
  return requiredPermissions.some((perm) => hasPermission(ctx, perm));
}
