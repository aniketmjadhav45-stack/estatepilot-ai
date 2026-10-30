# EstatePilot AI — Security & Multi-Tenant Isolation Architecture

## 1. Security Philosophy & Principles

EstatePilot AI is built upon the principle of **Zero Trust Multi-Tenancy**. In a commercial SaaS platform serving competing real estate brokerages and agents, a data leak between tenants is catastrophic. Security is enforced at every layer:

1. **Database Layer (RLS)**: PostgreSQL Row Level Security enforces tenant isolation even if an application bug attempts to query without an organization filter.
2. **Service Layer (Membership Validation)**: Every server function resolves and validates the user's active membership in the requested organization before processing.
3. **Transport Layer (Signed Tokens & Safe Headers)**: Tamper-proof HTTP-only cookies, CSRF tokens on state-mutating requests, and signed webhook payloads.
4. **Secret Storage (Encryption at Rest)**: Third-party API keys (WhatsApp tokens, Stripe secrets, Gmail tokens) are stored in encrypted format (`pgcrypto` AES-256-GCM) and never logged or exposed to the client.
5. **Least Privilege RBAC**: Granular permissions dictate read/write/delete capabilities across all 28 modules.

---

## 2. PostgreSQL Row-Level Security (RLS) Model

Every tenant-owned table implements Row-Level Security.

### 2.1 Security Helper Functions & Search Path Hardening

All `SECURITY DEFINER` functions explicitly enforce `SET search_path = public, pg_temp;` and revoke `EXECUTE` privileges from `PUBLIC` to prevent privilege escalation:

```sql
-- 1. Helper to extract user ID from authenticated JWT (Supabase compatible)
CREATE OR REPLACE FUNCTION public.current_auth_user_id() RETURNS UUID AS $$
BEGIN
  RETURN COALESCE(
    NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID,
    auth.uid()
  );
END;
$$ LANGUAGE plpgsql STABLE
SET search_path = public, pg_temp;

-- 2. Helper to fetch all organizations the authenticated user belongs to
CREATE OR REPLACE FUNCTION public.current_user_org_ids() RETURNS SETOF UUID AS $$
  SELECT organization_id 
  FROM public.memberships 
  WHERE profile_id = public.current_auth_user_id() 
    AND status = 'active'
    AND deleted_at IS NULL;
$$ LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

-- 3. Helper to verify membership in a specific organization
CREATE OR REPLACE FUNCTION public.is_org_member(target_org_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.memberships 
    WHERE profile_id = public.current_auth_user_id() 
      AND organization_id = target_org_id 
      AND status = 'active'
      AND deleted_at IS NULL
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

-- Revoke default public execution privileges
REVOKE EXECUTE ON FUNCTION public.current_user_org_ids() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_org_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_org_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_member(UUID) TO authenticated;
```

### 2.2 Privilege Escalation Prevention Trigger

To block self-role mutation and prevent removing the last organization owner, PostgreSQL triggers enforce:
1. Users cannot alter their own `role_id` or promote themselves to `org_owner`/`super_admin`.
2. An organization must retain at least one active `org_owner`.
3. Suspended users cannot reactivate their own membership.

### 2.2 Standard Tenant Table Policy Template

Every tenant table (e.g. `contacts`, `properties`, `deals`, `leads`, `conversations`) applies this standard policy set:

```sql
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- SELECT Policy
CREATE POLICY "Tenant members can view properties in their organization"
ON public.properties FOR SELECT
USING (
  organization_id IN (SELECT public.current_user_org_ids())
  AND deleted_at IS NULL
);

-- INSERT Policy
CREATE POLICY "Tenant members can insert properties in their organization"
ON public.properties FOR INSERT
WITH CHECK (
  public.is_org_member(organization_id)
);

-- UPDATE Policy
CREATE POLICY "Tenant members can update properties in their organization"
ON public.properties FOR UPDATE
USING (
  public.is_org_member(organization_id)
)
WITH CHECK (
  public.is_org_member(organization_id)
);

-- DELETE (Soft-Delete) Policy
CREATE POLICY "Tenant admins can delete properties in their organization"
ON public.properties FOR DELETE
USING (
  public.is_org_member(organization_id)
);
```

---

## 3. Role-Based Access Control (RBAC) Matrix

EstatePilot AI defines 8 standard roles with hierarchical and specialist permissions:

| Permission Domain | `super_admin` | `org_owner` | `org_admin` | `branch_manager` | `team_lead` | `senior_agent` | `agent` | `support_staff` |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Platform Management** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Org Billing & Plans** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Org Settings & Security** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Branch Management** | ✅ | ✅ | ✅ | Branch Only | ❌ | ❌ | ❌ | ❌ |
| **Team Management** | ✅ | ✅ | ✅ | Branch Only | Team Only | ❌ | ❌ | ❌ |
| **Invite Members** | ✅ | ✅ | ✅ | Branch Only | ❌ | ❌ | ❌ | ❌ |
| **Properties (Full CRUD)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Assigned / Own | Read Only |
| **Publish Property** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Review Req. | ❌ |
| **Leads & CRM (All Org)** | ✅ | ✅ | ✅ | Branch Only | Team Only | Assigned | Assigned | Read Only |
| **Lead Assignment** | ✅ | ✅ | ✅ | Branch Only | Team Only | ❌ | ❌ | ❌ |
| **Deals & Pipelines** | ✅ | ✅ | ✅ | Branch Only | Team Only | Assigned | Assigned | ❌ |
| **AI Agents & Workflows** | ✅ | ✅ | ✅ | Configure | View | View | View | ❌ |
| **AI Approvals (Sign-off)**| ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Unified Inbox** | ✅ | ✅ | ✅ | Branch Only | Team Only | Assigned | Assigned | Assigned |
| **Financials & Commission**| ✅ | ✅ | ✅ | Branch Only | ❌ | Own Deals | Own Deals | ❌ |

---

## 4. Secret Management & Third-Party Tokens

1. **Storage**: Third-party integration credentials (WhatsApp Cloud Access Tokens, Google OAuth Refresh Tokens, Twilio Auth Tokens) are stored in the `integration_secrets` table.
2. **Encryption**: Stored encrypted with AES-256-GCM using an application master secret key (`INTEGRATION_ENCRYPTION_KEY`).
3. **Decryption Scope**: Decryption occurs strictly on the server within the `packages/integrations` service layer when executing an authorized outbound request.
4. **Never to Frontend**: Secrets are never serialized to the frontend or exposed via GraphQL/REST responses. UI returns only connectivity status (`connected: boolean`, `account_email: string`).

---

## 5. Webhook Security & Idempotency

All incoming webhooks (Stripe, Razorpay, WhatsApp Cloud, Gmail, Twilio) must:
1. **Verify Cryptographic Signature**: Match provider signature header (e.g. `Stripe-Signature`, `X-Hub-Signature-256`) against the configured endpoint secret.
2. **Idempotency Key Check**: Log incoming event ID in `webhook_events`. If the event ID already exists in `processed` status, return `200 OK` immediately without duplicate execution.
3. **Async Processing**: Return `200 OK` quickly and delegate execution to background worker queue to avoid provider timeouts.

---

## 6. Audit Trail & Immutability

The `audit_logs` table records every sensitive action across all organizations:
- `id`: UUID.
- `organization_id`: Tenant context (or NULL for platform admin actions).
- `user_id`: Acting profile ID.
- `action`: Canonical action identifier (e.g. `member.invited`, `property.price_updated`, `ai.tool_executed`, `deal.closed`).
- `entity_type`: Target entity (`property`, `lead`, `deal`, `membership`).
- `entity_id`: UUID of modified entity.
- `diff`: JSONB containing `{ before: {...}, after: {...} }`.
- `ip_address`: Client IP address.
- `user_agent`: Client User-Agent.
- `created_at`: Immutable UTC timestamp.

The `audit_logs` table disallows `UPDATE` and `DELETE` via database triggers, creating an immutable compliance ledger.
