import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

function generateInvitationToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashInvitationToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function maskEmail(email) {
  if (!email || !email.includes('@')) return email;
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user[0]}***@${domain}`;
  return `${user[0]}***${user[user.length - 1]}@${domain}`;
}

class MockInvitationStore {
  constructor() {
    this.invitations = [];
    this.memberships = [];
  }

  createInvitation({ orgId, email, role, expiresInHours = 168 }) {
    const emailNorm = email.toLowerCase();
    // Check duplicate pending
    const existing = this.invitations.find(
      (i) => i.orgId === orgId && i.email === emailNorm && i.status === 'pending'
    );
    if (existing) {
      throw new Error(`DuplicateInvitationError: Pending invite already exists for ${emailNorm}`);
    }

    const rawToken = generateInvitationToken();
    const tokenHash = hashInvitationToken(rawToken);
    const expiresAt = new Date(Date.now() + expiresInHours * 3600 * 1000);

    const record = {
      id: `inv_${this.invitations.length + 1}`,
      orgId,
      email: emailNorm,
      role,
      tokenHash,
      expiresAt,
      status: 'pending',
    };
    this.invitations.push(record);
    return { id: record.id, rawToken, expiresAt };
  }

  acceptInvitation(rawToken, userEmail, userId) {
    const tokenHash = hashInvitationToken(rawToken);
    const inv = this.invitations.find((i) => i.tokenHash === tokenHash);

    if (!inv) {
      throw new Error('InvalidTokenError: Invitation not found');
    }

    if (inv.status !== 'pending') {
      throw new Error(`InvalidTokenError: Invitation already ${inv.status}`);
    }

    if (new Date() > inv.expiresAt) {
      inv.status = 'expired';
      throw new Error('ExpiredTokenError: Invitation has expired');
    }

    if (inv.email !== userEmail.toLowerCase()) {
      throw new Error(
        `EmailMismatchError: Invite belongs to ${inv.email}, logged in as ${userEmail}`
      );
    }

    inv.status = 'accepted';
    inv.acceptedAt = new Date();
    this.memberships.push({
      orgId: inv.orgId,
      userId,
      role: inv.role,
      status: 'active',
    });

    return { success: true, orgId: inv.orgId };
  }

  // SEC-05: Purely read-only; no DB status mutations. SEC-07: Email masking
  getInvitationByToken(tokenHash, callerEmail = null) {
    const inv = this.invitations.find((i) => i.tokenHash === tokenHash && i.status === 'pending');
    if (!inv) return null;
    if (new Date() > inv.expiresAt) {
      // SEC-05: Returns expired status WITHOUT mutating inv.status in DB
      return { status: 'expired', message: 'Invitation has expired.' };
    }

    // SEC-07: Mask email unless caller is verified and matching
    const returnEmail = (callerEmail && callerEmail.toLowerCase() === inv.email.toLowerCase())
      ? inv.email
      : maskEmail(inv.email);

    // Returns minimum required info - NEVER expose tokenHash
    return {
      id: inv.id,
      organizationId: inv.orgId,
      organizationName: `Org ${inv.orgId}`,
      email: returnEmail,
      roleName: inv.role,
      roleCode: inv.role,
      expiresAt: inv.expiresAt,
      status: inv.status,
    };
  }

  // OBS-01: Direct execution of mask_email is revoked from PUBLIC, anon, and authenticated
  callMaskEmailRPC(callerRole, email) {
    if (callerRole === 'anon' || callerRole === 'authenticated' || callerRole === 'public') {
      throw new Error('PermissionDeniedError: permission denied for function mask_email');
    }
    return maskEmail(email);
  }

  // SEC-03: Caller identity strictly from session, no third-party profile impersonation
  acceptInvitationAtomic(tokenHash, callerSession) {
    if (!callerSession || !callerSession.userId) {
      throw new Error('AuthenticationRequired: User must be signed in to accept an invitation.');
    }
    const inv = this.invitations.find((i) => i.tokenHash === tokenHash);
    if (!inv) throw new Error('InvalidToken: Invitation token not found.');
    if (inv.status !== 'pending') throw new Error(`InvitationNotPending: Invitation is in "${inv.status}" status.`);
    if (new Date() > inv.expiresAt) {
      throw new Error('InvitationExpired: Invitation has expired.');
    }

    // SEC-04, FINDING 2 & HIGH-01: Match against trusted caller email strictly from auth.users with email-specific confirmation.
    // Never fall back to public.profiles.email!
    if (
      !callerSession.email ||
      callerSession.email.trim() === '' ||
      callerSession.emailConfirmed === false ||
      callerSession.emailConfirmedAt === null ||
      callerSession.phoneConfirmedOnly === true
    ) {
      throw new Error('EmailUnconfirmed: Caller email must be confirmed in auth.users before accepting an invitation.');
    }

    if (inv.email !== callerSession.email.toLowerCase()) {
      throw new Error(`EmailMismatch: Invitation was issued to "${inv.email}" but caller is "${callerSession.email}".`);
    }

    inv.status = 'accepted';
    inv.acceptedAt = new Date();
    const memId = `mem_${this.memberships.length + 1}`;
    this.memberships.push({
      id: memId,
      orgId: inv.orgId,
      userId: callerSession.userId,
      role: inv.role,
      status: 'active',
    });
    return {
      membership_id: memId,
      organization_id: inv.orgId,
      status: 'accepted',
    };
  }

  rejectInvitation(rawToken) {
    const tokenHash = hashInvitationToken(rawToken);
    const inv = this.invitations.find((i) => i.tokenHash === tokenHash);
    if (!inv || inv.status !== 'pending') {
      throw new Error('InvalidTokenError: Cannot reject invitation');
    }
    inv.status = 'rejected';
    return { success: true };
  }
}

test('Invitations: Token hashing produces consistent SHA-256 hashes', () => {
  const token = generateInvitationToken();
  assert.equal(typeof token, 'string');
  assert.equal(token.length, 64); // 32 bytes in hex = 64 chars

  const hash1 = hashInvitationToken(token);
  const hash2 = hashInvitationToken(token);
  assert.equal(hash1, hash2);
  assert.equal(hash1.length, 64); // sha256 in hex = 64 chars
  assert.notEqual(token, hash1); // Must be one-way hashed
});

test('Invitations: Successfully creates and accepts an invitation', () => {
  const store = new MockInvitationStore();
  const created = store.createInvitation({
    orgId: 'org_apex',
    email: 'newagent@brokerage.com',
    role: 'agent',
  });

  assert.ok(created.rawToken);
  assert.ok(created.id);

  // Accept with matching email
  const acceptRes = store.acceptInvitation(
    created.rawToken,
    'newagent@brokerage.com',
    'user_99'
  );

  assert.equal(acceptRes.success, true);
  assert.equal(store.memberships.length, 1);
  assert.equal(store.memberships[0].orgId, 'org_apex');
  assert.equal(store.memberships[0].userId, 'user_99');
});

test('Invitations [Negative Test]: Prevents duplicate active pending invitations', () => {
  const store = new MockInvitationStore();
  store.createInvitation({
    orgId: 'org_apex',
    email: 'newagent@brokerage.com',
    role: 'agent',
  });

  assert.throws(
    () => {
      store.createInvitation({
        orgId: 'org_apex',
        email: 'newagent@brokerage.com',
        role: 'senior_agent',
      });
    },
    {
      message: /DuplicateInvitationError/,
    }
  );
});

test('Invitations [Negative Test]: Rejects consumption of expired tokens', () => {
  const store = new MockInvitationStore();
  // Create an invitation that expired 1 hour ago
  const created = store.createInvitation({
    orgId: 'org_apex',
    email: 'expired@brokerage.com',
    role: 'agent',
    expiresInHours: -1,
  });

  assert.throws(
    () => {
      store.acceptInvitation(created.rawToken, 'expired@brokerage.com', 'user_100');
    },
    {
      message: /ExpiredTokenError/,
    }
  );
});

test('Invitations [Negative Test]: Rejects token reuse after acceptance', () => {
  const store = new MockInvitationStore();
  const created = store.createInvitation({
    orgId: 'org_apex',
    email: 'singleuse@brokerage.com',
    role: 'agent',
  });

  store.acceptInvitation(created.rawToken, 'singleuse@brokerage.com', 'user_101');

  // Attempting to accept again must fail
  assert.throws(
    () => {
      store.acceptInvitation(created.rawToken, 'singleuse@brokerage.com', 'user_102');
    },
    {
      message: /InvalidTokenError: Invitation already accepted/,
    }
  );
});

test('Invitations [Negative Test]: Prevents accepting invitation with mismatched email address', () => {
  const store = new MockInvitationStore();
  const created = store.createInvitation({
    orgId: 'org_apex',
    email: 'target@brokerage.com',
    role: 'agent',
  });

  assert.throws(
    () => {
      store.acceptInvitation(created.rawToken, 'attacker@malicious.com', 'user_999');
    },
    {
      message: /EmailMismatchError/,
    }
  );
});

test('Invitations RPC: get_invitation_by_token returns masked info for anonymous and full for matching caller (SEC-07)', () => {
  const store = new MockInvitationStore();
  const created = store.createInvitation({
    orgId: 'org_apex',
    email: 'external@buyer.com',
    role: 'agent',
  });

  const tokenHash = hashInvitationToken(created.rawToken);
  
  // Anonymous / unauthenticated lookup -> email MUST be masked
  const anonInfo = store.getInvitationByToken(tokenHash);
  assert.ok(anonInfo);
  assert.equal(anonInfo.email, 'e***l@buyer.com'); // SEC-07: Masked (first char 'e', last char 'l')
  assert.equal(anonInfo.organizationId, 'org_apex');
  assert.equal(anonInfo.roleName, 'agent');
  assert.equal(anonInfo.status, 'pending');
  assert.equal(anonInfo.tokenHash, undefined);

  // Authenticated lookup with matching email -> full email returned
  const authedInfo = store.getInvitationByToken(tokenHash, 'external@buyer.com');
  assert.equal(authedInfo.email, 'external@buyer.com');
});

test('Invitations RPC [SEC-05]: get_invitation_by_token performs no database writes', () => {
  const store = new MockInvitationStore();
  const created = store.createInvitation({
    orgId: 'org_apex',
    email: 'expired@client.com',
    role: 'agent',
    expiresInHours: -1, // Expired
  });

  const tokenHash = hashInvitationToken(created.rawToken);
  const info = store.getInvitationByToken(tokenHash);

  assert.ok(info);
  assert.equal(info.status, 'expired');

  // Verify the invitation in store was NOT mutated by read operation
  const invRecord = store.invitations.find((i) => i.tokenHash === tokenHash);
  assert.equal(invRecord.status, 'pending'); // SEC-05: Preserved pending in DB until acceptance/worker
});

test('Invitations RPC [SEC-03]: accept_invitation_atomic requires authenticated session and binds caller', () => {
  const store = new MockInvitationStore();
  const created = store.createInvitation({
    orgId: 'org_apex',
    email: 'invitee@agency.com',
    role: 'agent',
  });

  const tokenHash = hashInvitationToken(created.rawToken);
  
  // Unauthenticated call must fail
  assert.throws(
    () => {
      store.acceptInvitationAtomic(tokenHash, null);
    },
    {
      message: /AuthenticationRequired/,
    }
  );

  // Valid authenticated session
  const res = store.acceptInvitationAtomic(tokenHash, {
    userId: 'user_valid_456',
    email: 'invitee@agency.com',
  });

  assert.equal(res.status, 'accepted');
  assert.equal(res.organization_id, 'org_apex');
  assert.ok(res.membership_id);

  // Verify membership was registered
  const mem = store.memberships.find((m) => m.userId === 'user_valid_456');
  assert.ok(mem);
  assert.equal(mem.orgId, 'org_apex');
  assert.equal(mem.status, 'active');
});

test('Invitations RPC [Negative]: accept_invitation_atomic rejects mismatched email', () => {
  const store = new MockInvitationStore();
  const created = store.createInvitation({
    orgId: 'org_apex',
    email: 'target@brokerage.com',
    role: 'agent',
  });

  const tokenHash = hashInvitationToken(created.rawToken);
  assert.throws(
    () => {
      store.acceptInvitationAtomic(tokenHash, {
        userId: 'user_intruder',
        email: 'unauthorized@intruder.com',
      });
    },
    {
      message: /EmailMismatch/,
    }
  );
});

test('Invitations RPC [Negative]: accept_invitation_atomic rejects double acceptance', () => {
  const store = new MockInvitationStore();
  const created = store.createInvitation({
    orgId: 'org_apex',
    email: 'single@use.com',
    role: 'agent',
  });

  const tokenHash = hashInvitationToken(created.rawToken);
  store.acceptInvitationAtomic(tokenHash, {
    userId: 'user_first',
    email: 'single@use.com',
  });

  assert.throws(
    () => {
      store.acceptInvitationAtomic(tokenHash, {
        userId: 'user_second',
        email: 'single@use.com',
      });
    },
    {
      message: /InvitationNotPending/,
    }
  );
});

test('Invitations RPC [OBS-01]: PUBLIC cannot directly execute mask_email() RPC', () => {
  const store = new MockInvitationStore();

  assert.throws(
    () => {
      store.callMaskEmailRPC('public', 'user@domain.com');
    },
    {
      message: /PermissionDeniedError: permission denied for function mask_email/,
    }
  );

  assert.throws(
    () => {
      store.callMaskEmailRPC('anon', 'user@domain.com');
    },
    {
      message: /PermissionDeniedError: permission denied for function mask_email/,
    }
  );

  assert.throws(
    () => {
      store.callMaskEmailRPC('authenticated', 'user@domain.com');
    },
    {
      message: /PermissionDeniedError: permission denied for function mask_email/,
    }
  );
});

test('Invitations RPC [HIGH-01]: accept_invitation_atomic rejects unconfirmed email even when profile email matches', () => {
  const store = new MockInvitationStore();
  const created = store.createInvitation({
    orgId: 'org_apex',
    email: 'unconfirmed@user.com',
    role: 'agent',
  });

  const tokenHash = hashInvitationToken(created.rawToken);
  assert.throws(
    () => {
      store.acceptInvitationAtomic(tokenHash, {
        userId: 'usr_unconf',
        email: 'unconfirmed@user.com',
        emailConfirmed: false, // Unconfirmed email in auth.users
        profileEmail: 'unconfirmed@user.com', // Matching profile email must NOT authorize acceptance
      });
    },
    {
      message: /EmailUnconfirmed: Caller email must be confirmed in auth.users before accepting an invitation/,
    }
  );
});

test('Invitations RPC [HIGH-01]: accept_invitation_atomic rejects phone-only confirmation', () => {
  const store = new MockInvitationStore();
  const created = store.createInvitation({
    orgId: 'org_apex',
    email: 'phoneonly@user.com',
    role: 'agent',
  });

  const tokenHash = hashInvitationToken(created.rawToken);
  assert.throws(
    () => {
      store.acceptInvitationAtomic(tokenHash, {
        userId: 'usr_phone',
        email: 'phoneonly@user.com',
        phoneConfirmedOnly: true, // Phone confirmed, but email unconfirmed
        emailConfirmed: false,
      });
    },
    {
      message: /EmailUnconfirmed: Caller email must be confirmed in auth.users before accepting an invitation/,
    }
  );
});

test('Invitations RPC [HIGH-01]: accept_invitation_atomic succeeds for confirmed matching auth.users email', () => {
  const store = new MockInvitationStore();
  const created = store.createInvitation({
    orgId: 'org_apex',
    email: 'confirmed@user.com',
    role: 'agent',
  });

  const tokenHash = hashInvitationToken(created.rawToken);
  const result = store.acceptInvitationAtomic(tokenHash, {
    userId: 'usr_confirmed',
    email: 'confirmed@user.com',
    emailConfirmed: true,
  });

  assert.equal(result.status, 'accepted');
  assert.equal(result.organization_id, 'org_apex');
  assert.ok(result.membership_id);
});

test('Invitations RPC [HIGH-01]: accept_invitation_atomic rejects confirmed but mismatching email', () => {
  const store = new MockInvitationStore();
  const created = store.createInvitation({
    orgId: 'org_apex',
    email: 'target@user.com',
    role: 'agent',
  });

  const tokenHash = hashInvitationToken(created.rawToken);
  assert.throws(
    () => {
      store.acceptInvitationAtomic(tokenHash, {
        userId: 'usr_other',
        email: 'attacker@other.com',
        emailConfirmed: true,
      });
    },
    {
      message: /EmailMismatch/,
    }
  );
});

test('Invitations RPC [HIGH-01]: accept_invitation_atomic rejects expired invitation token', () => {
  const store = new MockInvitationStore();
  const created = store.createInvitation({
    orgId: 'org_apex',
    email: 'expired@user.com',
    role: 'agent',
    expiresInHours: -1, // 1 hour in the past
  });

  const tokenHash = hashInvitationToken(created.rawToken);
  assert.throws(
    () => {
      store.acceptInvitationAtomic(tokenHash, {
        userId: 'usr_expired',
        email: 'expired@user.com',
        emailConfirmed: true,
      });
    },
    {
      message: /InvitationExpired/,
    }
  );
});
