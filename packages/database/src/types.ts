export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          first_name: string | null;
          last_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          time_zone: string;
          locale: string;
          is_platform_admin: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          first_name?: string | null;
          last_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          time_zone?: string;
          locale?: string;
          is_platform_admin?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          org_type: 'individual' | 'agency' | 'enterprise';
          default_currency: string;
          default_timezone: string;
          logo_url: string | null;
          website: string | null;
          settings: Json;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          org_type?: 'individual' | 'agency' | 'enterprise';
          default_currency?: string;
          default_timezone?: string;
          logo_url?: string | null;
          website?: string | null;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['organizations']['Insert']>;
      };
      memberships: {
        Row: {
          id: string;
          organization_id: string;
          profile_id: string;
          role_id: string;
          branch_id: string | null;
          status: 'active' | 'invited' | 'suspended';
          is_default: boolean;
          invited_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          profile_id: string;
          role_id: string;
          branch_id?: string | null;
          status?: 'active' | 'invited' | 'suspended';
          is_default?: boolean;
          invited_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['memberships']['Insert']>;
      };
      organization_invitations: {
        Row: {
          id: string;
          organization_id: string;
          email: string;
          role_id: string;
          branch_id: string | null;
          token_hash: string;
          invited_by: string;
          expires_at: string;
          accepted_at: string | null;
          status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'revoked';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          email: string;
          role_id: string;
          branch_id?: string | null;
          token_hash: string;
          invited_by: string;
          expires_at: string;
          accepted_at?: string | null;
          status?: 'pending' | 'accepted' | 'rejected' | 'expired' | 'revoked';
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['organization_invitations']['Insert']>;
      };
      roles: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          is_system_role: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string | null;
          is_system_role?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['roles']['Insert']>;
      };
      audit_logs: {
        Row: {
          id: string;
          organization_id: string | null;
          profile_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          diff: Json;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          profile_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          diff?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: never;
      };
    };
    Functions: {
      create_organization_with_owner: {
        Args: {
          p_name: string;
          p_slug: string;
          p_org_type: 'individual' | 'agency' | 'enterprise';
          p_currency?: string;
          p_timezone?: string;
          p_profile_id?: string;
        };
        Returns: Json;
      };
      current_auth_user_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      current_user_org_ids: {
        Args: Record<PropertyKey, never>;
        Returns: string[];
      };
      is_org_member: {
        Args: {
          target_org_id: string;
        };
        Returns: boolean;
      };
      has_permission: {
        Args: {
          target_org_id: string;
          required_perm_key: string;
        };
        Returns: boolean;
      };
    };
  };
}
