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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      conversations: {
        Row: {
          created_at: string
          id: string
          selected_mode: string
          selected_template: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          selected_mode: string
          selected_template: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          selected_mode?: string
          selected_template?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      custom_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          mode: string
          template_content: string
          template_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          mode: string
          template_content: string
          template_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          mode?: string
          template_content?: string
          template_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          facility_id: string
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          facility_id: string
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          facility_id?: string
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_facility_id_organization_id_fkey"
            columns: ["facility_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprise_activation_links: {
        Row: {
          created_at: string
          email: string
          email_status: string
          expires_at: string
          id: string
          organization_id: string
          revoked_at: string | null
          token_hash: string
          updated_at: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          email: string
          email_status?: string
          expires_at: string
          id?: string
          organization_id: string
          revoked_at?: string | null
          token_hash: string
          updated_at?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          email_status?: string
          expires_at?: string
          id?: string
          organization_id?: string
          revoked_at?: string | null
          token_hash?: string
          updated_at?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_activation_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprise_admins: {
        Row: {
          created_at: string
          full_name: string
          organization_id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          organization_id: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          organization_id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_admins_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprise_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_table: string
          id: string
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_table: string
          id?: string
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_table?: string
          id?: string
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprise_contracts: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          end_date: string
          id: string
          organization_id: string
          payment_received_at: string | null
          payment_status: string
          start_date: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          currency?: string
          end_date: string
          id?: string
          organization_id: string
          payment_received_at?: string | null
          payment_status?: string
          start_date: string
          status: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          end_date?: string
          id?: string
          organization_id?: string
          payment_received_at?: string | null
          payment_status?: string
          start_date?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprise_integrations: {
        Row: {
          connection_status: string
          created_at: string
          ehr_type: string
          id: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          connection_status?: string
          created_at?: string
          ehr_type: string
          id?: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          connection_status?: string
          created_at?: string
          ehr_type?: string
          id?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprise_leads: {
        Row: {
          clinicians: number
          contact_name: string
          country: string
          created_at: string
          current_ehr: string
          demo_scheduled_at: string | null
          facilities: number
          id: string
          interested_in_integration: string
          job_title: string
          notes: string | null
          organization_id: string | null
          organization_name: string
          phone: string | null
          professions: string[]
          state: string | null
          status: string
          timeline: string
          updated_at: string
          work_email: string
        }
        Insert: {
          clinicians: number
          contact_name: string
          country: string
          created_at?: string
          current_ehr: string
          demo_scheduled_at?: string | null
          facilities: number
          id?: string
          interested_in_integration: string
          job_title: string
          notes?: string | null
          organization_id?: string | null
          organization_name: string
          phone?: string | null
          professions?: string[]
          state?: string | null
          status?: string
          timeline: string
          updated_at?: string
          work_email: string
        }
        Update: {
          clinicians?: number
          contact_name?: string
          country?: string
          created_at?: string
          current_ehr?: string
          demo_scheduled_at?: string | null
          facilities?: number
          id?: string
          interested_in_integration?: string
          job_title?: string
          notes?: string | null
          organization_id?: string | null
          organization_name?: string
          phone?: string | null
          professions?: string[]
          state?: string | null
          status?: string
          timeline?: string
          updated_at?: string
          work_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprise_rate_limits: {
        Row: {
          bucket: string
          created_at: string
          expires_at: string
          hits: number
          updated_at: string
        }
        Insert: {
          bucket: string
          created_at?: string
          expires_at: string
          hits: number
          updated_at?: string
        }
        Update: {
          bucket?: string
          created_at?: string
          expires_at?: string
          hits?: number
          updated_at?: string
        }
        Relationships: []
      }
      enterprise_support_tickets: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          message: string
          organization_id: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          message: string
          organization_id: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          organization_id?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_support_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      facilities: {
        Row: {
          created_at: string
          id: string
          kind: string
          location: string | null
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          location?: string | null
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          location?: string | null
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facilities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_message_id_user_id_fkey"
            columns: ["message_id", "user_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      koko_admins: {
        Row: {
          created_at: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          conversation_id: string
          copied: boolean
          created_at: string
          edited_message: string | null
          id: string
          message: string
          role: Database["public"]["Enums"]["message_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          copied?: boolean
          created_at?: string
          edited_message?: string | null
          id?: string
          message: string
          role: Database["public"]["Enums"]["message_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          copied?: boolean
          created_at?: string
          edited_message?: string | null
          id?: string
          message?: string
          role?: Database["public"]["Enums"]["message_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_user_id_fkey"
            columns: ["conversation_id", "user_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      onboarding_answers: {
        Row: {
          answers: Json
          completed_at: string | null
          created_at: string
          discovery_source: string | null
          documentation_goal: string | null
          emr_platform: string | null
          id: string
          onboarding_completed: boolean
          other_emr: string | null
          preferred_default_mode: string | null
          profession: string | null
          specialty: string | null
          updated_at: string
          user_id: string
          workplace_type: string | null
          years_of_experience: string | null
        }
        Insert: {
          answers?: Json
          completed_at?: string | null
          created_at?: string
          discovery_source?: string | null
          documentation_goal?: string | null
          emr_platform?: string | null
          id?: string
          onboarding_completed?: boolean
          other_emr?: string | null
          preferred_default_mode?: string | null
          profession?: string | null
          specialty?: string | null
          updated_at?: string
          user_id: string
          workplace_type?: string | null
          years_of_experience?: string | null
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          created_at?: string
          discovery_source?: string | null
          documentation_goal?: string | null
          emr_platform?: string | null
          id?: string
          onboarding_completed?: boolean
          other_emr?: string | null
          preferred_default_mode?: string | null
          profession?: string | null
          specialty?: string | null
          updated_at?: string
          user_id?: string
          workplace_type?: string | null
          years_of_experience?: string | null
        }
        Relationships: []
      }
      organizations: {
        Row: {
          contract_end: string | null
          contract_start: string | null
          country: string | null
          created_at: string
          id: string
          include_time_saved: boolean
          name: string
          reporting_period: string
          state: string | null
          status: string
          subscription_status: string
          timezone: string
          updated_at: string
        }
        Insert: {
          contract_end?: string | null
          contract_start?: string | null
          country?: string | null
          created_at?: string
          id?: string
          include_time_saved?: boolean
          name: string
          reporting_period?: string
          state?: string | null
          status?: string
          subscription_status?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          contract_end?: string | null
          contract_start?: string | null
          country?: string | null
          created_at?: string
          id?: string
          include_time_saved?: boolean
          name?: string
          reporting_period?: string
          state?: string | null
          status?: string
          subscription_status?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          auth_user_id: string
          created_at: string
          default_mode: string
          discovery_source: string | null
          email: string
          emr: string | null
          full_name: string | null
          id: string
          place_of_work: string | null
          profession: string | null
          role: string
          updated_at: string
          workplace: string | null
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          default_mode?: string
          discovery_source?: string | null
          email: string
          emr?: string | null
          full_name?: string | null
          id?: string
          place_of_work?: string | null
          profession?: string | null
          role?: string
          updated_at?: string
          workplace?: string | null
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          default_mode?: string
          discovery_source?: string | null
          email?: string
          emr?: string | null
          full_name?: string | null
          id?: string
          place_of_work?: string | null
          profession?: string | null
          role?: string
          updated_at?: string
          workplace?: string | null
        }
        Relationships: []
      }
      stripe_customers: {
        Row: {
          created_at: string
          stripe_customer_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          stripe_customer_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          stripe_customer_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stripe_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          currency: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          interval: string | null
          interval_count: number | null
          metadata: Json
          pause_collection_behavior: string | null
          pause_resumes_at: string | null
          plan: string | null
          quantity: number | null
          status: string
          stripe_customer_id: string
          stripe_price_id: string | null
          stripe_product_id: string | null
          stripe_subscription_id: string
          trial_end: string | null
          unit_amount: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          interval?: string | null
          interval_count?: number | null
          metadata?: Json
          pause_collection_behavior?: string | null
          pause_resumes_at?: string | null
          plan?: string | null
          quantity?: number | null
          status: string
          stripe_customer_id: string
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          stripe_subscription_id: string
          trial_end?: string | null
          unit_amount?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          interval?: string | null
          interval_count?: number | null
          metadata?: Json
          pause_collection_behavior?: string | null
          pause_resumes_at?: string | null
          plan?: string | null
          quantity?: number | null
          status?: string
          stripe_customer_id?: string
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          stripe_subscription_id?: string
          trial_end?: string | null
          unit_amount?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stripe_webhook_events: {
        Row: {
          event_type: string
          id: string
          livemode: boolean
          processed_at: string
        }
        Insert: {
          event_type: string
          id: string
          livemode: boolean
          processed_at?: string
        }
        Update: {
          event_type?: string
          id?: string
          livemode?: boolean
          processed_at?: string
        }
        Relationships: []
      }
      subscription_lifecycle: {
        Row: {
          created_at: string
          first_paid_at: string | null
          has_subscribed_before: boolean
          paid_history_checked_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          first_paid_at?: string | null
          has_subscribed_before?: boolean
          paid_history_checked_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          first_paid_at?: string | null
          has_subscribed_before?: boolean
          paid_history_checked_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          compact_mode: boolean
          created_at: string
          default_mode: string
          last_selected_mode: string
          last_selected_template: string
          microphone_enabled: boolean
          onboarding_completed: boolean
          primary_color: string
          theme: Database["public"]["Enums"]["app_theme"]
          updated_at: string
          user_id: string
        }
        Insert: {
          compact_mode?: boolean
          created_at?: string
          default_mode?: string
          last_selected_mode?: string
          last_selected_template?: string
          microphone_enabled?: boolean
          onboarding_completed?: boolean
          primary_color?: string
          theme?: Database["public"]["Enums"]["app_theme"]
          updated_at?: string
          user_id: string
        }
        Update: {
          compact_mode?: boolean
          created_at?: string
          default_mode?: string
          last_selected_mode?: string
          last_selected_template?: string
          microphone_enabled?: boolean
          onboarding_completed?: boolean
          primary_color?: string
          theme?: Database["public"]["Enums"]["app_theme"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_onboarding: { Args: { payload: Json }; Returns: undefined }
      enterprise_approve: {
        Args: {
          p_actor: string
          p_hash: string
          p_hours: number
          p_lead: string
        }
        Returns: Json
      }
      enterprise_finish_setup: {
        Args: {
          p_facilities: Json
          p_hash: string
          p_name: string
          p_user: string
        }
        Returns: string
      }
      enterprise_rate_limit: {
        Args: { p_bucket: string; p_limit: number; p_seconds: number }
        Returns: boolean
      }
      enterprise_reissue: {
        Args: {
          p_actor: string
          p_hash: string
          p_hours: number
          p_org: string
        }
        Returns: Json
      }
      is_enterprise_admin: { Args: { org: string }; Returns: boolean }
      is_koko_admin: { Args: never; Returns: boolean }
      shiftnote_role_in: { Args: { roles: string[] }; Returns: boolean }
    }
    Enums: {
      app_theme: "light" | "dark" | "system"
      message_role: "user" | "assistant"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_theme: ["light", "dark", "system"],
      message_role: ["user", "assistant"],
    },
  },
} as const
