import { TenantContext } from '@estatepilot/shared';
import { hasPermission } from '@estatepilot/permissions';

/**
 * Validates permission requirements on a resolved tenant context
 */
export function requirePermission(
  ctx: TenantContext,
  requiredPermission: string
): void {
  const allowed = hasPermission(
    {
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      roleCode: ctx.roleCode,
      userPermissions: ctx.permissions,
      branchId: ctx.branchId,
    },
    requiredPermission
  );

  if (!allowed) {
    throw new Error(
      `Forbidden: Required permission [${requiredPermission}] is not granted to role [${ctx.roleCode}].`
    );
  }
}
