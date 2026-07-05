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
      fragrance_notes: {
        Row: {
          fragrance_id: string
          id: string
          note: string
          position: string | null
        }
        Insert: {
          fragrance_id: string
          id?: string
          note: string
          position?: string | null
        }
        Update: {
          fragrance_id?: string
          id?: string
          note?: string
          position?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fragrance_notes_fragrance_id_fkey"
            columns: ["fragrance_id"]
            isOneToOne: false
            referencedRelation: "fragrances"
            referencedColumns: ["id"]
          },
        ]
      }
      fragrances: {
        Row: {
          accords: string[] | null
          bottle_rating: number | null
          brand: string
          concentration: string | null
          created_at: string | null
          description: string | null
          gender: string | null
          id: string
          image_url: string | null
          in_production: boolean | null
          longevity_rating: number | null
          name: string
          perfumers: string[] | null
          rank_position: number | null
          rating: number | null
          review_count: number | null
          scent_rating: number | null
          sillage_rating: number | null
          source_url: string | null
          votes: number | null
          year: number | null
        }
        Insert: {
          accords?: string[] | null
          bottle_rating?: number | null
          brand: string
          concentration?: string | null
          created_at?: string | null
          description?: string | null
          gender?: string | null
          id?: string
          image_url?: string | null
          in_production?: boolean | null
          longevity_rating?: number | null
          name: string
          perfumers?: string[] | null
          rank_position?: number | null
          rating?: number | null
          review_count?: number | null
          scent_rating?: number | null
          sillage_rating?: number | null
          source_url?: string | null
          votes?: number | null
          year?: number | null
        }
        Update: {
          accords?: string[] | null
          bottle_rating?: number | null
          brand?: string
          concentration?: string | null
          created_at?: string | null
          description?: string | null
          gender?: string | null
          id?: string
          image_url?: string | null
          in_production?: boolean | null
          longevity_rating?: number | null
          name?: string
          perfumers?: string[] | null
          rank_position?: number | null
          rating?: number | null
          review_count?: number | null
          scent_rating?: number | null
          sillage_rating?: number | null
          source_url?: string | null
          votes?: number | null
          year?: number | null
        }
        Relationships: []
      }
      top_fragrances: {
        Row: {
          category: string
          id: string
          image_url: string | null
          name: string
          place: number | null
          rating: number | null
          total_votes: number | null
        }
        Insert: {
          category: string
          id?: string
          image_url?: string | null
          name: string
          place?: number | null
          rating?: number | null
          total_votes?: number | null
        }
        Update: {
          category?: string
          id?: string
          image_url?: string | null
          name?: string
          place?: number | null
          rating?: number | null
          total_votes?: number | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_wear: { Args: { row_id: string }; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
