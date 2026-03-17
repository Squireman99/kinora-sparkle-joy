export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          new_data: Json | null
          old_data: Json | null
          organization_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          organization_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          organization_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string | null
          id: string
          industry: string | null
          name: string
          notes: string | null
          organization_id: string | null
          website: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          industry?: string | null
          name: string
          notes?: string | null
          organization_id?: string | null
          website?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          industry?: string | null
          name?: string
          notes?: string | null
          organization_id?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      company_open_roles: {
        Row: {
          company_id: string | null
          created_at: string | null
          filled_by_contact_id: string | null
          id: string
          logged_by: string | null
          notes: string | null
          role_taxonomy_id: string | null
          status: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          filled_by_contact_id?: string | null
          id?: string
          logged_by?: string | null
          notes?: string | null
          role_taxonomy_id?: string | null
          status?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          filled_by_contact_id?: string | null
          id?: string
          logged_by?: string | null
          notes?: string | null
          role_taxonomy_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_open_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_open_roles_filled_by_contact_id_fkey"
            columns: ["filled_by_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_open_roles_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_open_roles_role_taxonomy_id_fkey"
            columns: ["role_taxonomy_id"]
            isOneToOne: false
            referencedRelation: "role_taxonomy"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_connections: {
        Row: {
          connected_contact_id: string
          contact_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          connected_contact_id: string
          contact_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          connected_contact_id?: string
          contact_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_connections_connected_contact_id_fkey"
            columns: ["connected_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_connections_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_interests: {
        Row: {
          contact_id: string
          created_at: string | null
          id: string
          interest_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          id?: string
          interest_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          id?: string
          interest_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_interests_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_interests_interest_id_fkey"
            columns: ["interest_id"]
            isOneToOne: false
            referencedRelation: "interest_taxonomy"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_maturity: {
        Row: {
          contact_id: string
          id: string
          maturity_level_id: string | null
          relationship_type_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          contact_id: string
          id?: string
          maturity_level_id?: string | null
          relationship_type_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          contact_id?: string
          id?: string
          maturity_level_id?: string | null
          relationship_type_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_maturity_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_maturity_maturity_level_id_fkey"
            columns: ["maturity_level_id"]
            isOneToOne: false
            referencedRelation: "maturity_level_taxonomy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_maturity_relationship_type_id_fkey"
            columns: ["relationship_type_id"]
            isOneToOne: false
            referencedRelation: "relationship_type_taxonomy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_maturity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_roles: {
        Row: {
          company_name: string | null
          contact_id: string | null
          end_date: string | null
          id: string
          is_current: boolean | null
          start_date: string | null
          title: string
        }
        Insert: {
          company_name?: string | null
          contact_id?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          start_date?: string | null
          title: string
        }
        Update: {
          company_name?: string | null
          contact_id?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          start_date?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_roles_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          company_id: string | null
          company_name: string | null
          created_at: string | null
          email: string | null
          first_name: string
          id: string
          job_title: string | null
          last_contacted: string | null
          last_name: string | null
          linkedin_url: string | null
          notes: string | null
          organization_id: string | null
          owner_id: string | null
          phone: string | null
          private_school: string | null
        }
        Insert: {
          company_id?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          first_name: string
          id?: string
          job_title?: string | null
          last_contacted?: string | null
          last_name?: string | null
          linkedin_url?: string | null
          notes?: string | null
          organization_id?: string | null
          owner_id?: string | null
          phone?: string | null
          private_school?: string | null
        }
        Update: {
          company_id?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string
          id?: string
          job_title?: string | null
          last_contacted?: string | null
          last_name?: string | null
          linkedin_url?: string | null
          notes?: string | null
          organization_id?: string | null
          owner_id?: string | null
          phone?: string | null
          private_school?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dismissed_suggestions: {
        Row: {
          contact_a_id: string
          contact_b_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          contact_a_id: string
          contact_b_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          contact_a_id?: string
          contact_b_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dismissed_suggestions_contact_a_id_fkey"
            columns: ["contact_a_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dismissed_suggestions_contact_b_id_fkey"
            columns: ["contact_b_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      interaction_history: {
        Row: {
          contact_id: string
          created_at: string | null
          description: string | null
          id: string
          interaction_date: string
          interaction_type: string
          organization_id: string | null
          user_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          interaction_date?: string
          interaction_type: string
          organization_id?: string | null
          user_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          interaction_date?: string
          interaction_type?: string
          organization_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interaction_history_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interaction_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interaction_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      interest_taxonomy: {
        Row: {
          category: string
          id: string
          label: string
        }
        Insert: {
          category: string
          id?: string
          label: string
        }
        Update: {
          category?: string
          id?: string
          label?: string
        }
        Relationships: []
      }
      job_seeking_tags: {
        Row: {
          comment: string | null
          contact_id: string
          created_at: string | null
          id: string
          is_job_seeking: boolean
          tagged_by: string
          updated_at: string | null
        }
        Insert: {
          comment?: string | null
          contact_id: string
          created_at?: string | null
          id?: string
          is_job_seeking?: boolean
          tagged_by: string
          updated_at?: string | null
        }
        Update: {
          comment?: string | null
          contact_id?: string
          created_at?: string | null
          id?: string
          is_job_seeking?: boolean
          tagged_by?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_seeking_tags_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_seeking_tags_tagged_by_fkey"
            columns: ["tagged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      maturity_level_taxonomy: {
        Row: {
          description: string | null
          id: string
          label: string
          level: number
        }
        Insert: {
          description?: string | null
          id?: string
          label: string
          level: number
        }
        Update: {
          description?: string | null
          id?: string
          label?: string
          level?: number
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          id: string
          joined_at: string | null
          organization_id: string | null
          role: string
          user_id: string | null
        }
        Insert: {
          id?: string
          joined_at?: string | null
          organization_id?: string | null
          role: string
          user_id?: string | null
        }
        Update: {
          id?: string
          joined_at?: string | null
          organization_id?: string | null
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      pending_invites: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          invited_by: string | null
          organization_id: string | null
          role: string
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          invited_by?: string | null
          organization_id?: string | null
          role: string
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          invited_by?: string | null
          organization_id?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      relationship_type_taxonomy: {
        Row: {
          id: string
          label: string
        }
        Insert: {
          id?: string
          label: string
        }
        Update: {
          id?: string
          label?: string
        }
        Relationships: []
      }
      relationships: {
        Row: {
          contact_a_id: string | null
          contact_b_id: string | null
          created_at: string | null
          id: string
          organization_id: string | null
          relationship_type_id: string | null
        }
        Insert: {
          contact_a_id?: string | null
          contact_b_id?: string | null
          created_at?: string | null
          id?: string
          organization_id?: string | null
          relationship_type_id?: string | null
        }
        Update: {
          contact_a_id?: string | null
          contact_b_id?: string | null
          created_at?: string | null
          id?: string
          organization_id?: string | null
          relationship_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "relationships_contact_a_id_fkey"
            columns: ["contact_a_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_contact_b_id_fkey"
            columns: ["contact_b_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_relationship_type_id_fkey"
            columns: ["relationship_type_id"]
            isOneToOne: false
            referencedRelation: "relationship_type_taxonomy"
            referencedColumns: ["id"]
          },
        ]
      }
      role_taxonomy: {
        Row: {
          group_name: string
          id: string
          label: string
        }
        Insert: {
          group_name: string
          id?: string
          label: string
        }
        Update: {
          group_name?: string
          id?: string
          label?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_org_ids: { Args: { _user_id: string }; Returns: string[] }
      is_member_of_org: {
        Args: { _organization_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
