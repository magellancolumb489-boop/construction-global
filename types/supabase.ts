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
      account_deletion_requests: {
        Row: {
          id: number
          reason: string | null
          requested_at: string
          scheduled_for: string
          status: string
          user_id: string
        }
        Insert: {
          id?: number
          reason?: string | null
          requested_at?: string
          scheduled_for: string
          status?: string
          user_id: string
        }
        Update: {
          id?: number
          reason?: string | null
          requested_at?: string
          scheduled_for?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: number
          is_active: boolean
          name: string
          parent_id: number | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: never
          is_active?: boolean
          name: string
          parent_id?: number | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: never
          is_active?: boolean
          name?: string
          parent_id?: number | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      login_events: {
        Row: {
          created_at: string
          event: string
          id: number
          ip: unknown
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event: string
          id?: number
          ip?: unknown
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event?: string
          id?: number
          ip?: unknown
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      marketplace_listing_concrete_classes: {
        Row: {
          class_code: string
          consistencies: string[]
          consistency_prices: Json
          created_at: string
          id: number
          listing_id: number
        }
        Insert: {
          class_code: string
          consistencies: string[]
          consistency_prices: Json
          created_at?: string
          id?: never
          listing_id: number
        }
        Update: {
          class_code?: string
          consistencies?: string[]
          consistency_prices?: Json
          created_at?: string
          id?: never
          listing_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listing_concrete_classes_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listing_images: {
        Row: {
          created_at: string
          display_order: number
          id: number
          listing_id: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: never
          listing_id: number
          storage_path: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: never
          listing_id?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listing_images_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listings: {
        Row: {
          available_qty: number
          category_id: number | null
          created_at: string
          currency: string
          description: string | null
          equipment_condition: string | null
          equipment_model: string | null
          equipment_year: number | null
          id: number
          is_active: boolean
          listing_type: string
          location: string | null
          min_order_qty: number | null
          pickup_address: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          price: number
          seller_assumes_transport: boolean
          seller_id: string
          service_area: string | null
          slug: string
          title: string
          transport_fee: number | null
          transport_modes: string[] | null
          unit: string
          updated_at: string
        }
        Insert: {
          available_qty?: number
          category_id?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          equipment_condition?: string | null
          equipment_model?: string | null
          equipment_year?: number | null
          id?: never
          is_active?: boolean
          listing_type?: string
          location?: string | null
          min_order_qty?: number | null
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          price: number
          seller_assumes_transport?: boolean
          seller_id: string
          service_area?: string | null
          slug: string
          title: string
          transport_fee?: number | null
          transport_modes?: string[] | null
          unit: string
          updated_at?: string
        }
        Update: {
          available_qty?: number
          category_id?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          equipment_condition?: string | null
          equipment_model?: string | null
          equipment_year?: number | null
          id?: never
          is_active?: boolean
          listing_type?: string
          location?: string | null
          min_order_qty?: number | null
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          price?: number
          seller_assumes_transport?: boolean
          seller_id?: string
          service_area?: string | null
          slug?: string
          title?: string
          transport_fee?: number | null
          transport_modes?: string[] | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_threads: {
        Row: {
          buyer_id: string
          context_id: number | null
          context_type: string | null
          created_at: string
          id: number
          last_message_at: string
          seller_id: string
          subject: string | null
        }
        Insert: {
          buyer_id: string
          context_id?: number | null
          context_type?: string | null
          created_at?: string
          id?: number
          last_message_at?: string
          seller_id: string
          subject?: string | null
        }
        Update: {
          buyer_id?: string
          context_id?: number | null
          context_type?: string | null
          created_at?: string
          id?: number
          last_message_at?: string
          seller_id?: string
          subject?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachments: Json
          body: string
          created_at: string
          id: number
          read_at: string | null
          sender_id: string
          thread_id: number
        }
        Insert: {
          attachments?: Json
          body: string
          created_at?: string
          id?: number
          read_at?: string | null
          sender_id: string
          thread_id: number
        }
        Update: {
          attachments?: Json
          body?: string
          created_at?: string
          id?: number
          read_at?: string | null
          sender_id?: string
          thread_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          bio: string | null
          company_name: string | null
          created_at: string
          display_name: string | null
          entity_type: string | null
          fiscal_address: Json | null
          id: string
          phone: string | null
          preferences: Json
          reg_com: string | null
          role: string
          seller_activated_at: string | null
          seller_policies: Json
          supplier_settings: Json
          tax_id: string | null
          updated_at: string
          vat_id: string | null
          website_url: string | null
        }
        Insert: {
          avatar_path?: string | null
          bio?: string | null
          company_name?: string | null
          created_at?: string
          display_name?: string | null
          entity_type?: string | null
          fiscal_address?: Json | null
          id: string
          phone?: string | null
          preferences?: Json
          reg_com?: string | null
          role?: string
          seller_activated_at?: string | null
          seller_policies?: Json
          supplier_settings?: Json
          tax_id?: string | null
          updated_at?: string
          vat_id?: string | null
          website_url?: string | null
        }
        Update: {
          avatar_path?: string | null
          bio?: string | null
          company_name?: string | null
          created_at?: string
          display_name?: string | null
          entity_type?: string | null
          fiscal_address?: Json | null
          id?: string
          phone?: string | null
          preferences?: Json
          reg_com?: string | null
          role?: string
          seller_activated_at?: string | null
          seller_policies?: Json
          supplier_settings?: Json
          tax_id?: string | null
          updated_at?: string
          vat_id?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          body: string | null
          created_at: string
          id: number
          listing_id: number | null
          order_id: number | null
          rating: number
          reviewer_id: string
          target_user_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: number
          listing_id?: number | null
          order_id?: number | null
          rating: number
          reviewer_id: string
          target_user_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: number
          listing_id?: number | null
          order_id?: number | null
          rating?: number
          reviewer_id?: string
          target_user_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      user_addresses: {
        Row: {
          city: string
          country: string
          county: string | null
          created_at: string
          id: number
          is_default_billing: boolean
          is_default_shipping: boolean
          label: string | null
          line1: string
          line2: string | null
          notes: string | null
          phone: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          postal_code: string | null
          recipient: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          city: string
          country?: string
          county?: string | null
          created_at?: string
          id?: number
          is_default_billing?: boolean
          is_default_shipping?: boolean
          label?: string | null
          line1: string
          line2?: string | null
          notes?: string | null
          phone?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          postal_code?: string | null
          recipient?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string
          country?: string
          county?: string | null
          created_at?: string
          id?: number
          is_default_billing?: boolean
          is_default_shipping?: boolean
          label?: string | null
          line1?: string
          line2?: string | null
          notes?: string | null
          phone?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          postal_code?: string | null
          recipient?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notification_preferences: {
        Row: {
          channels: Json
          quiet_hours: Json | null
          topics: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          channels?: Json
          quiet_hours?: Json | null
          topics?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          channels?: Json
          quiet_hours?: Json | null
          topics?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wishlist_items: {
        Row: {
          added_at: string
          id: number
          listing_id: number
          user_id: string
        }
        Insert: {
          added_at?: string
          id?: number
          listing_id: number
          user_id: string
        }
        Update: {
          added_at?: string
          id?: number
          listing_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_path: string | null
          company_name: string | null
          display_name: string | null
          entity_type: string | null
          id: string | null
        }
        Insert: {
          avatar_path?: string | null
          company_name?: string | null
          display_name?: string | null
          entity_type?: string | null
          id?: string | null
        }
        Update: {
          avatar_path?: string | null
          company_name?: string | null
          display_name?: string | null
          entity_type?: string | null
          id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_my_profile: {
        Args: never
        Returns: {
          avatar_path: string | null
          bio: string | null
          company_name: string | null
          created_at: string
          display_name: string | null
          entity_type: string | null
          fiscal_address: Json | null
          id: string
          phone: string | null
          preferences: Json
          reg_com: string | null
          role: string
          seller_activated_at: string | null
          seller_policies: Json
          supplier_settings: Json
          tax_id: string | null
          updated_at: string
          vat_id: string | null
          website_url: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      is_admin: { Args: never; Returns: boolean }
      set_user_role: {
        Args: { p_role: string; p_target: string }
        Returns: Json
      }
      upsert_listing_concrete_classes: {
        Args: { p_listing_id: number; p_rows: Json }
        Returns: undefined
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
