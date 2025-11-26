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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          account_name: string
          balance: number
          brand_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_name: string
          balance?: number
          brand_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_name?: string
          balance?: number
          brand_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          action: string
          changes: Json | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_collections: {
        Row: {
          brand_id: string | null
          cover_asset_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          brand_id?: string | null
          cover_asset_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          brand_id?: string | null
          cover_asset_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_collections_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_collections_cover_asset_id_fkey"
            columns: ["cover_asset_id"]
            isOneToOne: false
            referencedRelation: "creative_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_collections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brandboom_order_items: {
        Row: {
          color: string | null
          created_at: string
          id: string
          order_id: string
          product_name: string
          quantity: number
          size: string | null
          style_number: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          order_id: string
          product_name: string
          quantity?: number
          size?: string | null
          style_number?: string | null
          total_price: number
          unit_price: number
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          order_id?: string
          product_name?: string
          quantity?: number
          size?: string | null
          style_number?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "brandboom_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "brandboom_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      brandboom_orders: {
        Row: {
          brand_id: string
          brandboom_order_id: string
          buyer_email: string | null
          buyer_name: string
          cancel_date: string | null
          created_at: string
          id: string
          notes: string | null
          order_date: string
          order_type: string | null
          payment_status: string
          raw_data: Json | null
          ship_date: string | null
          shipping_status: string | null
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          brand_id: string
          brandboom_order_id: string
          buyer_email?: string | null
          buyer_name: string
          cancel_date?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_date: string
          order_type?: string | null
          payment_status?: string
          raw_data?: Json | null
          ship_date?: string | null
          shipping_status?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          brand_id?: string
          brandboom_order_id?: string
          buyer_email?: string | null
          buyer_name?: string
          cancel_date?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_date?: string
          order_type?: string | null
          payment_status?: string
          raw_data?: Json | null
          ship_date?: string | null
          shipping_status?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brandboom_orders_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brandboom_payments: {
        Row: {
          amount: number
          brand_id: string
          created_at: string
          id: string
          order_id: string | null
          payment_date: string
          payment_method: string | null
          status: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          brand_id: string
          created_at?: string
          id?: string
          order_id?: string | null
          payment_date: string
          payment_method?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          brand_id?: string
          created_at?: string
          id?: string
          order_id?: string | null
          payment_date?: string
          payment_method?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brandboom_payments_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brandboom_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "brandboom_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      brandboom_shipments: {
        Row: {
          brand_id: string
          carrier: string | null
          cost: number | null
          created_at: string
          delivery_date: string | null
          id: string
          order_id: string
          ship_date: string | null
          status: string
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          brand_id: string
          carrier?: string | null
          cost?: number | null
          created_at?: string
          delivery_date?: string | null
          id?: string
          order_id: string
          ship_date?: string | null
          status?: string
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          brand_id?: string
          carrier?: string | null
          cost?: number | null
          created_at?: string
          delivery_date?: string | null
          id?: string
          order_id?: string
          ship_date?: string | null
          status?: string
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brandboom_shipments_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brandboom_shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "brandboom_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      brandboom_sync_logs: {
        Row: {
          brand_id: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          records_synced: number | null
          started_at: string
          status: string
          sync_type: string
        }
        Insert: {
          brand_id: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          records_synced?: number | null
          started_at?: string
          status?: string
          sync_type: string
        }
        Update: {
          brand_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          records_synced?: number | null
          started_at?: string
          status?: string
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "brandboom_sync_logs_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          logo_url: string | null
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brands_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      charges: {
        Row: {
          account_id: string
          amount: number
          charge_date: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          invoice_id: string | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          amount: number
          charge_date?: string
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount?: number
          charge_date?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "charges_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          account_id: string
          attachments: Json | null
          created_at: string
          id: string
          message: string
          user_id: string
        }
        Insert: {
          account_id: string
          attachments?: Json | null
          created_at?: string
          id?: string
          message: string
          user_id: string
        }
        Update: {
          account_id?: string
          attachments?: Json | null
          created_at?: string
          id?: string
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_assets: {
        Row: {
          asset_id: string
          collection_id: string
          created_at: string
          id: string
          position: number | null
        }
        Insert: {
          asset_id: string
          collection_id: string
          created_at?: string
          id?: string
          position?: number | null
        }
        Update: {
          asset_id?: string
          collection_id?: string
          created_at?: string
          id?: string
          position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "collection_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "creative_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_assets_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "asset_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      creative_assets: {
        Row: {
          brand_id: string | null
          bucket: string
          category: string
          created_at: string
          description: string | null
          duration: number | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          height: number | null
          id: string
          metadata: Json | null
          mime_type: string
          status: string
          tags: string[] | null
          title: string | null
          updated_at: string
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          brand_id?: string | null
          bucket: string
          category?: string
          created_at?: string
          description?: string | null
          duration?: number | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          height?: number | null
          id?: string
          metadata?: Json | null
          mime_type: string
          status?: string
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          brand_id?: string | null
          bucket?: string
          category?: string
          created_at?: string
          description?: string | null
          duration?: number | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          height?: number | null
          id?: string
          metadata?: Json | null
          mime_type?: string
          status?: string
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "creative_assets_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_assets_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          invoice_number: string
          notes: string | null
          paid_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          notes?: string | null
          paid_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          notes?: string | null
          paid_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          current_brand_id: string | null
          email: string
          full_name: string | null
          id: string
          phone_number: string | null
          role: string
          title: string | null
          updated_at: string
          work_location: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          current_brand_id?: string | null
          email: string
          full_name?: string | null
          id: string
          phone_number?: string | null
          role?: string
          title?: string | null
          updated_at?: string
          work_location?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          current_brand_id?: string | null
          email?: string
          full_name?: string | null
          id?: string
          phone_number?: string | null
          role?: string
          title?: string | null
          updated_at?: string
          work_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_brand_id_fkey"
            columns: ["current_brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          approved: boolean
          approved_at: string | null
          approved_by: string | null
          brand_id: string
          created_at: string
          id: string
          requested_at: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          brand_id: string
          created_at?: string
          id?: string
          requested_at?: string
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          brand_id?: string
          created_at?: string
          id?: string
          requested_at?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_mj_admin: { Args: { _user_id: string }; Returns: boolean }
      user_has_brand_access: {
        Args: { _brand_id: string; _user_id: string }
        Returns: boolean
      }
      user_has_brand_role: {
        Args: { _brand_id: string; _role: string; _user_id: string }
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
