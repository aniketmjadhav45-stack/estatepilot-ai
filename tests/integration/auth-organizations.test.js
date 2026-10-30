import test from 'node:test';
import assert from 'node:assert/strict';

function sanitizeAuditDiff(diff) {
  if (!diff) return {};
  const sanitized = { ...diff };
  const sensitiveKeys = ['password', 'token', 'rawToken', 'secret', 'accessToken', 'refreshToken', 'tokenHash'];

  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    }
  }
  return sanitized;
}

class MockAuthDatabase {
  constructor() {
    this.organizations = [];
    this.profiles = [];
    this.memberships = [];
    this.auditLogs = [];
  }

  // Simulates stored procedure create_organization_with_owner
  createOrganizationWithOwner({ name, slug, orgType, currency = 'USD', timezone = 'UTC', userId }) {
    if (!name || name.length < 2) throw new Error('Invalid name');
    if (!/^[a-z0-9-]+$/.test(slug)) throw new Error('Invalid slug format');
    if (this.organizations.some((o) => o.slug === slug)) {
      throw new Error(`Organization slug "${slug}" already exists`);
    }

    const orgId = `org_${this.organizations.length + 1}`;
    const org = { id: orgId, name, slug, orgType, currency, timezone };
    this.organizations.push(org);

    const memId = `mem_${this.memberships.length + 1}`;
    const isFirstMembership = !this.memberships.some((m) => m.userId === userId && m.status === 'active');
    const membership = {
      id: memId,
      organizationId: orgId,
      userId,
      roleCode: 'org_owner',
      status: 'active',
      isDefault: isFirstMembership,
    };
    this.memberships.push(membership);

    this.auditLogs.push({
      organizationId: orgId,
      userId,
      action: 'organization.created',
      diff: { name, slug, orgType },
    });

    return { organizationId: orgId, membershipId: memId, slug };
  }

  // Simulates organization switching
  switchOrganization(userId, targetOrgId) {
    const mem = this.memberships.find(
      (m) => m.userId === userId && m.organizationId === targetOrgId
    );

    if (!mem) {
      throw new Error(`UnauthorizedSwitch: User does not belong to ${targetOrgId}`);
    }

    if (mem.status !== 'active') {
      throw new Error(`MembershipSuspended: Status is ${mem.status}`);
    }

    this.auditLogs.push({
      organizationId: targetOrgId,
      userId,
      action: 'organization.switched',
    });

    return { activeOrgId: targetOrgId, roleCode: mem.roleCode };
  }

  // Revoke membership
  revokeMembership(userId, orgId) {
    const mem = this.memberships.find(
      (m) => m.userId === userId && m.organizationId === orgId
    );
    if (mem) {
      mem.status = 'suspended';
    }
  }
}

test('Organization Onboarding: Atomically creates organization and owner membership', () => {
  const db = new MockAuthDatabase();
  const res = db.createOrganizationWithOwner({
    name: 'Apex Premier Realty',
    slug: 'apex-premier',
    orgType: 'agency',
    userId: 'user_alex',
  });

  assert.ok(res.organizationId);
  assert.equal(res.slug, 'apex-premier');

  // Verify membership exists with owner role
  const mem = db.memberships.find((m) => m.organizationId === res.organizationId);
  assert.ok(mem);
  assert.equal(mem.userId, 'user_alex');
  assert.equal(mem.roleCode, 'org_owner');
  assert.equal(mem.status, 'active');
  assert.equal(mem.isDefault, true);

  // Verify audit log
  assert.equal(db.auditLogs.length, 1);
  assert.equal(db.auditLogs[0].action, 'organization.created');
});

test('Organization Onboarding [Negative Test]: Prevents duplicate slug creation', () => {
  const db = new MockAuthDatabase();
  db.createOrganizationWithOwner({
    name: 'Apex Premier',
    slug: 'apex-premier',
    orgType: 'agency',
    userId: 'user_alex',
  });

  assert.throws(
    () => {
      db.createOrganizationWithOwner({
        name: 'Another Apex',
        slug: 'apex-premier',
        orgType: 'individual',
        userId: 'user_other',
      });
    },
    {
      message: /already exists/,
    }
  );
});

test('Organization Switching: Allows user belonging to multiple organizations to switch context', () => {
  const db = new MockAuthDatabase();
  // User creates Org A
  const orgA = db.createOrganizationWithOwner({
    name: 'Org Alpha',
    slug: 'org-alpha',
    orgType: 'agency',
    userId: 'user_alex',
  });

  // User creates Org B
  const orgB = db.createOrganizationWithOwner({
    name: 'Org Beta',
    slug: 'org-beta',
    orgType: 'individual',
    userId: 'user_alex',
  });

  // Switch to Org B
  const switched = db.switchOrganization('user_alex', orgB.organizationId);
  assert.equal(switched.activeOrgId, orgB.organizationId);
  assert.equal(switched.roleCode, 'org_owner');
});

test('Organization Switching [Negative Test]: Denies switching to revoked or suspended organization', () => {
  const db = new MockAuthDatabase();
  const orgA = db.createOrganizationWithOwner({
    name: 'Org Alpha',
    slug: 'org-alpha',
    orgType: 'agency',
    userId: 'user_alex',
  });

  // Revoke membership
  db.revokeMembership('user_alex', orgA.organizationId);

  assert.throws(
    () => {
      db.switchOrganization('user_alex', orgA.organizationId);
    },
    {
      message: /MembershipSuspended/,
    }
  );
});

test('Audit Logging: Redacts passwords and tokens from audit payloads', () => {
  const rawDiff = {
    email: 'agent@brokerage.com',
    password: 'SuperSecretPassword123!',
    rawToken: 'abcdef1234567890',
    accessToken: 'jwt.token.here',
    branch: 'Downtown',
  };

  const clean = sanitizeAuditDiff(rawDiff);

  assert.equal(clean.email, 'agent@brokerage.com');
  assert.equal(clean.branch, 'Downtown');
  assert.equal(clean.password, '[REDACTED]');
  assert.equal(clean.rawToken, '[REDACTED]');
  assert.equal(clean.accessToken, '[REDACTED]');
});
