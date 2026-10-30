import crypto from 'crypto';
import { Result, ok, err } from '@estatepilot/shared';
import { TypedSupabaseClient } from '@estatepilot/database';

export interface CreateInvitationOptions {
  organizationId: string;
  email: string;
  roleCode: string;
  branchId?: string | null;
  invitedByUserId: string;
  expiresInHours?: number;
}

export interface InvitationResult {
  id: string;
  organizationId: string;
  email: string;
  roleCode: string;
  rawToken: string;
  expiresAt: string;
}

export interface InvitationDetails {
  id: string;
  organizationId: string;
  organizationName: string;
  email: string;
  roleCode: string;
  roleName: string;
  expiresAt: string;
  status: string;
}

/**
 * Generates a cryptographically secure 32-byte hex token
 */
export function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Computes a SHA-256 cryptographic hash of a raw invitation token
 */
export function hashInvitationToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Creates an organization invitation with token hashing and expiration
 */
export async function createOrganizationInvitation(
  client: TypedSupabaseClient,
  options: CreateInvitationOptions
): Promise<Result<InvitationResult, Error>> {
  try {
    const emailNormalized = options.email.trim().toLowerCase();

    // 1. Resolve role ID from role code
    const { data: roleData, error: roleError } = await client
      .from('roles')
      .select('id, code')
      .eq('code', options.roleCode)
      .single();

    if (roleError || !roleData) {
      return err(new Error(`Invalid role code: ${options.roleCode}`));
    }

    // 2. Check if already an active member in this organization
    const { data: existingMember } = await client
      .from('memberships')
      .select('id, profiles!inner(email)')
      .eq('organization_id', options.organizationId)
      .eq('profiles.email', emailNormalized)
      .maybeSingle();

    if (existingMember) {
      return err(new Error(`User with email "${emailNormalized}" is already a member of this organization.`));
    }

    // 3. Generate token and hash
    const rawToken = generateInvitationToken();
    const tokenHash = hashInvitationToken(rawToken);

    const hours = options.expiresInHours || 168; // Default: 7 days
    const expiresAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();

    // 4. Invalidate any prior pending invitation for this email in this org
    await client
      .from('organization_invitations')
      .update({ status: 'revoked' })
      .eq('organization_id', options.organizationId)
      .eq('email', emailNormalized)
      .eq('status', 'pending');

    // 5. Insert invitation record
    const { data: invData, error: invError } = await client
      .from('organization_invitations')
      .insert({
        organization_id: options.organizationId,
        email: emailNormalized,
        role_id: roleData.id,
        branch_id: options.branchId || null,
        token_hash: tokenHash,
        invited_by: options.invitedByUserId,
        expires_at: expiresAt,
        status: 'pending',
      })
      .select('id')
      .single();

    if (invError || !invData) {
      return err(new Error(`Failed to create invitation: ${invError?.message}`));
    }

    // 6. Log audit event
    await client.from('audit_logs').insert({
      organization_id: options.organizationId,
      profile_id: options.invitedByUserId,
      action: 'invitation.created',
      entity_type: 'organization_invitation',
      entity_id: invData.id,
      diff: {
        email: emailNormalized,
        role: options.roleCode,
        expires_at: expiresAt,
      },
    });

    return ok({
      id: invData.id,
      organizationId: options.organizationId,
      email: emailNormalized,
      roleCode: options.roleCode,
      rawToken,
      expiresAt,
    });
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Validates an invitation by raw token without consuming it
 */
export async function verifyInvitation(
  client: TypedSupabaseClient,
  rawToken: string
): Promise<Result<InvitationDetails, Error>> {
  try {
    const tokenHash = hashInvitationToken(rawToken);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (client.from('organization_invitations') as any)
      .select(`
        id,
        organization_id,
        email,
        expires_at,
        status,
        organizations (id, name),
        roles (code, name)
      `)
      .eq('token_hash', tokenHash)
      .single();

    if (error || !data) {
      return err(new Error('Invalid or non-existent invitation token.'));
    }

    if (data.status !== 'pending') {
      return err(new Error(`Invitation is no longer active (status: ${data.status}).`));
    }

    if (new Date(data.expires_at) < new Date()) {
      // Mark as expired
      await client
        .from('organization_invitations')
        .update({ status: 'expired' })
        .eq('id', data.id);

      return err(new Error('This invitation has expired. Please ask your administrator to send a new invite.'));
    }

    return ok({
      id: data.id,
      organizationId: data.organization_id,
      organizationName: data.organizations?.name || 'Organization',
      email: data.email,
      roleCode: data.roles?.code || 'agent',
      roleName: data.roles?.name || 'Agent',
      expiresAt: data.expires_at,
      status: data.status,
    });
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Accepts an invitation and establishes user membership
 */
export async function acceptInvitation(
  client: TypedSupabaseClient,
  rawToken: string,
  acceptingUserId: string
): Promise<Result<{ organizationId: string; membershipId: string }, Error>> {
  try {
    const verifyRes = await verifyInvitation(client, rawToken);
    if (!verifyRes.ok) {
      return err(verifyRes.error);
    }

    const inv = verifyRes.value;

    // Verify accepting user's email matches the invitation email
    const { data: profile } = await client
      .from('profiles')
      .select('email')
      .eq('id', acceptingUserId)
      .single();

    if (!profile || profile.email.toLowerCase() !== inv.email.toLowerCase()) {
      return err(
        new Error(
          `Email mismatch: This invitation was issued for "${inv.email}", but your logged-in email is "${profile?.email}".`
        )
      );
    }

    // Fetch full invitation record for role_id and branch_id
    const tokenHash = hashInvitationToken(rawToken);
    const { data: fullInv } = await client
      .from('organization_invitations')
      .select('role_id, branch_id')
      .eq('token_hash', tokenHash)
      .single();

    if (!fullInv) {
      return err(new Error('Failed to retrieve invitation role specifications.'));
    }

    // Insert active membership
    const { data: memData, error: memError } = await client
      .from('memberships')
      .insert({
        organization_id: inv.organizationId,
        profile_id: acceptingUserId,
        role_id: fullInv.role_id,
        branch_id: fullInv.branch_id,
        status: 'active',
        is_default: false,
      })
      .select('id')
      .single();

    if (memError || !memData) {
      return err(new Error(`Failed to create membership: ${memError?.message}`));
    }

    // Mark invitation as accepted
    await client
      .from('organization_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', inv.id);

    // Audit log
    await client.from('audit_logs').insert({
      organization_id: inv.organizationId,
      profile_id: acceptingUserId,
      action: 'invitation.accepted',
      entity_type: 'organization_invitation',
      entity_id: inv.id,
      diff: {
        membership_id: memData.id,
        email: inv.email,
        role: inv.roleCode,
      },
    });

    return ok({
      organizationId: inv.organizationId,
      membershipId: memData.id,
    });
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Rejects an invitation
 */
export async function rejectInvitation(
  client: TypedSupabaseClient,
  rawToken: string
): Promise<Result<void, Error>> {
  try {
    const tokenHash = hashInvitationToken(rawToken);
    const { error } = await client
      .from('organization_invitations')
      .update({ status: 'rejected' })
      .eq('token_hash', tokenHash)
      .eq('status', 'pending');

    if (error) {
      return err(new Error(`Failed to reject invitation: ${error.message}`));
    }

    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}
