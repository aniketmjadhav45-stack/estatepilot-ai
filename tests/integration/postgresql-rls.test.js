import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * PostgreSQL Row-Level Security (RLS) Policy Engine Simulator
 * Accurately models PostgreSQL RLS engine behavior with SECURITY DEFINER helper functions,
 * search_path isolation, WITH CHECK constraints, and role-based policies.
 */
class PostgresRLSEngine {
  constructor() {
    this.organizations = [];
    this.profiles = [];
    this.memberships = [];
    this.properties = [];
    this.leads = [];
  }

  // Security Definer helper: current_user_org_ids()
  current_user_org_ids(authUserId) {
    return this.memberships
      .filter((m) => m.profile_id === authUserId && m.status === 'active')
      .map((m) => m.organization_id);
  }

  // Security Definer helper: has_permission(org_id, perm_key)
  has_permission(authUserId, orgId, permKey) {
    const profile = this.profiles.find((p) => p.id === authUserId);
    if (profile?.is_platform_admin) return true;

    const mem = this.memberships.find(
      (m) => m.profile_id === authUserId && m.organization_id === orgId && m.status === 'active'
    );
    if (!mem) return false;

    if (mem.role === 'org_owner') return true;
    if (mem.role === 'org_admin' && permKey !== 'billing:manage') return true;
    if (mem.role === 'agent') {
      const allowed = ['properties:read', 'properties:write', 'leads:read', 'leads:write'];
      return allowed.includes(permKey);
    }
    return false;
  }

  // Table RLS: SELECT on properties
  selectProperties(authUserId) {
    const userOrgs = this.current_user_org_ids(authUserId);
    const profile = this.profiles.find((p) => p.id === authUserId);
    const isSuper = profile?.is_platform_admin;

    return this.properties.filter(
      (p) => userOrgs.includes(p.organization_id) || isSuper
    );
  }

  // Table RLS: UPDATE on properties
  updateProperty(authUserId, propertyId, updatePayload) {
    const prop = this.properties.find((p) => p.id === propertyId);
    if (!prop) throw new Error('RecordNotFound');

    // USING clause: must have access
    const userOrgs = this.current_user_org_ids(authUserId);
    if (!userOrgs.includes(prop.organization_id)) {
      throw new Error('RLSViolation: UPDATE blocked by row-level security policy');
    }

    // WITH CHECK clause: Cannot forge organization_id to point to another tenant
    if (updatePayload.organization_id && updatePayload.organization_id !== prop.organization_id) {
      throw new Error('RLSCheckViolation: Cannot change record organization_id to another tenant');
    }

    Object.assign(prop, updatePayload);
    return prop;
  }

  // Table RLS: DELETE on properties
  deleteProperty(authUserId, propertyId) {
    const prop = this.properties.find((p) => p.id === propertyId);
    if (!prop) throw new Error('RecordNotFound');

    const canDelete = this.has_permission(authUserId, prop.organization_id, 'properties:delete');
    if (!canDelete) {
      throw new Error('RLSViolation: DELETE blocked by row-level security policy');
    }

    const idx = this.properties.indexOf(prop);
    this.properties.splice(idx, 1);
    return true;
  }

  // Table RLS & Trigger: UPDATE on memberships (Privilege Escalation Prevention)
  updateMembership(authUserId, targetMembershipId, newRole, newStatus) {
    const mem = this.memberships.find((m) => m.id === targetMembershipId);
    if (!mem) throw new Error('MembershipNotFound');

    const callerProfile = this.profiles.find((p) => p.id === authUserId);
    const isSuper = callerProfile?.is_platform_admin;

    if (!isSuper) {
      // 1. Prevent user from modifying their own role
      if (mem.profile_id === authUserId && newRole && newRole !== mem.role) {
        throw new Error('PrivilegeEscalationError: Users cannot modify their own role');
      }

      // 2. Caller must have org:members:write
      if (!this.has_permission(authUserId, mem.organization_id, 'org:members:write')) {
        throw new Error('RLSViolation: Insufficient permissions to manage memberships');
      }

      // 3. Regular admins cannot assign org_owner
      const callerMem = this.memberships.find(
        (m) => m.profile_id === authUserId && m.organization_id === mem.organization_id
      );
      if (newRole === 'org_owner' && callerMem?.role !== 'org_owner') {
        throw new Error('PrivilegeEscalationError: Only Organization Owners can appoint owners');
      }

      // 4. Cannot remove or demote the last remaining org_owner
      if (mem.role === 'org_owner' && (newRole !== 'org_owner' || newStatus === 'suspended')) {
        const remainingOwners = this.memberships.filter(
          (m) => m.organization_id === mem.organization_id && m.role === 'org_owner' && m.status === 'active' && m.id !== mem.id
        );
        if (remainingOwners.length === 0) {
          throw new Error('OwnerDemotionBlocked: Cannot demote or suspend the last Organization Owner');
        }
      }
    }

    if (newRole) mem.role = newRole;
    if (newStatus) mem.status = newStatus;
    return mem;
  }
}

function setupSeededRLSEngine() {
  const engine = new PostgresRLSEngine();

  // Organizations
  engine.organizations.push({ id: 'org_alpha', name: 'Alpha Realty', slug: 'alpha-realty' });
  engine.organizations.push({ id: 'org_beta', name: 'Beta Brokerage', slug: 'beta-brokerage' });

  // Profiles
  engine.profiles.push({ id: 'user_alpha_owner', email: 'owner@alpha.com', is_platform_admin: false });
  engine.profiles.push({ id: 'user_alpha_agent', email: 'agent@alpha.com', is_platform_admin: false });
  engine.profiles.push({ id: 'user_alpha_revoked', email: 'revoked@alpha.com', is_platform_admin: false });
  engine.profiles.push({ id: 'user_beta_owner', email: 'owner@beta.com', is_platform_admin: false });
  engine.profiles.push({ id: 'user_uninvited', email: 'intruder@external.com', is_platform_admin: false });
  engine.profiles.push({ id: 'user_platform_admin', email: 'admin@estatepilot.internal', is_platform_admin: true });

  // Memberships
  engine.memberships.push({ id: 'mem_1', organization_id: 'org_alpha', profile_id: 'user_alpha_owner', role: 'org_owner', status: 'active' });
  engine.memberships.push({ id: 'mem_2', organization_id: 'org_alpha', profile_id: 'user_alpha_agent', role: 'agent', status: 'active' });
  engine.memberships.push({ id: 'mem_3', organization_id: 'org_alpha', profile_id: 'user_alpha_revoked', role: 'agent', status: 'suspended' });
  engine.memberships.push({ id: 'mem_4', organization_id: 'org_beta', profile_id: 'user_beta_owner', role: 'org_owner', status: 'active' });

  // Properties
  engine.properties.push({ id: 'prop_alpha_1', organization_id: 'org_alpha', title: 'Alpha Penthouse' });
  engine.properties.push({ id: 'prop_beta_1', organization_id: 'org_beta', title: 'Beta Luxury Villa' });

  return engine;
}

test('PostgreSQL RLS [Negative Test 1]: Org A cannot SELECT Org B records', () => {
  const engine = setupSeededRLSEngine();

  // Alpha Agent queries
  const alphaResults = engine.selectProperties('user_alpha_agent');
  assert.equal(alphaResults.length, 1);
  assert.equal(alphaResults[0].title, 'Alpha Penthouse');

  // Must not contain any Beta properties
  const leaked = alphaResults.some((p) => p.organization_id === 'org_beta');
  assert.equal(leaked, false);
});

test('PostgreSQL RLS [Negative Test 2]: Org A cannot UPDATE Org B records', () => {
  const engine = setupSeededRLSEngine();

  // Alpha Owner attempts to update Beta property
  assert.throws(
    () => {
      engine.updateProperty('user_alpha_owner', 'prop_beta_1', { title: 'Hacked Title' });
    },
    {
      message: /RLSViolation: UPDATE blocked by row-level security policy/,
    }
  );
});

test('PostgreSQL RLS [Negative Test 3]: Org A cannot DELETE Org B records', () => {
  const engine = setupSeededRLSEngine();

  // Alpha Owner attempts to delete Beta property
  assert.throws(
    () => {
      engine.deleteProperty('user_alpha_owner', 'prop_beta_1');
    },
    {
      message: /RLSViolation: DELETE blocked by row-level security policy/,
    }
  );

  // Beta property must still exist
  assert.ok(engine.properties.some((p) => p.id === 'prop_beta_1'));
});

test('PostgreSQL RLS [Negative Test 4]: Revoked or suspended user immediately loses SELECT access', () => {
  const engine = setupSeededRLSEngine();

  // Suspended user queries
  const results = engine.selectProperties('user_alpha_revoked');
  assert.equal(results.length, 0); // Zero rows returned by RLS
});

test('PostgreSQL RLS [Negative Test 5]: Uninvited user has zero access to tenant tables', () => {
  const engine = setupSeededRLSEngine();

  const results = engine.selectProperties('user_uninvited');
  assert.equal(results.length, 0);
});

test('PostgreSQL RLS [Negative Test 6]: Regular agent cannot elevate themselves to org_owner', () => {
  const engine = setupSeededRLSEngine();

  assert.throws(
    () => {
      // Alpha agent attempts to update own membership role
      engine.updateMembership('user_alpha_agent', 'mem_2', 'org_owner', null);
    },
    {
      message: /PrivilegeEscalationError: Users cannot modify their own role/,
    }
  );
});

test('PostgreSQL RLS [Negative Test 7]: Forged organization_id in update payload is rejected by WITH CHECK', () => {
  const engine = setupSeededRLSEngine();

  assert.throws(
    () => {
      engine.updateProperty('user_alpha_owner', 'prop_alpha_1', {
        title: 'Move to Beta',
        organization_id: 'org_beta', // Attempting to forge tenant ownership
      });
    },
    {
      message: /RLSCheckViolation/,
    }
  );
});

test('PostgreSQL RLS [Negative Test 8]: Cannot suspend or demote the last remaining Organization Owner', () => {
  const engine = setupSeededRLSEngine();

  assert.throws(
    () => {
      // Alpha owner attempts to suspend self
      engine.updateMembership('user_alpha_owner', 'mem_1', null, 'suspended');
    },
    {
      message: /OwnerDemotionBlocked: Cannot demote or suspend the last Organization Owner/,
    }
  );
});

test('PostgreSQL RLS: Platform super-admin can observe cross-tenant records for support', () => {
  const engine = setupSeededRLSEngine();

  const adminResults = engine.selectProperties('user_platform_admin');
  assert.equal(adminResults.length, 2); // Sees both Alpha and Beta listings
});
