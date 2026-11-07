import { TypedSupabaseClient } from '@estatepilot/database';
import { Result, ok, err } from '@estatepilot/shared';

export type AuthAuditEventType =
  | 'user.registered'
  | 'user.login'
  | 'user.logout'
  | 'user.password_reset_requested'
  | 'user.password_reset_completed'
  | 'organization.created'
  | 'organization.switched'
  | 'invitation.created'
  | 'invitation.accepted'
  | 'invitation.rejected'
  | 'invitation.revoked'
  | 'membership.created'
  | 'membership.updated'
  | 'membership.suspended'
  | 'membership.deleted'
  | 'role.changed'
  | 'lead.created'
  | 'lead.updated'
  | 'lead.status_changed'
  | 'lead.deleted'
  | (string & {});

export interface AuditLogEntry {
  organizationId?: string | null;
  userId?: string | null;
  action: AuthAuditEventType;
  entityType: string;
  entityId?: string | null;
  diff?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Sanitizes audit payload to strictly prevent storing passwords, tokens, or raw secrets
 */
export function sanitizeAuditDiff(diff?: Record<string, unknown>): Record<string, unknown> {
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

/**
 * Records an immutable audit log entry
 */
export async function recordAuditLog(
  client: TypedSupabaseClient,
  entry: AuditLogEntry
): Promise<Result<void, Error>> {
  try {
    const cleanDiff = sanitizeAuditDiff(entry.diff);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (client.from as any)('audit_logs').insert({
      organization_id: entry.organizationId || null,
      profile_id: entry.userId || null,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId || null,
      diff: cleanDiff,
      ip_address: entry.ipAddress || null,
      user_agent: entry.userAgent || null,
    });

    if (error) {
      return err(new Error(`Failed to write audit log: ${error.message}`));
    }

    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}
