// Generated from the live project (mfmhsicriufttcztljzv) on 2026-11-20 via the
// Supabase MCP generate_typescript_types. One intentional patch: place_order
// p_notes / p_idempotency_key are `string | null` (SQL accepts null; the
// generator emits non-null). Re-apply it after regenerating.

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
      marketplace_listing_material_spec: {
        Row: {
          allow_non_bulk_transport: boolean
          category_code: string
          created_at: string
          listing_id: number
          macara_addon: boolean
          macara_fee: number | null
          material_code: string
          max_piece_length_m: number | null
          pallet_pieces: number | null
          pallet_sac_kg: number | null
          pallet_total_kg: number | null
        }
        Insert: {
          allow_non_bulk_transport?: boolean
          category_code: string
          created_at?: string
          listing_id: number
          macara_addon?: boolean
          macara_fee?: number | null
          material_code: string
          max_piece_length_m?: number | null
          pallet_pieces?: number | null
          pallet_sac_kg?: number | null
          pallet_total_kg?: number | null
        }
        Update: {
          allow_non_bulk_transport?: boolean
          category_code?: string
          created_at?: string
          listing_id?: number
          macara_addon?: boolean
          macara_fee?: number | null
          material_code?: string
          max_piece_length_m?: number | null
          pallet_pieces?: number | null
          pallet_sac_kg?: number | null
          pallet_total_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listing_material_spec_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listing_material_transport: {
        Row: {
          created_at: string
          id: number
          listing_id: number
          payload_t: number
          vehicle_code: string
        }
        Insert: {
          created_at?: string
          id?: never
          listing_id: number
          payload_t: number
          vehicle_code: string
        }
        Update: {
          created_at?: string
          id?: never
          listing_id?: number
          payload_t?: number
          vehicle_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listing_material_transport_listing_id_fkey"
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
          deleted_at: string | null
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
          publish_paid_until: string | null
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
          deleted_at?: string | null
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
          publish_paid_until?: string | null
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
          deleted_at?: string | null
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
          publish_paid_until?: string | null
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
      order_lines: {
        Row: {
          commission_cents: number
          created_at: string
          id: number
          line_total_cents: number
          listing_id: number | null
          order_id: string
          qty: number
          snapshot_json: Json | null
          title: string
          transport_cents: number
          unit: string
          unit_price_cents: number
        }
        Insert: {
          commission_cents?: number
          created_at?: string
          id?: number
          line_total_cents: number
          listing_id?: number | null
          order_id: string
          qty: number
          snapshot_json?: Json | null
          title: string
          transport_cents?: number
          unit: string
          unit_price_cents: number
        }
        Update: {
          commission_cents?: number
          created_at?: string
          id?: number
          line_total_cents?: number
          listing_id?: number | null
          order_id?: string
          qty?: number
          snapshot_json?: Json | null
          title?: string
          transport_cents?: number
          unit?: string
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_lines_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_number_counters: {
        Row: {
          day: string
          last_seq: number
        }
        Insert: {
          day: string
          last_seq: number
        }
        Update: {
          day?: string
          last_seq?: number
        }
        Relationships: []
      }
      order_transport: {
        Row: {
          accepted_at: string | null
          carrier_name: string | null
          carrier_phone: string | null
          delivered_at: string | null
          failure_reason: string | null
          mode: string
          order_id: string
          paid: boolean
          quote_cents: number | null
          quote_expires_at: string | null
          quote_note: string | null
          quote_vat_cents: number | null
          quoted_at: string | null
          quoted_by: string | null
          requote_count: number
          scheduled_for: string | null
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          carrier_name?: string | null
          carrier_phone?: string | null
          delivered_at?: string | null
          failure_reason?: string | null
          mode: string
          order_id: string
          paid?: boolean
          quote_cents?: number | null
          quote_expires_at?: string | null
          quote_note?: string | null
          quote_vat_cents?: number | null
          quoted_at?: string | null
          quoted_by?: string | null
          requote_count?: number
          scheduled_for?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          carrier_name?: string | null
          carrier_phone?: string | null
          delivered_at?: string | null
          failure_reason?: string | null
          mode?: string
          order_id?: string
          paid?: boolean
          quote_cents?: number | null
          quote_expires_at?: string | null
          quote_note?: string | null
          quote_vat_cents?: number | null
          quoted_at?: string | null
          quoted_by?: string | null
          requote_count?: number
          scheduled_for?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_transport_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_transport_events: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string
          created_at: string
          data: Json | null
          from_status: string | null
          id: number
          note: string | null
          order_id: string
          to_status: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role: string
          created_at?: string
          data?: Json | null
          from_status?: string | null
          id?: never
          note?: string | null
          order_id: string
          to_status: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string
          created_at?: string
          data?: Json | null
          from_status?: string | null
          id?: never
          note?: string | null
          order_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_transport_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_json: Json | null
          buyer_id: string
          buyer_snapshot: Json | null
          cancel_reason: string | null
          cancelled_at: string | null
          commission_cents: number
          commission_rate: number
          created_at: string
          currency: string
          deviz_number: string | null
          id: string
          idempotency_key: string | null
          notes: string | null
          order_number: string | null
          payment_due_at: string | null
          payment_provider: string
          payment_status: string
          platform_doc_number: string | null
          platform_snapshot: Json | null
          platform_vat_cents: number
          seller_id: string
          seller_snapshot: Json | null
          seller_vat_cents: number
          shipping_json: Json | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          subtotal_cents: number
          total_cents: number
          transport_cents: number
          updated_at: string
          vat_cents: number
          vat_rate: number | null
        }
        Insert: {
          billing_json?: Json | null
          buyer_id: string
          buyer_snapshot?: Json | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          commission_cents?: number
          commission_rate?: number
          created_at?: string
          currency?: string
          deviz_number?: string | null
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          order_number?: string | null
          payment_due_at?: string | null
          payment_provider?: string
          payment_status?: string
          platform_doc_number?: string | null
          platform_snapshot?: Json | null
          platform_vat_cents?: number
          seller_id: string
          seller_snapshot?: Json | null
          seller_vat_cents?: number
          shipping_json?: Json | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          subtotal_cents?: number
          total_cents?: number
          transport_cents?: number
          updated_at?: string
          vat_cents?: number
          vat_rate?: number | null
        }
        Update: {
          billing_json?: Json | null
          buyer_id?: string
          buyer_snapshot?: Json | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          commission_cents?: number
          commission_rate?: number
          created_at?: string
          currency?: string
          deviz_number?: string | null
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          order_number?: string | null
          payment_due_at?: string | null
          payment_provider?: string
          payment_status?: string
          platform_doc_number?: string | null
          platform_snapshot?: Json | null
          platform_vat_cents?: number
          seller_id?: string
          seller_snapshot?: Json | null
          seller_vat_cents?: number
          shipping_json?: Json | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          subtotal_cents?: number
          total_cents?: number
          transport_cents?: number
          updated_at?: string
          vat_cents?: number
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_intents: {
        Row: {
          amount_cents: number
          checkout_url: string | null
          created_at: string
          currency: string
          failure_reason: string | null
          id: string
          listing_id: number | null
          order_id: string | null
          payer_id: string
          provider: string
          provider_ref: string | null
          purpose: string
          status: string
          subscription_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          checkout_url?: string | null
          created_at?: string
          currency: string
          failure_reason?: string | null
          id?: string
          listing_id?: number | null
          order_id?: string | null
          payer_id: string
          provider: string
          provider_ref?: string | null
          purpose: string
          status?: string
          subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          checkout_url?: string | null
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          listing_id?: number | null
          order_id?: string | null
          payer_id?: string
          provider?: string
          provider_ref?: string | null
          purpose?: string
          status?: string
          subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_intents_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_subscription_fk"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "seller_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          intent_id: string | null
          order_id: string | null
          provider: string
          provider_event_id: string | null
          raw_json: Json | null
          status: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          intent_id?: string | null
          order_id?: string | null
          provider: string
          provider_event_id?: string | null
          raw_json?: Json | null
          status: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          intent_id?: string | null
          order_id?: string | null
          provider?: string
          provider_event_id?: string | null
          raw_json?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: false
            referencedRelation: "payment_intents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          commission_on_transport: boolean
          commission_rate: number
          id: number
          listing_fee_cents: number
          listing_fee_days: number
          listing_fees_enabled: boolean
          payments_mode: string
          platform_identity: Json
          proforma_due_days: number
          subscriptions_enabled: boolean
          transport_quote_ttl_hours: number
          unpaid_order_ttl_hours: number
          updated_at: string
          vat_rate: number
        }
        Insert: {
          commission_on_transport?: boolean
          commission_rate?: number
          id?: number
          listing_fee_cents?: number
          listing_fee_days?: number
          listing_fees_enabled?: boolean
          payments_mode?: string
          platform_identity?: Json
          proforma_due_days?: number
          subscriptions_enabled?: boolean
          transport_quote_ttl_hours?: number
          unpaid_order_ttl_hours?: number
          updated_at?: string
          vat_rate?: number
        }
        Update: {
          commission_on_transport?: boolean
          commission_rate?: number
          id?: number
          listing_fee_cents?: number
          listing_fee_days?: number
          listing_fees_enabled?: boolean
          payments_mode?: string
          platform_identity?: Json
          proforma_due_days?: number
          subscriptions_enabled?: boolean
          transport_quote_ttl_hours?: number
          unpaid_order_ttl_hours?: number
          updated_at?: string
          vat_rate?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_path: string | null
          bank_name: string | null
          bio: string | null
          company_name: string | null
          created_at: string
          display_name: string | null
          entity_type: string | null
          fiscal_address: Json | null
          iban: string | null
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
          bank_name?: string | null
          bio?: string | null
          company_name?: string | null
          created_at?: string
          display_name?: string | null
          entity_type?: string | null
          fiscal_address?: Json | null
          iban?: string | null
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
          bank_name?: string | null
          bio?: string | null
          company_name?: string | null
          created_at?: string
          display_name?: string | null
          entity_type?: string | null
          fiscal_address?: Json | null
          iban?: string | null
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
      seller_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_code: string
          seller_id: string
          status: string
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_code: string
          seller_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_code?: string
          seller_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_subscriptions_plan_code_fkey"
            columns: ["plan_code"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "seller_subscriptions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_subscriptions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          code: string
          created_at: string
          currency: string
          description: string | null
          includes_listing_fees: boolean
          interval_months: number
          is_active: boolean
          max_active_listings: number | null
          name: string
          price_cents: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          currency?: string
          description?: string | null
          includes_listing_fees?: boolean
          interval_months?: number
          is_active?: boolean
          max_active_listings?: number | null
          name: string
          price_cents: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          currency?: string
          description?: string | null
          includes_listing_fees?: boolean
          interval_months?: number
          is_active?: boolean
          max_active_listings?: number | null
          name?: string
          price_cents?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
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
      _apply_intent_success: {
        Args: { p_intent_id: string }
        Returns: undefined
      }
      _build_order_payload: { Args: { p_order_id: string }; Returns: Json }
      _log_transport_event: {
        Args: {
          p_action: string
          p_data: Json
          p_from: string
          p_note: string
          p_order_id: string
          p_role: string
          p_to: string
        }
        Returns: undefined
      }
      activate_seller: { Args: never; Returns: Json }
      attach_payment_session: {
        Args: {
          p_checkout_url: string
          p_intent_id: string
          p_provider_ref: string
        }
        Returns: Json
      }
      cancel_order: {
        Args: { p_order_id: string; p_reason: string }
        Returns: Json
      }
      cancel_subscription: {
        Args: { p_subscription_id: string }
        Returns: Json
      }
      create_payment_intent: {
        Args: { p_provider?: string; p_purpose: string; p_ref: string }
        Returns: Json
      }
      demo_complete_payment: { Args: { p_intent_id: string }; Returns: Json }
      get_my_profile: {
        Args: never
        Returns: {
          avatar_path: string | null
          bank_name: string | null
          bio: string | null
          company_name: string | null
          created_at: string
          display_name: string | null
          entity_type: string | null
          fiscal_address: Json | null
          iban: string | null
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
      is_seller_activated: { Args: { p_user_id: string }; Returns: boolean }
      materials_default_kg_per_unit: {
        Args: { p_category: string; p_material: string }
        Returns: number
      }
      materials_density_kg_m3: {
        Args: { p_category: string; p_material: string }
        Returns: number
      }
      materials_estimate_mass_kg: {
        Args: {
          p_pallet_count: number
          p_pallet_total_kg: number
          p_qty: number
          p_unit: string
        }
        Returns: number
      }
      materials_estimate_mass_kg_v2: {
        Args: {
          p_category: string
          p_kg_per_unit: number
          p_material: string
          p_pallet_count: number
          p_pallet_total_kg: number
          p_qty: number
          p_unit: string
        }
        Returns: number
      }
      materials_marketplace_vehicle_allowed: {
        Args: {
          p_allow_non_bulk: boolean
          p_category: string
          p_payload: number
          p_vehicle: string
        }
        Returns: boolean
      }
      materials_min_trips: {
        Args: { p_mass_kg: number; p_payload_t: number }
        Returns: number
      }
      materials_offer_allowed: {
        Args: {
          p_allow_non_bulk: boolean
          p_category: string
          p_material: string
          p_max_piece_length_m: number
          p_payload: number
          p_unit: string
          p_vehicle: string
        }
        Returns: boolean
      }
      materials_requires_tanker: {
        Args: { p_category: string; p_material: string; p_unit: string }
        Returns: boolean
      }
      materials_vehicle_payload_valid: {
        Args: { p_payload: number; p_vehicle: string }
        Returns: boolean
      }
      place_order: {
        Args: {
          p_billing: Json
          p_cart: Json
          // Patched: SQL accepts null for these two.
          p_idempotency_key: string | null
          p_notes: string | null
          p_shipping: Json
        }
        Returns: Json
      }
      ro_cui_valid: { Args: { p_cui: string }; Returns: boolean }
      ro_phone_valid: { Args: { p_phone: string }; Returns: boolean }
      record_payment_event: {
        Args: {
          p_amount_cents: number
          p_currency: string
          p_event_id: string
          p_intent_id: string | null
          p_provider: string
          p_provider_ref: string | null
          p_raw: Json
          p_secret: string
          p_status: string
        }
        Returns: string
      }
      run_platform_maintenance: { Args: never; Returns: Json }
      seller_missing_requirements: { Args: { p_user_id: string }; Returns: string[] }
      set_user_role: {
        Args: { p_role: string; p_target: string }
        Returns: Json
      }
      transport_transition: {
        Args: { p_action: string; p_data?: Json; p_order_id: string }
        Returns: Json
      }
      upsert_listing_concrete_classes: {
        Args: { p_listing_id: number; p_rows: Json }
        Returns: undefined
      }
      upsert_listing_material_logistics: {
        Args: { p_listing_id: number; p_offers: Json; p_spec: Json }
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
    Enums: {},
  },
} as const
