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
      roleCode: ctx.roleCode,
      userPermissions: ctx.permissions,
    },
    requiredPermission
  );

  if (!allowed) {
    throw new Error(
      `Forbidden: Required permission [${requiredPermission}] is not granted to role [${ctx.roleCode}].`
    );
  }
}
