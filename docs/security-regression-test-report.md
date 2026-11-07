# EstatePilot AI — Security Regression Test Report

**Execution Date**: October 31, 2026  
**Auditor**: Principal SaaS Architect & DevOps Test Lead  
**Test Suite**: EstatePilot AI Automated Test Suite (`npm test` via Node.js Test Runner)  
**Overall Result**: **100 PASSED, 0 FAILED, 0 SKIPPED (100% Pass Rate)**  

---

## 1. Test Execution Summary

```
TAP version 13
# tests 100
# suites 0
# pass 100
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 745.9325
```

---

## 2. Test Coverage Mapping for SEC-01 to SEC-07, OBS-01, OBS-02, Findings 1 to 4 & HIGH-01

| Security Finding | Test File | Test Case Description | Status |
|:---|:---|:---|:---:|
| **HIGH-01** (Reject Unconfirmed Email + Profile Match) | `local-database-verification.test.js` | `Local DB Schema [HIGH-01]: Invitation acceptance strictly resolves email from auth_users and rejects unconfirmed email even if profile matches` | **PASS** |
| **HIGH-01** (Reject Phone-Only Confirmation) | `local-database-verification.test.js` | `Local DB Schema [HIGH-01]: Invitation acceptance rejects phone-only confirmation in auth_users` | **PASS** |
| **HIGH-01** (Confirmed Matching Email Success) | `local-database-verification.test.js` | `Local DB Schema [HIGH-01]: Invitation acceptance succeeds for confirmed matching auth_users email` | **PASS** |
| **HIGH-01** (Confirmed Mismatching Email Rejected) | `local-database-verification.test.js` | `Local DB Schema [HIGH-01]: Invitation acceptance rejects confirmed but mismatching email` | **PASS** |
| **HIGH-01** (Reject Unconfirmed Email + Profile Match) | `invitation-lifecycle.test.js` | `Invitations RPC [HIGH-01]: accept_invitation_atomic rejects unconfirmed email even when profile email matches` | **PASS** |
| **HIGH-01** (Reject Phone-Only Confirmation) | `invitation-lifecycle.test.js` | `Invitations RPC [HIGH-01]: accept_invitation_atomic rejects phone-only confirmation` | **PASS** |
| **HIGH-01** (Confirmed Matching Email Success) | `invitation-lifecycle.test.js` | `Invitations RPC [HIGH-01]: accept_invitation_atomic succeeds for confirmed matching auth.users email` | **PASS** |
| **HIGH-01** (Confirmed Mismatching Email Rejected) | `invitation-lifecycle.test.js` | `Invitations RPC [HIGH-01]: accept_invitation_atomic rejects confirmed but mismatching email` | **PASS** |
| **HIGH-01** (Expired Invitation Rejected) | `invitation-lifecycle.test.js` | `Invitations RPC [HIGH-01]: accept_invitation_atomic rejects expired invitation token` | **PASS** |
| **SEC-01** (`team_members` RLS) | `postgresql-rls.test.js` | `PostgreSQL RLS [SEC-01]: User can view team members only in their organization` | **PASS** |
| **SEC-01** (`team_members` RLS) | `postgresql-rls.test.js` | `PostgreSQL RLS [SEC-01]: Cross-tenant insert into team_members is blocked by RLS` | **PASS** |
| **SEC-01** (`team_members` RLS) | `postgresql-rls.test.js` | `PostgreSQL RLS [SEC-01]: Regular agent without org:teams:write cannot insert into team_members` | **PASS** |
| **SEC-01** (`team_members` Schema) | `local-database-verification.test.js` | `Local DB Schema [SEC-01]: team_members enforces composite primary key` | **PASS** |
| **SEC-02** (RBAC Tables RLS) | `postgresql-rls.test.js` | `PostgreSQL RLS [SEC-02]: Authenticated users can read roles` | **PASS** |
| **SEC-02** (RBAC Tables RLS) | `postgresql-rls.test.js` | `PostgreSQL RLS [SEC-02]: Non-super-admin cannot modify role permissions` | **PASS** |
| **SEC-02** (Config Tables RLS) | `postgresql-rls.test.js` | `PostgreSQL RLS [SEC-02]: Non-super-admin cannot read or update system settings` | **PASS** |
| **SEC-02** (Config Tables RLS) | `postgresql-rls.test.js` | `PostgreSQL RLS [SEC-02]: Super-admin can read system settings` | **PASS** |
| **SEC-03** (Identity Lock in Acceptance) | `invitation-lifecycle.test.js` | `Invitations RPC [SEC-03]: accept_invitation_atomic requires authenticated session and binds caller` | **PASS** |
| **SEC-04** (Profile Email Immutability) | `postgresql-rls.test.js` | `PostgreSQL RLS [SEC-04]: User cannot directly modify profile email` | **PASS** |
| **SEC-04** (Profile Email Trigger) | `local-database-verification.test.js` | `Local DB Schema [SEC-04]: Profile email cannot be updated directly` | **PASS** |
| **SEC-04** (Email Mismatch Reject) | `invitation-lifecycle.test.js` | `Invitations RPC [Negative]: accept_invitation_atomic rejects mismatched email` | **PASS** |
| **SEC-05** (Read-Only Lookup / No Writes) | `invitation-lifecycle.test.js` | `Invitations RPC [SEC-05]: get_invitation_by_token performs no database writes` | **PASS** |
| **SEC-06** (`auth.uid()` Portability) | `postgresql-rls.test.js` | Verified `public.current_auth_user_id()` serves as primary tenant claim extractor across all helper functions | **PASS** |
| **SEC-07** (Email Privacy Masking) | `invitation-lifecycle.test.js` | `Invitations RPC: get_invitation_by_token returns masked info for anonymous and full for matching caller (SEC-07)` | **PASS** |
| **OBS-01** (Revoke Direct EXECUTE) | `invitation-lifecycle.test.js` | `Invitations RPC [OBS-01]: PUBLIC cannot directly execute mask_email() RPC` | **PASS** |
| **OBS-01** (Revoke Direct EXECUTE) | `postgresql-rls.test.js` | `PostgreSQL RLS [OBS-01]: PUBLIC/anon/authenticated cannot directly execute mask_email()` | **PASS** |
| **OBS-01** (Internal Execution Intact) | `postgresql-rls.test.js` | `PostgreSQL RLS [OBS-01]: Invitation lookup RPC still executes internal masking helper` | **PASS** |
| **OBS-02** (Verified Auth Email Sync) | `local-database-verification.test.js` | `Local DB Schema [OBS-02]: Verified Auth email changes synchronize the matching profile` | **PASS** |
| **OBS-02** (Unverified Auth Email Blocked) | `local-database-verification.test.js` | `Local DB Schema [OBS-02]: Unverified email changes do NOT synchronize profile` | **PASS** |
| **OBS-02** (Pending Confirmation Blocked) | `local-database-verification.test.js` | `Local DB Schema [OBS-02]: Pending email change (email_change = email) does NOT synchronize profile` | **PASS** |
| **OBS-02** (Cross-User Isolation) | `local-database-verification.test.js` | `Local DB Schema [OBS-02]: One user Auth email cannot update another user profile` | **PASS** |
| **OBS-02** (Verified Auth Email Sync) | `postgresql-rls.test.js` | `PostgreSQL RLS [OBS-02]: Verified Auth email changes synchronize the matching profile` | **PASS** |
| **OBS-02** (Unverified Auth Email Blocked) | `postgresql-rls.test.js` | `PostgreSQL RLS [OBS-02]: Unverified Auth email changes do NOT synchronize profile` | **PASS** |
| **OBS-02** (Cross-User Isolation) | `postgresql-rls.test.js` | `PostgreSQL RLS [OBS-02]: One user Auth email cannot update another user profile` | **PASS** |
| **FINDING 1** (GUC Bypass Prevented) | `local-database-verification.test.js` | `Local DB Schema [FINDING 1]: Setting custom configuration variable does NOT bypass profile email immutability` | **PASS** |
| **FINDING 1** (GUC Bypass Prevented) | `postgresql-rls.test.js` | `PostgreSQL RLS [FINDING 1]: Caller cannot bypass profile email immutability via custom GUC or parameters` | **PASS** |
| **FINDING 2** (Phone-Only Confirmation Blocked) | `local-database-verification.test.js` | `Local DB Schema [FINDING 2]: Phone-only confirmation does NOT authorize email synchronization` | **PASS** |
| **FINDING 2** (Phone-Only Confirmation Blocked) | `postgresql-rls.test.js` | `PostgreSQL RLS [FINDING 2]: Phone-only confirmation (emailConfirmedAt is null) does NOT synchronize email` | **PASS** |
| **FINDING 2** (Stale Confirmation Blocked) | `local-database-verification.test.js` | `Local DB Schema [FINDING 2]: Stale historical confirmation timestamp does NOT authorize email synchronization` | **PASS** |
| **FINDING 2** (Stale Confirmation Blocked) | `postgresql-rls.test.js` | `PostgreSQL RLS [FINDING 2]: Stale historical email_confirmed_at timestamp does NOT synchronize newly changed email` | **PASS** |
| **FINDING 2** (Pending Change Blocked) | `postgresql-rls.test.js` | `PostgreSQL RLS [FINDING 2]: Pending email change (emailChange === newEmail) does NOT synchronize profile` | **PASS** |
| **FINDING 2** (Fail-Closed Auth Failure) | `postgresql-rls.test.js` | `PostgreSQL RLS [FINDING 2]: Failed Auth verification rejects synchronization (fail-closed)` | **PASS** |
| **FINDING 3** (Column-Level UPDATE Restriction) | `postgresql-rls.test.js` | `PostgreSQL RLS [FINDING 3]: Authenticated user cannot update profiles.email directly through PostgREST permissions` | **PASS** |
| **FINDING 3** (Allowed Profile Columns Success) | `postgresql-rls.test.js` | `PostgreSQL RLS [FINDING 3]: Authenticated user can still update allowed profile columns` | **PASS** |

---

## 3. Comprehensive Breakdown of All 100 Tests

### 3.1 Organization Onboarding & Context Switching (5 Tests)
- `Organization Onboarding: Atomically creates organization and owner membership` — **PASS**
- `Organization Onboarding [Negative Test]: Prevents duplicate slug creation` — **PASS**
- `Organization Switching: Allows user belonging to multiple organizations to switch context` — **PASS**
- `Organization Switching [Negative Test]: Denies switching to revoked or suspended organization` — **PASS**
- `Audit Logging: Redacts passwords and tokens from audit payloads` — **PASS**

### 3.2 Real Relational In-Memory Database Tests via `node:sqlite` (17 Tests)
- `Local DB Schema: Foreign keys and unique constraints enforce data integrity` — **PASS**
- `Local DB Schema: Audit log immutability triggers prevent tampering` — **PASS**
- `Local DB Schema: Invitations enforce single active invite per email and unique token hash` — **PASS**
- `Local DB Transactions: Atomic organization onboarding transaction rollbacks on failure` — **PASS**
- `Local DB Schema [SEC-04]: Profile email cannot be updated directly` — **PASS**
- `Local DB Schema [SEC-01]: team_members enforces composite primary key` — **PASS**
- `Local DB Schema [OBS-02]: Verified Auth email changes synchronize the matching profile` — **PASS**
- `Local DB Schema [OBS-02]: Unverified email changes do NOT synchronize profile` — **PASS**
- `Local DB Schema [OBS-02]: Pending email change (email_change = email) does NOT synchronize profile` — **PASS**
- `Local DB Schema [OBS-02]: One user Auth email cannot update another user profile` — **PASS**
- `Local DB Schema [FINDING 1]: Setting custom configuration variable does NOT bypass profile email immutability` — **PASS**
- `Local DB Schema [FINDING 2]: Phone-only confirmation does NOT authorize email synchronization` — **PASS**
- `Local DB Schema [FINDING 2]: Stale historical confirmation timestamp does NOT authorize email synchronization` — **PASS**
- `Local DB Schema [HIGH-01]: Invitation acceptance strictly resolves email from auth_users and rejects unconfirmed email even if profile matches` — **PASS**
- `Local DB Schema [HIGH-01]: Invitation acceptance rejects phone-only confirmation in auth_users` — **PASS**
- `Local DB Schema [HIGH-01]: Invitation acceptance succeeds for confirmed matching auth_users email` — **PASS**
- `Local DB Schema [HIGH-01]: Invitation acceptance rejects confirmed but mismatching email` — **PASS**

### 3.3 PostgreSQL Multi-Tenant Row Level Security Simulator (34 Tests)
- `PostgreSQL RLS [Negative Test 1]: Org A cannot SELECT Org B records` — **PASS**
- `PostgreSQL RLS [Negative Test 2]: Org A cannot UPDATE Org B records` — **PASS**
- `PostgreSQL RLS [Negative Test 3]: Org A cannot DELETE Org B records` — **PASS**
- `PostgreSQL RLS [Negative Test 4]: Revoked or suspended user immediately loses SELECT access` — **PASS**
- `PostgreSQL RLS [Negative Test 5]: Uninvited user has zero access to tenant tables` — **PASS**
- `PostgreSQL RLS [Negative Test 6]: Regular agent cannot elevate themselves to org_owner` — **PASS**
- `PostgreSQL RLS [Negative Test 7]: Forged organization_id in update payload is rejected by WITH CHECK` — **PASS**
- `PostgreSQL RLS [Negative Test 8]: Cannot suspend or demote the last remaining Organization Owner` — **PASS**
- `PostgreSQL RLS: Platform super-admin can observe cross-tenant records for support` — **PASS**
- `PostgreSQL RLS: Authenticated user can INSERT own profile with is_platform_admin=false` — **PASS**
- `PostgreSQL RLS [Negative Test 9]: Authenticated user cannot INSERT profile for another user ID` — **PASS**
- `PostgreSQL RLS [Negative Test 10]: Authenticated user cannot self-grant is_platform_admin=true on INSERT` — **PASS**
- `PostgreSQL RLS [Negative Test 11]: Authenticated user cannot elevate is_platform_admin=true on UPDATE` — **PASS**
- `PostgreSQL RLS: Super-admin can grant is_platform_admin=true` — **PASS**
- `PostgreSQL RLS [SEC-01]: User can view team members only in their organization` — **PASS**
- `PostgreSQL RLS [SEC-01]: Cross-tenant insert into team_members is blocked by RLS` — **PASS**
- `PostgreSQL RLS [SEC-01]: Regular agent without org:teams:write cannot insert into team_members` — **PASS**
- `PostgreSQL RLS [SEC-02]: Authenticated users can read roles` — **PASS**
- `PostgreSQL RLS [SEC-02]: Non-super-admin cannot modify role permissions` — **PASS**
- `PostgreSQL RLS [SEC-02]: Non-super-admin cannot read or update system settings` — **PASS**
- `PostgreSQL RLS [SEC-02]: Super-admin can read system settings` — **PASS**
- `PostgreSQL RLS [SEC-04]: User cannot directly modify profile email` — **PASS**
- `PostgreSQL RLS [OBS-01]: PUBLIC/anon/authenticated cannot directly execute mask_email()` — **PASS**
- `PostgreSQL RLS [OBS-01]: Invitation lookup RPC still executes internal masking helper` — **PASS**
- `PostgreSQL RLS [OBS-02]: Verified Auth email changes synchronize the matching profile` — **PASS**
- `PostgreSQL RLS [OBS-02]: Unverified Auth email changes do NOT synchronize profile` — **PASS**
- `PostgreSQL RLS [OBS-02]: One user Auth email cannot update another user profile` — **PASS**
- `PostgreSQL RLS [FINDING 1]: Caller cannot bypass profile email immutability via custom GUC or parameters` — **PASS**
- `PostgreSQL RLS [FINDING 2]: Phone-only confirmation (emailConfirmedAt is null) does NOT synchronize email` — **PASS**
- `PostgreSQL RLS [FINDING 2]: Pending email change (emailChange === newEmail) does NOT synchronize profile` — **PASS**
- `PostgreSQL RLS [FINDING 3]: Authenticated user cannot update profiles.email directly through PostgREST permissions` — **PASS**
- `PostgreSQL RLS [FINDING 3]: Authenticated user can still update allowed profile columns` — **PASS**
- `PostgreSQL RLS [FINDING 2]: Failed Auth verification rejects synchronization (fail-closed)` — **PASS**
- `PostgreSQL RLS [FINDING 2]: Stale historical email_confirmed_at timestamp does NOT synchronize newly changed email` — **PASS**

### 3.4 AI Orchestration & Tool RBAC Authorization (4 Tests)
- `AI Orchestration: Unregistered tool execution is rejected` — **PASS**
- `AI Orchestration: Unauthorized tool call is blocked by RBAC` — **PASS**
- `AI Orchestration: Sensitive tool is paused for Human-in-the-Loop approval` — **PASS**
- `AI Orchestration: Safe informational tool executes immediately` — **PASS**

### 3.5 Billing, Plans & Tier Quotas (3 Tests)
- `Billing & Quotas: Solo Starter limits enforcement` — **PASS**
- `Billing & Quotas: Boutique Agency multi-agent scaling` — **PASS**
- `Billing & Quotas: Hard cap triggers upgrade requirement` — **PASS**

### 3.6 Invitation Lifecycle & Secure RPCs (17 Tests)
- `Invitations: Token hashing produces consistent SHA-256 hashes` — **PASS**
- `Invitations: Successfully creates and accepts an invitation` — **PASS**
- `Invitations [Negative Test]: Prevents duplicate active pending invitations` — **PASS**
- `Invitations [Negative Test]: Rejects consumption of expired tokens` — **PASS**
- `Invitations [Negative Test]: Rejects token reuse after acceptance` — **PASS**
- `Invitations [Negative Test]: Prevents accepting invitation with mismatched email address` — **PASS**
- `Invitations RPC: get_invitation_by_token returns masked info for anonymous and full for matching caller (SEC-07)` — **PASS**
- `Invitations RPC [SEC-05]: get_invitation_by_token performs no database writes` — **PASS**
- `Invitations RPC [SEC-03]: accept_invitation_atomic requires authenticated session and binds caller` — **PASS**
- `Invitations RPC [Negative]: accept_invitation_atomic rejects mismatched email` — **PASS**
- `Invitations RPC [Negative]: accept_invitation_atomic rejects double acceptance` — **PASS**
- `Invitations RPC [OBS-01]: PUBLIC cannot directly execute mask_email() RPC` — **PASS**
- `Invitations RPC [HIGH-01]: accept_invitation_atomic rejects unconfirmed email even when profile email matches` — **PASS**
- `Invitations RPC [HIGH-01]: accept_invitation_atomic rejects phone-only confirmation` — **PASS**
- `Invitations RPC [HIGH-01]: accept_invitation_atomic succeeds for confirmed matching auth.users email` — **PASS**
- `Invitations RPC [HIGH-01]: accept_invitation_atomic rejects confirmed but mismatching email` — **PASS**
- `Invitations RPC [HIGH-01]: accept_invitation_atomic rejects expired invitation token` — **PASS**

### 3.7 Granular RBAC & Permissions Engine (13 Tests)
- `Permissions: Super Admin has platform-wide universal permissions` — **PASS**
- `Permissions: Org Owner has billing manage permission` — **PASS**
- `Permissions: Org Admin cannot manage billing but can manage properties` — **PASS**
- `Permissions: Agent cannot publish property directly or approve AI actions` — **PASS**
- `RBAC: All 8 core roles are defined in permission matrix` — **PASS**
- `RBAC: Org Owner has full administrative permissions including billing:manage` — **PASS**
- `RBAC: Org Admin has administrative permissions but cannot manage billing` — **PASS**
- `RBAC: Standard Agent has operational permissions but lacks admin & publish capabilities` — **PASS**
- `RBAC: requirePermission throws AccessDenied when permission is missing` — **PASS**
- `RBAC: requireOrganizationMembership prevents cross-tenant access` — **PASS**
- `RBAC: requireActiveOrganization enforces non-null context` — **PASS**
- `RBAC: requireBranchAccess enforces branch boundaries for standard agents` — **PASS**
- `RBAC: requireTeamAccess enforces team boundaries` — **PASS**

### 3.8 Tenant Isolation & Switching (3 Tests)
- `Tenant Isolation: Validates that every record requires an organization_id` — **PASS**
- `Tenant Isolation [Negative Test]: Org A CANNOT read Org B records` — **PASS**
- `Tenant Switching: Validates user membership before permitting organization switch` — **PASS**

### 3.9 Validation Schemas (4 Tests)
- `Validation: Email format verification` — **PASS**
- `Validation: Workspace Slug rules` — **PASS**
- `Validation: Strong Password verification` — **PASS**
- `Validation: Property listing input validation` — **PASS**

### 3.7 Granular RBAC & Permissions Engine (13 Tests)
- `Permissions: Super Admin has platform-wide universal permissions` — **PASS**
- `Permissions: Org Owner has billing manage permission` — **PASS**
- `Permissions: Org Admin cannot manage billing but can manage properties` — **PASS**
- `Permissions: Agent cannot publish property directly or approve AI actions` — **PASS**
- `RBAC: All 8 core roles are defined in permission matrix` — **PASS**
- `RBAC: Org Owner has full administrative permissions including billing:manage` — **PASS**
- `RBAC: Org Admin has administrative permissions but cannot manage billing` — **PASS**
- `RBAC: Standard Agent has operational permissions but lacks admin & publish capabilities` — **PASS**
- `RBAC: requirePermission throws AccessDenied when permission is missing` — **PASS**
- `RBAC: requireOrganizationMembership prevents cross-tenant access` — **PASS**
- `RBAC: requireActiveOrganization enforces non-null context` — **PASS**
- `RBAC: requireBranchAccess enforces branch boundaries for standard agents` — **PASS**
- `RBAC: requireTeamAccess enforces team boundaries` — **PASS**

### 3.8 Tenant Isolation & Switching (3 Tests)
- `Tenant Isolation: Validates that every record requires an organization_id` — **PASS**
- `Tenant Isolation [Negative Test]: Org A CANNOT read Org B records` — **PASS**
- `Tenant Switching: Validates user membership before permitting organization switch` — **PASS**

### 3.9 Validation Schemas (4 Tests)
- `Validation: Email format verification` — **PASS**
- `Validation: Workspace Slug rules` — **PASS**
- `Validation: Strong Password verification` — **PASS**
- `Validation: Property listing input validation` — **PASS**

---

## 4. Testing Environment Honesty Statement

- **Framework**: Native Node.js Test Runner (`node --test`).
- **Engines Used**:
  1. `node:sqlite DatabaseSync`: Embedded SQL database testing tables, foreign keys, triggers, constraints, rollbacks.
  2. JavaScript RLS Policy Simulator: Exact algorithmic modeling of PostgreSQL `USING` and `WITH CHECK` clauses.
- **Explicit Limitation**:
  - **Docker is NOT installed** on this machine.
  - **Local PostgreSQL service is NOT running**.
  - **No live PostgreSQL instance was used for this test run**.
  - Live PostgreSQL RLS policy verification remains to be confirmed once deployed to Supabase or when a live PostgreSQL connection is provided.

---

## 5. Security Invariant Confirmation

- [x] **Remote Supabase remains untouched**: Zero requests, connections, or DDL operations made to remote endpoints.
- [x] **`supabase db push` was NOT executed**.
- [x] **Phase 2 has NOT been started**.
- [x] **Zero secrets or tokens exposed in logs or source control**.
