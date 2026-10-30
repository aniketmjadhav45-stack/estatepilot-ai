# EstatePilot AI — Phase 1 Security & Architecture Audit (docs/phase-1-audit.md)

**Audit Date**: October 2026  
**Auditor**: Lead Backend Architect & Security Engineer  
**Scope**: Authentication, Multi-Tenancy, Memberships, RBAC, Database Migrations, RLS Policies, and Frontend Auth  

---

## 1. Executive Summary

A comprehensive, zero-trust security inspection was performed across the complete repository, including `supabase/migrations/`, `packages/auth`, `packages/database`, `packages/permissions`, `packages/shared`, `packages/validation`, and `apps/web`.

While Phase 0 successfully laid out the modular monorepo skeleton, design system, and initial schema definitions, **multiple critical security vulnerabilities, incomplete authentication flows, and RLS recursion/escalation risks were identified**. 

This audit documents each finding and details the architectural remediation required for Phase 1.

---

## 2. Comprehensive Security & Architecture Findings

### Finding 1: Redefinition of Core System Function `auth.uid()`
- **Severity**: HIGH
- **Location**: `supabase/migrations/20261030000000_phase0_foundation.sql` (lines 249-256)
- **Vulnerability**: The migration script issues `CREATE OR REPLACE FUNCTION auth.uid()`. In standard Supabase environments, `auth.uid()` is a core system-provided function owned by the `supabase_admin` or `auth` role. Executing `CREATE OR REPLACE` inside the `auth` schema by standard migration roles fails with permission denied errors or risks altering Supabase's native JWT claim extraction logic.
- **Remediation**:
  - Check for existing `auth.uid()` and do not overwrite system functions in Supabase environments.
  - Provide a safe wrapper `public.current_auth_user_id()` or fallback to `auth.uid()` conditionally.

### Finding 2: Missing `search_path` on Privileged `SECURITY DEFINER` Functions
- **Severity**: CRITICAL
- **Location**: `public.current_user_org_ids()`, `public.is_org_member()`, `public.is_super_admin()`, `public.has_permission()`
- **Vulnerability**: Every `SECURITY DEFINER` function runs with the privileges of the function owner (superuser/postgres). None of the Phase 0 functions defined an explicit `search_path`. Without `SET search_path = public, pg_temp;`, an attacker with schema creation permissions can perform a search-path hijacking attack, substituting malicious functions or tables that execute with superuser privileges.
- **Remediation**: Every `SECURITY DEFINER` function must explicitly set `SET search_path = public, pg_temp;`.

### Finding 3: Default PUBLIC Execution Privileges on Sensitive Security Functions
- **Severity**: MEDIUM
- **Location**: Security helper functions (`is_super_admin`, `has_permission`, `current_user_org_ids`)
- **Vulnerability**: In PostgreSQL, functions are granted `EXECUTE` to `PUBLIC` by default. Unauthenticated roles (`anon`) could invoke internal permission evaluation functions directly.
- **Remediation**: Explicitly execute:
  ```sql
  REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
  ```

### Finding 4: Recursive Policy Risk on `memberships` & `has_permission`
- **Severity**: HIGH
- **Location**: `public.has_permission()` and `memberships` table RLS policies
- **Vulnerability**: 
  - `public.has_permission(org_id, perm)` queries `public.memberships`.
  - The RLS policy for `memberships FOR ALL` checks `has_permission(organization_id, 'org:members:write')`.
  - If `has_permission()` were executed without `SECURITY DEFINER` or within an unqualified query context, it triggers an infinite recursive loop: `memberships` policy -> calls `has_permission` -> queries `memberships` -> evaluates `memberships` policy.
- **Remediation**:
  - Guarantee `has_permission()` is strictly `SECURITY DEFINER` with fixed `search_path`.
  - Separate `memberships` RLS policies into distinct `SELECT`, `INSERT`, `UPDATE`, and `DELETE` rules.
  - Implement a dedicated bypass helper for internal membership checks (`public.check_membership_permission`).

### Finding 5: Privilege Escalation & Self-Role Mutation
- **Severity**: CRITICAL
- **Location**: `memberships` table update policies
- **Vulnerability**: In Phase 0, any member with `org:members:write` could update any row in `public.memberships`, including:
  1. Changing their own `role_id` to `org_owner` or `super_admin`.
  2. Modifying another administrator's membership to lock them out.
  3. Escalating a normal user to owner status.
- **Remediation**:
  - Implement a PostgreSQL trigger `prevent_membership_privilege_escalation()`:
    - Forbid a user from modifying their own `role_id` or `status`.
    - Restrict assigning `org_owner` or `super_admin` roles exclusively to authenticated `org_owner` or platform super-admins.
    - Ensure an organization must always retain at least one active `org_owner`.

### Finding 6: Non-Atomic Organization Onboarding (Orphaned Tenants)
- **Severity**: HIGH
- **Location**: Client-side onboarding flow
- **Vulnerability**: In Phase 0, creating an organization and assigning the initial owner membership were separate operations. If organization creation succeeds but membership assignment fails (e.g. network glitch or client disconnect), the tenant becomes an orphan: no user has membership, no user can access it, and RLS prevents anyone from claiming it.
- **Remediation**:
  - Implement a PostgreSQL transactional stored procedure `create_organization_with_owner()` that:
    1. Validates slug uniqueness and tenant parameters.
    2. Inserts into `public.organizations`.
    3. Finds the `org_owner` role ID.
    4. Inserts the initial active `memberships` record linking the authenticated user to the organization with `is_default = TRUE`.
    5. Creates default audit logs within the same transaction.

### Finding 7: Missing Organization Invitation System & Raw Token Exposure
- **Severity**: HIGH
- **Location**: Database schema and auth package
- **Vulnerability**: Phase 0 contained an `invited_by` column on `memberships`, but no table or mechanism to store pending invitations, track expiration, or verify cryptographic tokens. Storing raw invitation tokens in plain text in a database allows anyone with read access to hijack invitations.
- **Remediation**:
  - Create table `public.organization_invitations` with:
    - `id` (UUID), `organization_id`, `email`, `role_id`, `branch_id`, `token_hash` (SHA-256), `invited_by`, `expires_at`, `accepted_at`, `status`.
  - Enforce SHA-256 hashing so only the raw token sent via email can claim the invitation.
  - Prevent duplicate active invitations for the same email and organization.

### Finding 8: Active Organization Context Spoofing & Session Persistence
- **Severity**: HIGH
- **Location**: `packages/auth/src/organization-context.ts`
- **Vulnerability**: Phase 0 allowed passing an arbitrary `requestedOrgId`. While it checked membership, it lacked:
  - Secure HTTP-only cookie persistence for the active organization.
  - Immediate revocation handling: if a user's membership is revoked or suspended while their session is active, subsequent requests using cached organization IDs could proceed.
- **Remediation**:
  - Introduce `getVerifiedActiveOrganization(session, cookieStore)` that strictly verifies the active organization against the database on each server action/request.
  - If the requested organization is not active or membership is suspended, immediately switch to the user's default organization or force re-authentication.

### Finding 9: Mocked Frontend Authentication & Lack of Password Reset
- **Severity**: HIGH
- **Location**: `apps/web/src/app/auth/`
- **Vulnerability**:
  - Login and register forms used fake `setTimeout` redirects to `/dashboard`.
  - No password recovery (`/auth/forgot-password`), reset (`/auth/reset-password`), or organization onboarding (`/onboarding`) screens existed.
- **Remediation**:
  - Connect all auth pages to real Supabase SSR authentication methods.
  - Implement full password recovery and onboarding wizard with real validation.

### Finding 10: Missing Granular Branch & Team Authorization Helpers
- **Severity**: MEDIUM
- **Location**: `packages/permissions`
- **Vulnerability**: The permissions package only supported broad role lookups and lacked branch-scoped (`requireBranchAccess`) and team-scoped (`requireTeamAccess`) evaluation methods required for Multi-Branch and Enterprise agencies.
- **Remediation**: Add explicit branch and team scope guards.

---

## 3. Phase 1 Implementation Plan

1. **Database Migration (`supabase/migrations/20261031000000_phase1_auth_rls.sql`)**:
   - Fix `auth.uid()` compatibility.
   - Harden all `SECURITY DEFINER` functions with `search_path = public, pg_temp`.
   - Add `organization_invitations` table with token hashing and RLS.
   - Add `create_organization_with_owner` atomic stored procedure.
   - Add `prevent_membership_privilege_escalation` trigger.
   - Separate and harden RLS policies on `organizations`, `memberships`, `invitations`, `branches`, `teams`.
2. **Auth & Database Packages**:
   - Implement Supabase SSR client with secure cookies (`packages/auth`, `packages/database`).
   - Implement complete invitation lifecycle (generate token, hash token, accept, reject).
   - Implement active organization switcher with server-side cookie verification.
   - Implement complete RBAC authorization helpers (`requirePermission`, `requireActiveOrganization`, `requireBranchAccess`, `requireTeamAccess`).
3. **Frontend Integration (`apps/web`)**:
   - Real login, register, forgot-password, reset-password, and onboarding pages.
   - Functional Organization Switcher with server action.
   - Member invitation and management UI.
4. **Automated Verification**:
   - Unit tests, multi-tenant isolation tests, RBAC tests, negative RLS tests, invitation token verification, and integration tests.
