import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

function generateInvitationToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashInvitationToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
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
