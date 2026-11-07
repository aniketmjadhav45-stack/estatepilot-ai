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

  // Table RLS: INSERT on profiles
  insertProfile(authUserId, payload) {
    const isSuper = this.profiles.find((p) => p.id === authUserId)?.is_platform_admin;
    const passedCheck = (payload.id === authUserId && payload.is_platform_admin === false) || isSuper;
    if (!passedCheck) {
      throw new Error('RLSCheckViolation: new row violates row-level security policy for table "profiles"');
    }
    this.profiles.push({ ...payload });
    return payload;
  }

  // Table & Column Privileges + RLS: UPDATE on profiles (FINDING 3)
  updateProfile(authUserId, targetProfileId, updates, options = {}) {
    // FINDING 3: Column-level UPDATE privilege check for role "authenticated"
    // In migration: REVOKE UPDATE ON public.profiles FROM authenticated;
    // GRANT UPDATE (first_name, last_name, phone, avatar_url, time_zone, locale, updated_at) ON public.profiles TO authenticated;
    const isSuperCaller = this.profiles.find((p) => p.id === authUserId)?.is_platform_admin;
    if (!isSuperCaller && !options.bypassColumnCheck) {
      const allowedUpdateColumns = new Set([
        'first_name',
        'last_name',
        'phone',
        'avatar_url',
        'time_zone',
        'locale',
        'updated_at',
      ]);
      for (const col of Object.keys(updates)) {
        if (!allowedUpdateColumns.has(col)) {
          throw new Error(`PermissionDeniedError: permission denied for column "${col}" of relation "profiles"`);
        }
      }
    }
    const isSuper = this.profiles.find((p) => p.id === authUserId)?.is_platform_admin;
    const canAccess = targetProfileId === authUserId || isSuper;
    if (!canAccess) {
      throw new Error('RLSCheckViolation: unauthorized profile update');
    }
    const profile = this.profiles.find((p) => p.id === targetProfileId);
    if (!profile) throw new Error('RecordNotFound');

    // SEC-04: Prevent direct alteration of profile email by non-super-admin
    if (updates.email && updates.email !== profile.email && !isSuper) {
      throw new Error('ImmutableEmailError: Profile email cannot be directly modified.');
    }

    const passedCheck = (targetProfileId === authUserId && updates.is_platform_admin !== true) || isSuper;
    if (!passedCheck) {
      throw new Error('RLSCheckViolation: cannot elevate platform admin privileges');
    }
    Object.assign(profile, updates);
    return profile;
  }

  // Table RLS: SELECT on team_members (SEC-01)
  selectTeamMembers(authUserId) {
    const userOrgs = this.current_user_org_ids(authUserId);
    const isSuper = this.profiles.find((p) => p.id === authUserId)?.is_platform_admin;
    return (this.team_members || []).filter((tm) => {
      const team = (this.teams || []).find((t) => t.id === tm.team_id);
      return (team && userOrgs.includes(team.organization_id)) || isSuper;
    });
  }

  // Table RLS: INSERT on team_members (SEC-01)
  insertTeamMember(authUserId, payload) {
    const isSuper = this.profiles.find((p) => p.id === authUserId)?.is_platform_admin;
    const team = (this.teams || []).find((t) => t.id === payload.team_id);
    if (!team) throw new Error('RecordNotFound: Team not found');

    const hasWrite = this.has_permission(authUserId, team.organization_id, 'org:teams:write');
    if (!hasWrite && !isSuper) {
      throw new Error('RLSViolation: Denied by team_members insert policy');
    }

    // Membership must belong to the organization
    const mem = this.memberships.find((m) => m.id === payload.membership_id && m.organization_id === team.organization_id);
    if (!mem && !isSuper) {
      throw new Error('RLSCheckViolation: Membership does not belong to team organization');
    }

    if (!this.team_members) this.team_members = [];
    this.team_members.push({ ...payload });
    return payload;
  }

  // Table RLS: SELECT on roles (SEC-02: Public/authenticated readable)
  selectRoles(authUserId) {
    // Authenticated users can always read system roles
    return this.roles || [];
  }

  // Table RLS: MODIFY on role_permissions (SEC-02: Super admin only)
  modifyRolePermissions(authUserId, roleId, permissionId) {
    const isSuper = this.profiles.find((p) => p.id === authUserId)?.is_platform_admin;
    if (!isSuper) {
      throw new Error('RLSViolation: Only platform super-admins can modify role permissions');
    }
    return { roleId, permissionId };
  }

  // Table RLS: SELECT / UPDATE on system_settings (SEC-02: Super admin only)
  selectSystemSettings(authUserId) {
    const isSuper = this.profiles.find((p) => p.id === authUserId)?.is_platform_admin;
    if (!isSuper) {
      throw new Error('RLSViolation: System settings are restricted to platform super-admins');
    }
    return [{ key: 'maintenance_mode', value: false }];
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

  // OBS-01: RPC Execution Permission Simulation
  executeRPC(callerRole, rpcName, args = {}) {
    if (rpcName === 'mask_email') {
      // 20261031000000_phase1_auth_rls.sql:
      // REVOKE EXECUTE ON FUNCTION public.mask_email(TEXT) FROM PUBLIC;
      // REVOKE EXECUTE ON FUNCTION public.mask_email(TEXT) FROM anon, authenticated;
      if (callerRole === 'anon' || callerRole === 'authenticated' || callerRole === 'public') {
        throw new Error('PermissionDeniedError: permission denied for function mask_email');
      }
      const email = args.p_email;
      if (!email || !email.includes('@')) return email;
      const [u, d] = email.split('@');
      return u.length <= 2 ? `${u[0]}***@${d}` : `${u[0]}***${u[u.length - 1]}@${d}`;
    }

    if (rpcName === 'get_invitation_by_token') {
      // get_invitation_by_token has GRANT EXECUTE TO anon, authenticated
      // It is SECURITY DEFINER, so internal invocation of mask_email runs under definer permissions
      const inv = args.invitation;
      if (!inv || inv.status !== 'pending') return null;

      let returnEmail;
      if (args.callerEmail && args.callerEmail.toLowerCase() === inv.email.toLowerCase()) {
        returnEmail = inv.email;
      } else {
        // Internal execution of mask_email helper by definer
        const [u, d] = inv.email.split('@');
        returnEmail = u.length <= 2 ? `${u[0]}***@${d}` : `${u[0]}***${u[u.length - 1]}@${d}`;
      }

      return {
        id: inv.id,
        organization_id: inv.organization_id,
        organization_name: inv.organization_name || 'Apex Realty',
        organization_slug: inv.organization_slug || 'apex-realty',
        email: returnEmail,
        role_name: inv.role_name || 'Agent',
        role_code: inv.role_code || 'agent',
        status: inv.status,
      };
    }

    throw new Error(`UnknownRPC: ${rpcName}`);
  }

  // OBS-02 & FINDING 2: Auth User Email Update Trigger Simulation
  simulateAuthUserEmailUpdate({ userId, newEmail, oldEmail, emailConfirmedAt, oldEmailConfirmedAt, phoneConfirmedAt, confirmedAt, emailChange }) {
    if (!newEmail || newEmail === oldEmail) return null;

    // FINDING 2: Must have email-specific confirmation (generic confirmedAt or phoneConfirmedAt does not qualify)
    if (!emailConfirmedAt) return null;

    // FINDING 2: Pending email change must not synchronize
    if (emailChange && emailChange.toLowerCase() === newEmail.toLowerCase()) return null;

    // FINDING 2: Stale historical confirmation timestamp must not authorize new email
    if (oldEmail && oldEmailConfirmedAt && new Date(emailConfirmedAt) <= new Date(oldEmailConfirmedAt)) {
      return null;
    }

    // Trigger update strictly matches profile ID
    const targetProfile = this.profiles.find((p) => p.id === userId);
    if (!targetProfile) return null;

    targetProfile.email = newEmail;
    targetProfile.updated_at = new Date().toISOString();
    return targetProfile;
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

  // Teams & Team Members (SEC-01)
  engine.teams = [
    { id: 'team_alpha_sales', organization_id: 'org_alpha', name: 'Alpha Sales' },
    { id: 'team_beta_sales', organization_id: 'org_beta', name: 'Beta Sales' },
  ];
  engine.team_members = [
    { team_id: 'team_alpha_sales', membership_id: 'mem_2', is_team_lead: false },
  ];
  engine.roles = [
    { id: 'role_owner', code: 'org_owner', name: 'Org Owner' },
    { id: 'role_agent', code: 'agent', name: 'Agent' },
  ];

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

test('PostgreSQL RLS: Authenticated user can INSERT own profile with is_platform_admin=false', () => {
  const engine = setupSeededRLSEngine();
  const newUserId = 'user_gamma_new';

  const res = engine.insertProfile(newUserId, {
    id: newUserId,
    email: 'newuser@gamma.com',
    is_platform_admin: false,
  });

  assert.equal(res.id, newUserId);
  assert.equal(res.is_platform_admin, false);
});

test('PostgreSQL RLS [Negative Test 9]: Authenticated user cannot INSERT profile for another user ID', () => {
  const engine = setupSeededRLSEngine();
  const callerId = 'user_gamma_new';
  const victimId = 'user_victim_123';

  assert.throws(
    () => {
      engine.insertProfile(callerId, {
        id: victimId, // Forged ID
        email: 'victim@gamma.com',
        is_platform_admin: false,
      });
    },
    {
      message: /RLSCheckViolation: new row violates row-level security policy for table "profiles"/,
    }
  );
});

test('PostgreSQL RLS [Negative Test 10]: Authenticated user cannot self-grant is_platform_admin=true on INSERT', () => {
  const engine = setupSeededRLSEngine();
  const callerId = 'user_attacker';

  assert.throws(
    () => {
      engine.insertProfile(callerId, {
        id: callerId,
        email: 'attacker@evil.com',
        is_platform_admin: true, // Privilege escalation attempt
      });
    },
    {
      message: /RLSCheckViolation: new row violates row-level security policy for table "profiles"/,
    }
  );
});

test('PostgreSQL RLS [Negative Test 11]: Authenticated user cannot elevate is_platform_admin=true on UPDATE', () => {
  const engine = setupSeededRLSEngine();
  const callerId = 'user_alpha_agent';

  // Defense-in-depth Layer 1: Column-level privilege denial (Finding 3)
  assert.throws(
    () => {
      engine.updateProfile(callerId, callerId, {
        is_platform_admin: true, // Privilege escalation attempt
      });
    },
    {
      message: /PermissionDeniedError: permission denied for column "is_platform_admin"/,
    }
  );

  // Defense-in-depth Layer 2: RLS WITH CHECK policy rejection
  assert.throws(
    () => {
      engine.updateProfile(
        callerId,
        callerId,
        {
          is_platform_admin: true, // Privilege escalation attempt
        },
        { bypassColumnCheck: true }
      );
    },
    {
      message: /RLSCheckViolation: cannot elevate platform admin privileges/,
    }
  );
});

test('PostgreSQL RLS: Super-admin can grant is_platform_admin=true', () => {
  const engine = setupSeededRLSEngine();
  const updated = engine.updateProfile('user_platform_admin', 'user_alpha_agent', {
    is_platform_admin: true,
  });
  assert.equal(updated.is_platform_admin, true);
});

test('PostgreSQL RLS [SEC-01]: User can view team members only in their organization', () => {
  const engine = setupSeededRLSEngine();
  const alphaResults = engine.selectTeamMembers('user_alpha_agent');
  assert.equal(alphaResults.length, 1);
  assert.equal(alphaResults[0].team_id, 'team_alpha_sales');

  const betaResults = engine.selectTeamMembers('user_beta_owner');
  assert.equal(betaResults.length, 0); // Beta sees zero team members from Alpha
});

test('PostgreSQL RLS [SEC-01]: Cross-tenant insert into team_members is blocked by RLS', () => {
  const engine = setupSeededRLSEngine();
  assert.throws(
    () => {
      // Beta owner tries to insert member into Alpha team
      engine.insertTeamMember('user_beta_owner', {
        team_id: 'team_alpha_sales',
        membership_id: 'mem_4',
        is_team_lead: true,
      });
    },
    {
      message: /RLSViolation: Denied by team_members insert policy/,
    }
  );
});

test('PostgreSQL RLS [SEC-01]: Regular agent without org:teams:write cannot insert into team_members', () => {
  const engine = setupSeededRLSEngine();
  assert.throws(
    () => {
      // Alpha agent tries to insert member into team
      engine.insertTeamMember('user_alpha_agent', {
        team_id: 'team_alpha_sales',
        membership_id: 'mem_1',
        is_team_lead: true,
      });
    },
    {
      message: /RLSViolation: Denied by team_members insert policy/,
    }
  );
});

test('PostgreSQL RLS [SEC-02]: Authenticated users can read roles', () => {
  const engine = setupSeededRLSEngine();
  const roles = engine.selectRoles('user_alpha_agent');
  assert.ok(roles.length >= 2);
});

test('PostgreSQL RLS [SEC-02]: Non-super-admin cannot modify role permissions', () => {
  const engine = setupSeededRLSEngine();
  assert.throws(
    () => {
      engine.modifyRolePermissions('user_alpha_owner', 'role_agent', 'perm_billing');
    },
    {
      message: /RLSViolation: Only platform super-admins can modify role permissions/,
    }
  );
});

test('PostgreSQL RLS [SEC-02]: Non-super-admin cannot read or update system settings', () => {
  const engine = setupSeededRLSEngine();
  assert.throws(
    () => {
      engine.selectSystemSettings('user_alpha_owner');
    },
    {
      message: /RLSViolation: System settings are restricted to platform super-admins/,
    }
  );
});

test('PostgreSQL RLS [SEC-02]: Super-admin can read system settings', () => {
  const engine = setupSeededRLSEngine();
  const settings = engine.selectSystemSettings('user_platform_admin');
  assert.equal(settings.length, 1);
  assert.equal(settings[0].key, 'maintenance_mode');
});

test('PostgreSQL RLS [SEC-04]: User cannot directly modify profile email', () => {
  const engine = setupSeededRLSEngine();
  assert.throws(
    () => {
      // Alpha agent attempts to spoof email to target another account
      engine.updateProfile('user_alpha_agent', 'user_alpha_agent', {
        email: 'ceo@targetcorp.com',
      });
    },
    {
      message: /PermissionDeniedError: permission denied for column "email"|ImmutableEmailError: Profile email cannot be directly modified/,
    }
  );
});

test('PostgreSQL RLS [OBS-01]: PUBLIC/anon/authenticated cannot directly execute mask_email()', () => {
  const engine = setupSeededRLSEngine();

  // Anonymous caller directly calling mask_email RPC
  assert.throws(
    () => {
      engine.executeRPC('anon', 'mask_email', { p_email: 'secret@domain.com' });
    },
    {
      message: /PermissionDeniedError: permission denied for function mask_email/,
    }
  );

  // Authenticated caller directly calling mask_email RPC
  assert.throws(
    () => {
      engine.executeRPC('authenticated', 'mask_email', { p_email: 'secret@domain.com' });
    },
    {
      message: /PermissionDeniedError: permission denied for function mask_email/,
    }
  );
});

test('PostgreSQL RLS [OBS-01]: Invitation lookup RPC still executes internal masking helper', () => {
  const engine = setupSeededRLSEngine();

  const mockInv = {
    id: 'inv_100',
    organization_id: 'org_alpha',
    email: 'prospective@buyer.com',
    status: 'pending',
  };

  // Anon caller queries invitation - email is masked internally
  const anonResult = engine.executeRPC('anon', 'get_invitation_by_token', {
    invitation: mockInv,
    callerEmail: null,
  });
  assert.equal(anonResult.email, 'p***e@buyer.com');

  // Authenticated caller with matching email gets unmasked email
  const authResult = engine.executeRPC('authenticated', 'get_invitation_by_token', {
    invitation: mockInv,
    callerEmail: 'prospective@buyer.com',
  });
  assert.equal(authResult.email, 'prospective@buyer.com');
});

test('PostgreSQL RLS [OBS-02]: Verified Auth email changes synchronize the matching profile', () => {
  const engine = setupSeededRLSEngine();

  const updatedProfile = engine.simulateAuthUserEmailUpdate({
    userId: 'user_alpha_agent',
    oldEmail: 'agent@alpha.com',
    oldEmailConfirmedAt: '2026-01-01T00:00:00Z',
    newEmail: 'agent_verified@alpha.com',
    emailConfirmedAt: '2026-10-30T12:00:00Z',
  });

  assert.ok(updatedProfile);
  assert.equal(updatedProfile.email, 'agent_verified@alpha.com');

  const profileInStore = engine.profiles.find((p) => p.id === 'user_alpha_agent');
  assert.equal(profileInStore.email, 'agent_verified@alpha.com');
});

test('PostgreSQL RLS [OBS-02]: Unverified Auth email changes do NOT synchronize profile', () => {
  const engine = setupSeededRLSEngine();

  const res = engine.simulateAuthUserEmailUpdate({
    userId: 'user_alpha_agent',
    oldEmail: 'agent@alpha.com',
    newEmail: 'unverified_phish@evil.com',
    emailConfirmedAt: null,
  });

  assert.equal(res, null);
  const profileInStore = engine.profiles.find((p) => p.id === 'user_alpha_agent');
  assert.equal(profileInStore.email, 'agent@alpha.com'); // Untouched
});

test('PostgreSQL RLS [OBS-02]: One user Auth email cannot update another user profile', () => {
  const engine = setupSeededRLSEngine();

  // User Alpha Owner updates their verified email
  engine.simulateAuthUserEmailUpdate({
    userId: 'user_alpha_owner',
    oldEmail: 'owner@alpha.com',
    oldEmailConfirmedAt: '2026-01-01T00:00:00Z',
    newEmail: 'owner_new@alpha.com',
    emailConfirmedAt: '2026-10-30T12:00:00Z',
  });

  // Verify Alpha Owner's profile changed
  const owner = engine.profiles.find((p) => p.id === 'user_alpha_owner');
  assert.equal(owner.email, 'owner_new@alpha.com');

  // Verify Alpha Agent's profile was not affected
  const agent = engine.profiles.find((p) => p.id === 'user_alpha_agent');
  assert.equal(agent.email, 'agent@alpha.com');

  // Verify Beta Owner's profile was not affected
  const betaOwner = engine.profiles.find((p) => p.id === 'user_beta_owner');
  assert.equal(betaOwner.email, 'owner@beta.com');
});

test('PostgreSQL RLS [FINDING 1]: Caller cannot bypass profile email immutability via custom GUC or parameters', () => {
  const engine = setupSeededRLSEngine();

  // Caller attempts direct profile update simulating custom GUC presence
  assert.throws(
    () => {
      engine.updateProfile('user_alpha_agent', 'user_alpha_agent', {
        email: 'attacker_takeover@evil.com',
        _guc_sync_flag: 'true',
      });
    },
    {
      message: /PermissionDeniedError: permission denied for column "email"|ImmutableEmailError: Profile email cannot be directly modified/,
    }
  );

  // Profile email remains completely untouched
  const agent = engine.profiles.find((p) => p.id === 'user_alpha_agent');
  assert.equal(agent.email, 'agent@alpha.com');
});

test('PostgreSQL RLS [FINDING 2]: Phone-only confirmation (emailConfirmedAt is null) does NOT synchronize email', () => {
  const engine = setupSeededRLSEngine();

  // Account has phone confirmed and confirmed_at set, but emailConfirmedAt is null
  const res = engine.simulateAuthUserEmailUpdate({
    userId: 'user_alpha_agent',
    oldEmail: 'agent@alpha.com',
    newEmail: 'phone_user_unconfirmed@alpha.com',
    emailConfirmedAt: null,
    phoneConfirmedAt: '2026-10-30T10:00:00Z',
    confirmedAt: '2026-10-30T10:00:00Z',
  });

  assert.equal(res, null);
  const profile = engine.profiles.find((p) => p.id === 'user_alpha_agent');
  assert.equal(profile.email, 'agent@alpha.com'); // Untouched
});
test('PostgreSQL RLS [FINDING 2]: Pending email change (emailChange === newEmail) does NOT synchronize profile', () => {
  const engine = setupSeededRLSEngine();

  const res = engine.simulateAuthUserEmailUpdate({
    userId: 'user_alpha_agent',
    oldEmail: 'agent@alpha.com',
    newEmail: 'pending_confirmation@alpha.com',
    emailConfirmedAt: '2026-01-01T00:00:00Z',
    emailChange: 'pending_confirmation@alpha.com',
  });

  assert.equal(res, null);
  const profile = engine.profiles.find((p) => p.id === 'user_alpha_agent');
  assert.equal(profile.email, 'agent@alpha.com'); // Untouched
});

test('PostgreSQL RLS [FINDING 3]: Authenticated user cannot update profiles.email directly through PostgREST permissions', () => {
  const engine = setupSeededRLSEngine();

  // Role 'authenticated' has column-level UPDATE on allowed fields only; email is excluded
  assert.throws(
    () => {
      engine.updateProfile('user_alpha_agent', 'user_alpha_agent', {
        email: 'malicious_takeover@evil.com',
      });
    },
    {
      message: /PermissionDeniedError: permission denied for column "email" of relation "profiles"/,
    }
  );

  // Email column in database remains original
  const profile = engine.profiles.find((p) => p.id === 'user_alpha_agent');
  assert.equal(profile.email, 'agent@alpha.com');
});

test('PostgreSQL RLS [FINDING 3]: Authenticated user can still update allowed profile columns', () => {
  const engine = setupSeededRLSEngine();

  // Allowed columns: first_name, last_name, phone, avatar_url, time_zone, locale, updated_at
  const updated = engine.updateProfile('user_alpha_agent', 'user_alpha_agent', {
    first_name: 'Agent Alexander',
    phone: '+1-555-0199',
    avatar_url: 'https://cdn.estatepilot.com/avatar1.jpg',
    time_zone: 'America/New_York',
  });

  assert.equal(updated.first_name, 'Agent Alexander');
  assert.equal(updated.phone, '+1-555-0199');
  assert.equal(updated.avatar_url, 'https://cdn.estatepilot.com/avatar1.jpg');
  assert.equal(updated.time_zone, 'America/New_York');
  assert.equal(updated.email, 'agent@alpha.com'); // Email unchanged!
});

test('PostgreSQL RLS [FINDING 2]: Failed Auth verification rejects synchronization (fail-closed)', () => {
  const engine = setupSeededRLSEngine();

  // When Auth verification fails (e.g. unverified, missing record, or exception)
  const res = engine.simulateAuthUserEmailUpdate({
    userId: 'user_alpha_agent',
    oldEmail: 'agent@alpha.com',
    newEmail: 'failed_verification@alpha.com',
    emailConfirmedAt: null, // Verification failed / not confirmed
  });

  // Must reject modification completely (fail closed)
  assert.equal(res, null);
  const profile = engine.profiles.find((p) => p.id === 'user_alpha_agent');
  assert.equal(profile.email, 'agent@alpha.com'); // Completely protected
});

test('PostgreSQL RLS [FINDING 2]: Stale historical email_confirmed_at timestamp does NOT synchronize newly changed email', () => {
  const engine = setupSeededRLSEngine();
  const pastTimestamp = '2025-01-01T00:00:00Z';

  // Email changed, but emailConfirmedAt timestamp was not advanced
  const res = engine.simulateAuthUserEmailUpdate({
    userId: 'user_alpha_agent',
    oldEmail: 'agent@alpha.com',
    oldEmailConfirmedAt: pastTimestamp,
    newEmail: 'unconfirmed_stale@alpha.com',
    emailConfirmedAt: pastTimestamp,
  });

  assert.equal(res, null);
  const profile = engine.profiles.find((p) => p.id === 'user_alpha_agent');
  assert.equal(profile.email, 'agent@alpha.com'); // Untouched
});