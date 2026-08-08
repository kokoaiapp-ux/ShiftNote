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
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
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
      profiles: {
        Row: {
          auth_user_id: string
          created_at: string
          default_mode: string
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
      revenuecat_webhook_events: {
        Row: {
          environment: string | null
          event_type: string
          id: string
          processed_at: string
        }
        Insert: {
          environment?: string | null
          event_type: string
          id: string
          processed_at?: string
        }
        Update: {
          environment?: string | null
          event_type?: string
          id?: string
          processed_at?: string
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
      subscription_cache: {
        Row: {
          billing_provider: string | null
          entitlement: string | null
          expiration_date: string | null
          product_id: string | null
          subscription_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_provider?: string | null
          entitlement?: string | null
          expiration_date?: string | null
          product_id?: string | null
          subscription_status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_provider?: string | null
          entitlement?: string | null
          expiration_date?: string | null
          product_id?: string | null
          subscription_status?: string | null
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_theme: ["light", "dark", "system"],
      message_role: ["user", "assistant"],
    },
  },
} as const
