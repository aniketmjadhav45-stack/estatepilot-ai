import test from 'node:test';
import assert from 'node:assert/strict';

export const PERMISSIONS = {
  ORG_SETTINGS_READ: 'org:settings:read',
  ORG_SETTINGS_WRITE: 'org:settings:write',
  ORG_MEMBERS_READ: 'org:members:read',
  ORG_MEMBERS_WRITE: 'org:members:write',
  PROPERTIES_READ: 'properties:read',
  PROPERTIES_WRITE: 'properties:write',
  PROPERTIES_PUBLISH: 'properties:publish',
  LEADS_READ: 'leads:read',
  LEADS_WRITE: 'leads:write',
  DEALS_READ: 'deals:read',
  DEALS_WRITE: 'deals:write',
  AI_INVOKE: 'ai:invoke',
  AI_APPROVE: 'ai:approve',
  BILLING_MANAGE: 'billing:manage',
};

export const ROLE_PERMISSIONS_MAP = {
  super_admin: Object.values(PERMISSIONS),
  org_owner: Object.values(PERMISSIONS),
  org_admin: Object.values(PERMISSIONS).filter((p) => p !== PERMISSIONS.BILLING_MANAGE),
  branch_manager: [
    PERMISSIONS.ORG_MEMBERS_READ,
    PERMISSIONS.PROPERTIES_READ,
    PERMISSIONS.PROPERTIES_WRITE,
    PERMISSIONS.PROPERTIES_PUBLISH,
    PERMISSIONS.LEADS_READ,
    PERMISSIONS.LEADS_WRITE,
    PERMISSIONS.DEALS_READ,
    PERMISSIONS.DEALS_WRITE,
    PERMISSIONS.AI_INVOKE,
    PERMISSIONS.AI_APPROVE,
  ],
  team_lead: [
    PERMISSIONS.PROPERTIES_READ,
    PERMISSIONS.PROPERTIES_WRITE,
    PERMISSIONS.LEADS_READ,
    PERMISSIONS.LEADS_WRITE,
    PERMISSIONS.DEALS_READ,
    PERMISSIONS.DEALS_WRITE,
    PERMISSIONS.AI_INVOKE,
    PERMISSIONS.AI_APPROVE,
  ],
  senior_agent: [
    PERMISSIONS.PROPERTIES_READ,
    PERMISSIONS.PROPERTIES_WRITE,
    PERMISSIONS.PROPERTIES_PUBLISH,
    PERMISSIONS.LEADS_READ,
    PERMISSIONS.LEADS_WRITE,
    PERMISSIONS.DEALS_READ,
    PERMISSIONS.DEALS_WRITE,
    PERMISSIONS.AI_INVOKE,
  ],
  agent: [
    PERMISSIONS.PROPERTIES_READ,
    PERMISSIONS.PROPERTIES_WRITE,
    PERMISSIONS.LEADS_READ,
    PERMISSIONS.LEADS_WRITE,
    PERMISSIONS.DEALS_READ,
    PERMISSIONS.DEALS_WRITE,
    PERMISSIONS.AI_INVOKE,
  ],
  support_staff: [
    PERMISSIONS.PROPERTIES_READ,
    PERMISSIONS.LEADS_READ,
  ],
};

function hasPermission(ctx, requiredPermission) {
  if (ctx.isPlatformAdmin || ctx.roleCode === 'super_admin') return true;
  if (ctx.userPermissions && ctx.userPermissions.includes(requiredPermission)) return true;
  const rolePerms = ROLE_PERMISSIONS_MAP[ctx.roleCode] || [];
  return rolePerms.includes(requiredPermission);
}

function requirePermission(ctx, requiredPermission) {
  if (!hasPermission(ctx, requiredPermission)) {
    throw new Error(
      `AccessDenied: Role [${ctx.roleCode}] lacks required permission [${requiredPermission}].`
    );
  }
}

function requireOrganizationMembership(ctx, targetOrgId) {
  if (ctx.isPlatformAdmin || ctx.roleCode === 'super_admin') return;
  if (!ctx.organizationId || ctx.organizationId !== targetOrgId) {
    throw new Error(
      `CrossTenantViolation: Active organization [${ctx.organizationId}] does not match target [${targetOrgId}].`
    );
  }
}

function requireActiveOrganization(ctx) {
  if (!ctx || !ctx.organizationId || !ctx.userId) {
    throw new Error(
      'UnauthorizedContext: No active organization context found. Please select or join an organization.'
    );
  }
  return ctx;
}

function requireBranchAccess(ctx, targetBranchId) {
  if (ctx.isPlatformAdmin || ctx.roleCode === 'super_admin' || ctx.roleCode === 'org_owner' || ctx.roleCode === 'org_admin') {
    return;
  }
  if (!targetBranchId) return;
  if (ctx.branchId && ctx.branchId !== targetBranchId) {
    throw new Error(
      `BranchAccessDenied: User assigned to branch [${ctx.branchId}] cannot access branch [${targetBranchId}].`
    );
  }
}

function requireTeamAccess(ctx, targetTeamId) {
  if (ctx.isPlatformAdmin || ctx.roleCode === 'super_admin' || ctx.roleCode === 'org_owner' || ctx.roleCode === 'org_admin') {
    return;
  }
  if (ctx.teamIds && !ctx.teamIds.includes(targetTeamId)) {
    throw new Error(
      `TeamAccessDenied: User does not belong to team [${targetTeamId}].`
    );
  }
}

test('RBAC: All 8 core roles are defined in permission matrix', () => {
  const expectedRoles = [
    'super_admin',
    'org_owner',
    'org_admin',
    'branch_manager',
    'team_lead',
    'senior_agent',
    'agent',
    'support_staff',
  ];

  for (const role of expectedRoles) {
    assert.ok(ROLE_PERMISSIONS_MAP[role], `Role [${role}] must have mapped permissions`);
    assert.ok(Array.isArray(ROLE_PERMISSIONS_MAP[role]), `Permissions for [${role}] must be an array`);
  }
});

test('RBAC: Org Owner has full administrative permissions including billing:manage', () => {
  const ctx = {
    userId: 'u1',
    organizationId: 'org1',
    roleCode: 'org_owner',
  };

  assert.equal(hasPermission(ctx, PERMISSIONS.BILLING_MANAGE), true);
  assert.equal(hasPermission(ctx, PERMISSIONS.PROPERTIES_PUBLISH), true);
  assert.equal(hasPermission(ctx, PERMISSIONS.ORG_SETTINGS_WRITE), true);
  assert.equal(hasPermission(ctx, PERMISSIONS.AI_APPROVE), true);
});

test('RBAC: Org Admin has administrative permissions but cannot manage billing', () => {
  const ctx = {
    userId: 'u2',
    organizationId: 'org1',
    roleCode: 'org_admin',
  };

  assert.equal(hasPermission(ctx, PERMISSIONS.BILLING_MANAGE), false);
  assert.equal(hasPermission(ctx, PERMISSIONS.PROPERTIES_PUBLISH), true);
  assert.equal(hasPermission(ctx, PERMISSIONS.ORG_MEMBERS_WRITE), true);
});

test('RBAC: Standard Agent has operational permissions but lacks admin & publish capabilities', () => {
  const ctx = {
    userId: 'u3',
    organizationId: 'org1',
    roleCode: 'agent',
  };

  assert.equal(hasPermission(ctx, PERMISSIONS.PROPERTIES_READ), true);
  assert.equal(hasPermission(ctx, PERMISSIONS.PROPERTIES_WRITE), true);
  assert.equal(hasPermission(ctx, PERMISSIONS.LEADS_READ), true);
  assert.equal(hasPermission(ctx, PERMISSIONS.PROPERTIES_PUBLISH), false);
  assert.equal(hasPermission(ctx, PERMISSIONS.ORG_MEMBERS_WRITE), false);
  assert.equal(hasPermission(ctx, PERMISSIONS.AI_APPROVE), false);
});

test('RBAC: requirePermission throws AccessDenied when permission is missing', () => {
  const ctx = {
    userId: 'u3',
    organizationId: 'org1',
    roleCode: 'agent',
  };

  assert.throws(
    () => {
      requirePermission(ctx, PERMISSIONS.BILLING_MANAGE);
    },
    {
      message: /AccessDenied: Role \[agent\] lacks required permission \[billing:manage\]/,
    }
  );

  // Does not throw for valid permission
  assert.doesNotThrow(() => {
    requirePermission(ctx, PERMISSIONS.PROPERTIES_READ);
  });
});

test('RBAC: requireOrganizationMembership prevents cross-tenant access', () => {
  const ctx = {
    userId: 'u1',
    organizationId: 'org_alpha',
    roleCode: 'agent',
  };

  assert.doesNotThrow(() => {
    requireOrganizationMembership(ctx, 'org_alpha');
  });

  assert.throws(
    () => {
      requireOrganizationMembership(ctx, 'org_beta');
    },
    {
      message: /CrossTenantViolation/,
    }
  );
});

test('RBAC: requireActiveOrganization enforces non-null context', () => {
  assert.throws(() => requireActiveOrganization(null), {
    message: /UnauthorizedContext/,
  });
  assert.throws(() => requireActiveOrganization({ userId: 'u1' }), {
    message: /UnauthorizedContext/,
  });

  const valid = { userId: 'u1', organizationId: 'org1', roleCode: 'agent' };
  assert.equal(requireActiveOrganization(valid), valid);
});

test('RBAC: requireBranchAccess enforces branch boundaries for standard agents', () => {
  const agentCtx = {
    userId: 'u1',
    organizationId: 'org1',
    roleCode: 'branch_manager',
    branchId: 'branch_downtown',
  };

  // Same branch allowed
  assert.doesNotThrow(() => requireBranchAccess(agentCtx, 'branch_downtown'));

  // Different branch rejected
  assert.throws(() => requireBranchAccess(agentCtx, 'branch_brooklyn'), {
    message: /BranchAccessDenied/,
  });

  // Org owner has universal branch access
  const ownerCtx = {
    userId: 'u2',
    organizationId: 'org1',
    roleCode: 'org_owner',
    branchId: 'branch_downtown',
  };
  assert.doesNotThrow(() => requireBranchAccess(ownerCtx, 'branch_brooklyn'));
});

test('RBAC: requireTeamAccess enforces team boundaries', () => {
  const ctx = {
    userId: 'u1',
    organizationId: 'org1',
    roleCode: 'agent',
    teamIds: ['team_luxury_sales'],
  };

  assert.doesNotThrow(() => requireTeamAccess(ctx, 'team_luxury_sales'));
  assert.throws(() => requireTeamAccess(ctx, 'team_commercial'), {
    message: /TeamAccessDenied/,
  });
});
