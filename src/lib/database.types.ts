// Generated from the live Supabase schema (project: fragrance) via MCP
// generate_typescript_types. Regenerate after schema changes.
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
      fragrance_ratings: {
        Row: {
          created_at: string
          fragrance_id: string
          id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fragrance_id: string
          id?: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fragrance_id?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fragrance_ratings_fragrance_id_fkey"
            columns: ["fragrance_id"]
            isOneToOne: false
            referencedRelation: "fragrances"
            referencedColumns: ["id"]
          },
        ]
      }
      fragrances: {
        Row: {
          brand: string
          created_at: string | null
          id: string
          image_url: string | null
          name: string
          source_url: string | null
        }
        Insert: {
          brand: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          name: string
          source_url?: string | null
        }
        Update: {
          brand?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          name?: string
          source_url?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          entitlement: string | null
          expires_at: string | null
          is_pro: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          entitlement?: string | null
          expires_at?: string | null
          is_pro?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          entitlement?: string | null
          expires_at?: string | null
          is_pro?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_fragrances: {
        Row: {
          created_at: string
          fragrance_id: string | null
          id: string
          image_url: string | null
          last_worn: string | null
          name: string
          notes: string | null
          rating: number | null
          times_worn: number
          user_id: string
        }
        Insert: {
          created_at?: string
          fragrance_id?: string | null
          id?: string
          image_url?: string | null
          last_worn?: string | null
          name: string
          notes?: string | null
          rating?: number | null
          times_worn?: number
          user_id: string
        }
        Update: {
          created_at?: string
          fragrance_id?: string | null
          id?: string
          image_url?: string | null
          last_worn?: string | null
          name?: string
          notes?: string | null
          rating?: number | null
          times_worn?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_fragrances_fragrance_id_fkey"
            columns: ["fragrance_id"]
            isOneToOne: false
            referencedRelation: "fragrances"
            referencedColumns: ["id"]
          },
        ]
      }
      user_push_tokens: {
        Row: {
          id: string
          platform: string | null
          reminders_enabled: boolean
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          platform?: string | null
          reminders_enabled?: boolean
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          platform?: string | null
          reminders_enabled?: boolean
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wear_events: {
        Row: {
          fragrance_id: string | null
          id: string
          image_url: string | null
          name: string
          user_fragrance_id: string | null
          user_id: string
          worn_at: string
        }
        Insert: {
          fragrance_id?: string | null
          id?: string
          image_url?: string | null
          name: string
          user_fragrance_id?: string | null
          user_id: string
          worn_at?: string
        }
        Update: {
          fragrance_id?: string | null
          id?: string
          image_url?: string | null
          name?: string
          user_fragrance_id?: string | null
          user_id?: string
          worn_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wear_events_fragrance_id_fkey"
            columns: ["fragrance_id"]
            isOneToOne: false
            referencedRelation: "fragrances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wear_events_user_fragrance_id_fkey"
            columns: ["user_fragrance_id"]
            isOneToOne: false
            referencedRelation: "user_fragrances"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      discover_fragrances: {
        Args: { max_results?: number }
        Returns: {
          brand: string
          id: string
          image_url: string
          name: string
        }[]
      }
      get_fragrance_ratings: {
        Args: { fragrance_ids: string[] }
        Returns: {
          avg_rating: number
          fragrance_id: string
          rating_count: number
        }[]
      }
      increment_wear: {
        Args: { row_id: string; tz?: string }
        Returns: boolean
      }
      list_brands: {
        Args: never
        Returns: {
          brand: string
          fragrance_count: number
        }[]
      }
      search_fragrances: {
        Args: {
          filter_brand?: string
          max_results?: number
          search_term?: string
        }
        Returns: {
          brand: string
          id: string
          image_url: string
          name: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      top_worn_fragrances: {
        Args: { max_results?: number; period?: string }
        Returns: {
          fragrance_id: string
          image_url: string
          name: string
          place: number
          wear_count: number
        }[]
      }
      undo_wear: { Args: { row_id: string; tz?: string }; Returns: boolean }
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
