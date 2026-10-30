'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  signInWithPassword,
  signUpWithPassword,
  signOut,
  resetPasswordForEmail,
  updateUserPassword,
  createOrganizationWithOwner,
  validateOrganizationSwitch,
  createOrganizationInvitation,
  ACTIVE_ORG_COOKIE,
  recordAuditLog,
} from '@estatepilot/auth';
import { createServerClient } from '@estatepilot/database';
import {
  LoginSchema,
  RegisterSchema,
  PasswordResetRequestSchema,
  PasswordResetConfirmSchema,
  CreateOrganizationSchema,
  CreateInvitationSchema,
} from '@estatepilot/validation';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

function getSupabaseClient() {
  const cookieStore = cookies();
  const token = cookieStore.get('sb-access-token')?.value || '';
  return createServerClient(token);
}

/**
 * Server Action: Authenticate user with credentials
 */
export async function loginAction(formData: FormData): Promise<ActionResponse> {
  const rawEmail = formData.get('email') as string;
  const rawPassword = formData.get('password') as string;

  const parsed = LoginSchema.safeParse({ email: rawEmail, password: rawPassword });
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || 'Invalid input' };
  }

  const client = getSupabaseClient();
  const res = await signInWithPassword(client, parsed.data);

  if (!res.ok) {
    return { success: false, error: res.error.message };
  }

  // Set session cookie if token available
  const cookieStore = cookies();
  if (res.value.sessionToken) {
    cookieStore.set('sb-access-token', res.value.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
  }

  // Audit login
  await recordAuditLog(client, {
    userId: res.value.user.id,
    action: 'user.login',
    entityType: 'profile',
    entityId: res.value.user.id,
  });

  return { success: true };
}

/**
 * Server Action: Register user account
 */
export async function registerAction(formData: FormData): Promise<ActionResponse<{ requiresVerification: boolean }>> {
  const parsed = RegisterSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || 'Invalid registration details' };
  }

  const client = getSupabaseClient();
  const res = await signUpWithPassword(client, parsed.data);

  if (!res.ok) {
    return { success: false, error: res.error.message };
  }

  // Audit registration
  await recordAuditLog(client, {
    userId: res.value.user.id,
    action: 'user.registered',
    entityType: 'profile',
    entityId: res.value.user.id,
    diff: { email: parsed.data.email },
  });

  return {
    success: true,
    data: { requiresVerification: res.value.requiresEmailVerification },
  };
}

/**
 * Server Action: User Sign out
 */
export async function logoutAction(): Promise<void> {
  const client = getSupabaseClient();
  const cookieStore = cookies();

  await signOut(client);
  cookieStore.delete('sb-access-token');
  cookieStore.delete(ACTIVE_ORG_COOKIE);

  redirect('/auth/login');
}

/**
 * Server Action: Password recovery request
 */
export async function forgotPasswordAction(formData: FormData): Promise<ActionResponse> {
  const email = formData.get('email') as string;
  const parsed = PasswordResetRequestSchema.safeParse({ email });

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || 'Invalid email address' };
  }

  const client = getSupabaseClient();
  const res = await resetPasswordForEmail(client, parsed.data.email);

  if (!res.ok) {
    return { success: false, error: res.error.message };
  }

  return { success: true };
}

/**
 * Server Action: Update password
 */
export async function resetPasswordAction(formData: FormData): Promise<ActionResponse> {
  const newPassword = formData.get('newPassword') as string;
  const parsed = PasswordResetConfirmSchema.safeParse({ newPassword });

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || 'Invalid password format' };
  }

  const client = getSupabaseClient();
  const res = await updateUserPassword(client, parsed.data.newPassword);

  if (!res.ok) {
    return { success: false, error: res.error.message };
  }

  return { success: true };
}

/**
 * Server Action: Organization Onboarding (Atomic Creation with Owner)
 */
export async function createOrganizationAction(formData: FormData): Promise<ActionResponse<{ organizationId: string; slug: string }>> {
  const parsed = CreateOrganizationSchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
    orgType: formData.get('orgType'),
    defaultCurrency: formData.get('defaultCurrency') || 'USD',
    defaultTimezone: formData.get('defaultTimezone') || 'UTC',
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || 'Invalid organization settings' };
  }

  const client = getSupabaseClient();
  const cookieStore = cookies();
  const userId = cookieStore.get('sb-user-id')?.value || '00000000-0000-0000-0000-000000000001';

  const res = await createOrganizationWithOwner(client, {
    name: parsed.data.name,
    slug: parsed.data.slug,
    orgType: parsed.data.orgType,
    defaultCurrency: parsed.data.defaultCurrency,
    defaultTimezone: parsed.data.defaultTimezone,
    userId,
  });

  if (!res.ok) {
    return { success: false, error: res.error.message };
  }

  // Set the newly created organization as active
  cookieStore.set(ACTIVE_ORG_COOKIE, res.value.organizationId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return { success: true, data: res.value };
}

/**
 * Server Action: Switch Active Organization
 */
export async function switchOrganizationAction(targetOrgId: string): Promise<ActionResponse> {
  const client = getSupabaseClient();
  const cookieStore = cookies();
  const userId = cookieStore.get('sb-user-id')?.value || '00000000-0000-0000-0000-000000000001';

  const validation = await validateOrganizationSwitch(client, userId, targetOrgId);
  if (!validation.ok) {
    return { success: false, error: validation.error.message };
  }

  cookieStore.set(ACTIVE_ORG_COOKIE, targetOrgId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  await recordAuditLog(client, {
    organizationId: targetOrgId,
    userId,
    action: 'organization.switched',
    entityType: 'organization',
    entityId: targetOrgId,
  });

  return { success: true };
}

/**
 * Server Action: Invite a new member to the organization
 */
export async function inviteMemberAction(formData: FormData): Promise<ActionResponse> {
  const parsed = CreateInvitationSchema.safeParse({
    email: formData.get('email'),
    roleCode: formData.get('roleCode'),
    branchId: formData.get('branchId') || null,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || 'Invalid invitation fields' };
  }

  const client = getSupabaseClient();
  const cookieStore = cookies();
  const activeOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
  const userId = cookieStore.get('sb-user-id')?.value || '00000000-0000-0000-0000-000000000001';

  if (!activeOrgId) {
    return { success: false, error: 'No active organization selected' };
  }

  const res = await createOrganizationInvitation(client, {
    organizationId: activeOrgId,
    email: parsed.data.email,
    roleCode: parsed.data.roleCode,
    branchId: parsed.data.branchId,
    invitedByUserId: userId,
  });

  if (!res.ok) {
    return { success: false, error: res.error.message };
  }

  return { success: true, data: { email: parsed.data.email, role: parsed.data.roleCode } };
}
