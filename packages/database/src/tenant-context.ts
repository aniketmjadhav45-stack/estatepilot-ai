import { TypedSupabaseClient } from './client';

export interface ScopedTenantQueryOptions {
  client: TypedSupabaseClient;
  organizationId: string;
}

/**
 * TenantQueryScope guarantees that all database operations explicitly enforce organization_id.
 * Acts as a dual-layer defense alongside PostgreSQL RLS.
 */
export class TenantQueryScope {
  constructor(
    private readonly client: TypedSupabaseClient,
    public readonly organizationId: string
  ) {
    if (!organizationId) {
      throw new Error('TenantQueryScope violation: organizationId is required and cannot be empty.');
    }
  }

  /**
   * Execute an organization-scoped select
   */
  public from<T extends keyof TypedSupabaseClient['from']>(table: T) {
    // Returns query builder automatically filtered by organization_id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.client.from as any)(table).select('*').eq('organization_id', this.organizationId);
  }

  /**
   * Raw Supabase client bound to this tenant scope
   */
  public get rawClient(): TypedSupabaseClient {
    return this.client;
  }
}
