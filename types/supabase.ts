export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      orders: {
        Row: {
          amount: number
          created_at: string
          currency: string
          customer_email: string | null
          id: string
          image_batch_id: string | null
          status: Database["public"]["Enums"]["order_status_enum"] | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency: string
          customer_email?: string | null
          id?: string
          image_batch_id?: string | null
          status?: Database["public"]["Enums"]["order_status_enum"] | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          customer_email?: string | null
          id?: string
          image_batch_id?: string | null
          status?: Database["public"]["Enums"]["order_status_enum"] | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          ai_model_used: string | null
          ai_model_version: string | null
          error_message: string | null
          id: string
          original_image_storage_path: string
          replicate_prediction_id: string | null
          restored_image_storage_path: string | null
          status: Database["public"]["Enums"]["photo_status_enum"]
          updated_at: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          ai_model_used?: string | null
          ai_model_version?: string | null
          error_message?: string | null
          id?: string
          original_image_storage_path: string
          replicate_prediction_id?: string | null
          restored_image_storage_path?: string | null
          status?: Database["public"]["Enums"]["photo_status_enum"]
          updated_at?: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          ai_model_used?: string | null
          ai_model_version?: string | null
          error_message?: string | null
          id?: string
          original_image_storage_path?: string
          replicate_prediction_id?: string | null
          restored_image_storage_path?: string | null
          status?: Database["public"]["Enums"]["photo_status_enum"]
          updated_at?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      points_transactions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          points_amount: number
          related_order_id: string | null
          related_referral_id: string | null
          transaction_type: Database["public"]["Enums"]["points_transaction_type_enum"]
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          points_amount: number
          related_order_id?: string | null
          related_referral_id?: string | null
          transaction_type: Database["public"]["Enums"]["points_transaction_type_enum"]
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          points_amount?: number
          related_order_id?: string | null
          related_referral_id?: string | null
          transaction_type?: Database["public"]["Enums"]["points_transaction_type_enum"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_transactions_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_transactions_related_referral_id_fkey"
            columns: ["related_referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      predictions: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          input_image_url: string | null
          order_id: string | null
          output_image_url: string | null
          replicate_id: string
          status: Database["public"]["Enums"]["prediction_status_enum"] | null
          updated_at: string
          version: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          input_image_url?: string | null
          order_id?: string | null
          output_image_url?: string | null
          replicate_id: string
          status?: Database["public"]["Enums"]["prediction_status_enum"] | null
          updated_at?: string
          version?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          input_image_url?: string | null
          order_id?: string | null
          output_image_url?: string | null
          replicate_id?: string
          status?: Database["public"]["Enums"]["prediction_status_enum"] | null
          updated_at?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "predictions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          current_period_end: string | null
          email: string | null
          full_name: string | null
          id: string
          is_pro: boolean | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          subscription_updated_at: string | null
          updated_at: string
          user_status: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          current_period_end?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_pro?: boolean | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          subscription_updated_at?: string | null
          updated_at?: string
          user_status?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          current_period_end?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_pro?: boolean | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          subscription_updated_at?: string | null
          updated_at?: string
          user_status?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referral_code_used: string | null
          referred_user_id: string
          referrer_user_id: string
          reward_claimed: boolean
          status: Database["public"]["Enums"]["referral_status_enum"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          referral_code_used?: string | null
          referred_user_id: string
          referrer_user_id: string
          reward_claimed?: boolean
          status?: Database["public"]["Enums"]["referral_status_enum"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          referral_code_used?: string | null
          referred_user_id?: string
          referrer_user_id?: string
          reward_claimed?: boolean
          status?: Database["public"]["Enums"]["referral_status_enum"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_user_id_fkey"
            columns: ["referrer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_questions_with_topic_names: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          created_at: string
          question_text: string
          options: Json
          correct_option_index: number
          topic_id: string
          topic_name: string
        }[]
      }
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      order_status_enum:
        | "pending"
        | "succeeded"
        | "failed"
        | "requires_action"
        | "refunded"
        | "completed"
        | "processing"
        | "restoration_failed"
      photo_status_enum:
        | "uploaded"
        | "processing"
        | "completed"
        | "failed"
        | "pending_payment"
      points_transaction_type_enum:
        | "earned_referral"
        | "earned_bonus"
        | "spent_discount"
      prediction_status_enum:
        | "starting"
        | "processing"
        | "succeeded"
        | "failed"
        | "canceled"
      referral_status_enum: "pending" | "completed" | "expired"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      order_status_enum: [
        "pending",
        "succeeded",
        "failed",
        "requires_action",
        "refunded",
        "completed",
        "processing",
        "restoration_failed",
      ],
      photo_status_enum: [
        "uploaded",
        "processing",
        "completed",
        "failed",
        "pending_payment",
      ],
      points_transaction_type_enum: [
        "earned_referral",
        "earned_bonus",
        "spent_discount",
      ],
      prediction_status_enum: [
        "starting",
        "processing",
        "succeeded",
        "failed",
        "canceled",
      ],
      referral_status_enum: ["pending", "completed", "expired"],
    },
  },
} as const
