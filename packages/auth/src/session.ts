import { UserProfile, Result, ok, err } from '@estatepilot/shared';
import { TypedSupabaseClient } from '@estatepilot/database';

export interface AuthSuccess {
  user: UserProfile;
  sessionToken?: string;
}

/**
 * Registers a new user with email and password via Supabase Auth
 */
export async function signUpWithPassword(
  client: TypedSupabaseClient,
  params: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    emailRedirectTo?: string;
  }
): Promise<Result<{ user: UserProfile; requiresEmailVerification: boolean }, Error>> {
  try {
    const { data, error } = await client.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          first_name: params.firstName,
          last_name: params.lastName,
        },
        emailRedirectTo: params.emailRedirectTo,
      },
    });

    if (error || !data.user) {
      return err(new Error(error?.message || 'Registration failed'));
    }

    // Check if Supabase session is established or email confirmation is pending
    const requiresVerification = !data.session && !data.user.confirmed_at;

    // Ensure profile row exists
    await client
      .from('profiles')
      .upsert({
        id: data.user.id,
        email: params.email.toLowerCase(),
        first_name: params.firstName,
        last_name: params.lastName,
        time_zone: 'UTC',
        locale: 'en-US',
        is_platform_admin: false,
      })
      .select()
      .maybeSingle();

    const profile: UserProfile = {
      id: data.user.id,
      email: params.email.toLowerCase(),
      firstName: params.firstName,
      lastName: params.lastName,
      avatarUrl: null,
      phone: null,
      timeZone: 'UTC',
      locale: 'en-US',
      isPlatformAdmin: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return ok({
      user: profile,
      requiresEmailVerification: requiresVerification,
    });
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Authenticates a user with email and password
 */
export async function signInWithPassword(
  client: TypedSupabaseClient,
  credentials: { email: string; password: string }
): Promise<Result<AuthSuccess, Error>> {
  try {
    const { data, error } = await client.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error || !data.user) {
      return err(new Error(error?.message || 'Invalid email or password'));
    }

    const { data: profileData } = await client
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    const userProfile: UserProfile = {
      id: data.user.id,
      email: data.user.email || credentials.email,
      firstName: profileData?.first_name || data.user.user_metadata?.first_name || '',
      lastName: profileData?.last_name || data.user.user_metadata?.last_name || '',
      phone: profileData?.phone || null,
      avatarUrl: profileData?.avatar_url || null,
      timeZone: profileData?.time_zone || 'UTC',
      locale: profileData?.locale || 'en-US',
      isPlatformAdmin: profileData?.is_platform_admin || false,
      createdAt: profileData?.created_at || new Date().toISOString(),
      updatedAt: profileData?.updated_at || new Date().toISOString(),
    };

    return ok({
      user: userProfile,
      sessionToken: data.session?.access_token,
    });
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Signs out the current user session
 */
export async function signOut(client: TypedSupabaseClient): Promise<Result<void, Error>> {
  try {
    const { error } = await client.auth.signOut();
    if (error) {
      return err(new Error(error.message));
    }
    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Sends a password recovery email
 */
export async function resetPasswordForEmail(
  client: TypedSupabaseClient,
  email: string,
  redirectTo?: string
): Promise<Result<void, Error>> {
  try {
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) {
      return err(new Error(error.message));
    }
    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Updates the user's password once authenticated or during password reset flow
 */
export async function updateUserPassword(
  client: TypedSupabaseClient,
  newPassword: string
): Promise<Result<void, Error>> {
  try {
    const { error } = await client.auth.updateUser({
      password: newPassword,
    });
    if (error) {
      return err(new Error(error.message));
    }
    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Validates the authenticated session user
 */
export async function getSessionUser(
  client: TypedSupabaseClient
): Promise<Result<UserProfile, Error>> {
  try {
    const { data: authData, error: authError } = await client.auth.getUser();

    if (authError || !authData.user) {
      return err(new Error(authError?.message || 'Unauthenticated session'));
    }

    const { data: profileData } = await client
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    return ok({
      id: authData.user.id,
      email: authData.user.email || '',
      firstName: profileData?.first_name || authData.user.user_metadata?.first_name || '',
      lastName: profileData?.last_name || authData.user.user_metadata?.last_name || '',
      phone: profileData?.phone || null,
      avatarUrl: profileData?.avatar_url || null,
      timeZone: profileData?.time_zone || 'UTC',
      locale: profileData?.locale || 'en-US',
      isPlatformAdmin: profileData?.is_platform_admin || false,
      createdAt: profileData?.created_at || new Date().toISOString(),
      updatedAt: profileData?.updated_at || new Date().toISOString(),
    });
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}
