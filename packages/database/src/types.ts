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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
      };
      contacts: {
        Row: {
          id: string;
          organization_id: string;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string | null;
          company: string | null;
          type: 'client' | 'buyer' | 'seller' | 'renter' | 'landlord' | 'agent' | 'investor' | 'other';
          address: Json;
          tags: string[];
          assigned_to_id: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          first_name: string;
          last_name: string;
          email?: string | null;
          phone?: string | null;
          company?: string | null;
          type?: 'client' | 'buyer' | 'seller' | 'renter' | 'landlord' | 'agent' | 'investor' | 'other';
          address?: Json;
          tags?: string[];
          assigned_to_id?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['contacts']['Insert']>;
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
          organization_id: string;
          contact_id: string | null;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string | null;
          status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost' | 'unqualified';
          priority: 'low' | 'medium' | 'high' | 'urgent';
          source: string;
          qualification_score: number;
          intent_summary: string | null;
          estimated_budget_min: number | null;
          estimated_budget_max: number | null;
          currency: string;
          property_preferences: Json;
          assigned_to_id: string | null;
          branch_id: string | null;
          last_contacted_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          contact_id?: string | null;
          first_name: string;
          last_name: string;
          email?: string | null;
          phone?: string | null;
          status?: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost' | 'unqualified';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          source?: string;
          qualification_score?: number;
          intent_summary?: string | null;
          estimated_budget_min?: number | null;
          estimated_budget_max?: number | null;
          currency?: string;
          property_preferences?: Json;
          assigned_to_id?: string | null;
          branch_id?: string | null;
          last_contacted_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['leads']['Insert']>;
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          organization_id: string;
          lead_id: string | null;
          contact_id: string | null;
          title: string;
          description: string | null;
          task_type: 'call' | 'email' | 'visit' | 'meeting' | 'follow_up' | 'task' | 'review';
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          priority: 'low' | 'medium' | 'high' | 'urgent';
          due_date: string | null;
          completed_at: string | null;
          assigned_to_id: string | null;
          created_by_id: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          lead_id?: string | null;
          contact_id?: string | null;
          title: string;
          description?: string | null;
          task_type?: 'call' | 'email' | 'visit' | 'meeting' | 'follow_up' | 'task' | 'review';
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          due_date?: string | null;
          completed_at?: string | null;
          assigned_to_id?: string | null;
          created_by_id?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['tasks']['Insert']>;
        Relationships: [];
      };
      activities: {
        Row: {
          id: string;
          organization_id: string;
          lead_id: string | null;
          contact_id: string | null;
          type: 'note' | 'call_logged' | 'email_sent' | 'status_change' | 'stage_moved' | 'task_completed' | 'visit_scheduled' | 'ai_interaction';
          title: string;
          description: string | null;
          metadata: Json;
          created_by_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          lead_id?: string | null;
          contact_id?: string | null;
          type: 'note' | 'call_logged' | 'email_sent' | 'status_change' | 'stage_moved' | 'task_completed' | 'visit_scheduled' | 'ai_interaction';
          title: string;
          description?: string | null;
          metadata?: Json;
          created_by_id?: string | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
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
      get_invitation_by_token: {
        Args: {
          p_token_hash: string;
        };
        Returns: Json;
      };
      mask_email: {
        Args: {
          p_email: string;
        };
        Returns: string;
      };
      accept_invitation_atomic: {
        Args: {
          p_token_hash: string;
        };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
