import test from 'node:test';
import assert from 'node:assert/strict';

// Core RBAC permission evaluation logic
const PERMISSIONS = {
  ORG_SETTINGS_WRITE: 'org:settings:write',
  PROPERTIES_READ: 'properties:read',
  PROPERTIES_WRITE: 'properties:write',
  PROPERTIES_PUBLISH: 'properties:publish',
  LEADS_READ: 'leads:read',
  LEADS_WRITE: 'leads:write',
  DEALS_WRITE: 'deals:write',
  AI_INVOKE: 'ai:invoke',
  AI_APPROVE: 'ai:approve',
  BILLING_MANAGE: 'billing:manage',
};

const ROLE_PERMISSIONS_MAP = {
  super_admin: Object.values(PERMISSIONS),
  org_owner: Object.values(PERMISSIONS),
  org_admin: Object.values(PERMISSIONS).filter((p) => p !== PERMISSIONS.BILLING_MANAGE),
  agent: [
    PERMISSIONS.PROPERTIES_READ,
    PERMISSIONS.PROPERTIES_WRITE,
    PERMISSIONS.LEADS_READ,
    PERMISSIONS.LEADS_WRITE,
    PERMISSIONS.DEALS_WRITE,
    PERMISSIONS.AI_INVOKE,
  ],
};

function hasPermission(ctx, requiredPermission) {
  if (ctx.isPlatformAdmin || ctx.roleCode === 'super_admin') {
    return true;
  }
  const rolePerms = ROLE_PERMISSIONS_MAP[ctx.roleCode] || [];
  return rolePerms.includes(requiredPermission);
}

test('Permissions: Super Admin has platform-wide universal permissions', () => {
  const ctx = { roleCode: 'super_admin', isPlatformAdmin: true };
  assert.equal(hasPermission(ctx, PERMISSIONS.BILLING_MANAGE), true);
  assert.equal(hasPermission(ctx, PERMISSIONS.ORG_SETTINGS_WRITE), true);
  assert.equal(hasPermission(ctx, 'arbitrary:permission:key'), true);
});

test('Permissions: Org Owner has billing manage permission', () => {
  const ctx = { roleCode: 'org_owner', isPlatformAdmin: false };
  assert.equal(hasPermission(ctx, PERMISSIONS.BILLING_MANAGE), true);
  assert.equal(hasPermission(ctx, PERMISSIONS.PROPERTIES_PUBLISH), true);
});

test('Permissions: Org Admin cannot manage billing but can manage properties', () => {
  const ctx = { roleCode: 'org_admin', isPlatformAdmin: false };
  assert.equal(hasPermission(ctx, PERMISSIONS.BILLING_MANAGE), false);
  assert.equal(hasPermission(ctx, PERMISSIONS.PROPERTIES_WRITE), true);
});

test('Permissions: Agent cannot publish property directly or approve AI actions', () => {
  const ctx = { roleCode: 'agent', isPlatformAdmin: false };
  assert.equal(hasPermission(ctx, PERMISSIONS.PROPERTIES_READ), true);
  assert.equal(hasPermission(ctx, PERMISSIONS.PROPERTIES_WRITE), true);
  assert.equal(hasPermission(ctx, PERMISSIONS.PROPERTIES_PUBLISH), false);
  assert.equal(hasPermission(ctx, PERMISSIONS.AI_APPROVE), false);
});
