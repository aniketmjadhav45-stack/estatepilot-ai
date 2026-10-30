import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './types';

export type TypedSupabaseClient = SupabaseClient<Database>;

export interface CookieMethodsServer {
  getAll: () => { name: string; value: string }[] | Promise<{ name: string; value: string }[]>;
  setAll: (cookies: { name: string; value: string; options?: Record<string, unknown> }[]) => void | Promise<void>;
}

/**
 * Creates a browser-safe Supabase client.
 * Safe for client-side usage; queries are governed strictly by RLS policies.
 */
export function createBrowserClient(
  supabaseUrl?: string,
  supabaseAnonKey?: string
): TypedSupabaseClient {
  const url = supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = supabaseAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!url || !key) {
    return createClient<Database>(
      url || 'https://placeholder.supabase.co',
      key || 'placeholder-anon-key'
    );
  }

  return createClient<Database>(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

/**
 * Creates an authenticated server-side Supabase client using cookie persistence
 * or a user bearer token.
 */
export function createServerClient(
  accessToken?: string,
  supabaseUrl?: string,
  supabaseAnonKey?: string
): TypedSupabaseClient {
  const url = supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = supabaseAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  return createClient<Database>(url || 'https://placeholder.supabase.co', key || 'placeholder-anon-key', {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers,
    },
  });
}

/**
 * Creates a privileged service-role Supabase client.
 * STRICTLY FOR INTERNAL BACKGROUND JOBS, MIGRATIONS, AND SUPER-ADMIN AUDITED SESSIONS.
 * NEVER expose this client or its key to the browser!
 */
export function createAdminClient(): TypedSupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  return createClient<Database>(
    url || 'https://placeholder.supabase.co',
    serviceKey || 'placeholder-service-key',
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}
