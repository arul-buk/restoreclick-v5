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
      audit_logs: {
        Row: {
          action: string
          changed_fields: string[] | null
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          ip_address: unknown | null
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          performed_by: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          changed_fields?: string[] | null
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          performed_by?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          changed_fields?: string[] | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          performed_by?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string | null
          email: string
          id: string
          metadata: Json | null
          name: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          metadata?: Json | null
          name?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          metadata?: Json | null
          name?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      download_links: {
        Row: {
          created_at: string | null
          download_count: number | null
          expires_at: string | null
          id: string
          last_accessed_at: string | null
          link_type: Database["public"]["Enums"]["download_link_type_enum"]
          max_downloads: number | null
          metadata: Json | null
          order_id: string | null
          target_images: string[] | null
          token: string
        }
        Insert: {
          created_at?: string | null
          download_count?: number | null
          expires_at?: string | null
          id?: string
          last_accessed_at?: string | null
          link_type: Database["public"]["Enums"]["download_link_type_enum"]
          max_downloads?: number | null
          metadata?: Json | null
          order_id?: string | null
          target_images?: string[] | null
          token: string
        }
        Update: {
          created_at?: string | null
          download_count?: number | null
          expires_at?: string | null
          id?: string
          last_accessed_at?: string | null
          link_type?: Database["public"]["Enums"]["download_link_type_enum"]
          max_downloads?: number | null
          metadata?: Json | null
          order_id?: string | null
          target_images?: string[] | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "download_links_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      email_queue: {
        Row: {
          attempt_number: number | null
          attachments: Json | null
          cc_emails: string[] | null
          created_at: string | null
          dynamic_data: Json | null
          email_type: Database["public"]["Enums"]["email_type_enum"]
          error_code: string | null
          error_message: string | null
          failed_at: string | null
          id: string
          max_attempts: number | null
          metadata: Json | null
          order_id: string | null
          scheduled_for: string | null
          sendgrid_message_id: string | null
          sendgrid_template_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["email_status_enum"]
          subject: string | null
          to_email: string
          to_name: string | null
          updated_at: string | null
        }
        Insert: {
          attempt_number?: number | null
          attachments?: Json | null
          cc_emails?: string[] | null
          created_at?: string | null
          dynamic_data?: Json | null
          email_type: Database["public"]["Enums"]["email_type_enum"]
          error_code?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          max_attempts?: number | null
          metadata?: Json | null
          order_id?: string | null
          scheduled_for?: string | null
          sendgrid_message_id?: string | null
          sendgrid_template_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_status_enum"]
          subject?: string | null
          to_email: string
          to_name?: string | null
          updated_at?: string | null
        }
        Update: {
          attempt_number?: number | null
          attachments?: Json | null
          cc_emails?: string[] | null
          created_at?: string | null
          dynamic_data?: Json | null
          email_type?: Database["public"]["Enums"]["email_type_enum"]
          error_code?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          max_attempts?: number | null
          metadata?: Json | null
          order_id?: string | null
          scheduled_for?: string | null
          sendgrid_message_id?: string | null
          sendgrid_template_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_status_enum"]
          subject?: string | null
          to_email?: string
          to_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_queue_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      file_uploads: {
        Row: {
          created_at: string | null
          customer_email: string | null
          expires_at: string | null
          file_size_bytes: number | null
          id: string
          metadata: Json | null
          mime_type: string | null
          original_filename: string
          status: Database["public"]["Enums"]["upload_status_enum"]
          storage_path: string
          updated_at: string | null
          upload_session_id: string
        }
        Insert: {
          created_at?: string | null
          customer_email?: string | null
          expires_at?: string | null
          file_size_bytes?: number | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          original_filename: string
          status?: Database["public"]["Enums"]["upload_status_enum"]
          storage_path: string
          updated_at?: string | null
          upload_session_id: string
        }
        Update: {
          created_at?: string | null
          customer_email?: string | null
          expires_at?: string | null
          file_size_bytes?: number | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          original_filename?: string
          status?: Database["public"]["Enums"]["upload_status_enum"]
          storage_path?: string
          updated_at?: string | null
          upload_session_id?: string
        }
        Relationships: []
      }
      images: {
        Row: {
          created_at: string | null
          file_size_bytes: number | null
          format: string | null
          height: number | null
          id: string
          metadata: Json | null
          mime_type: string | null
          order_id: string | null
          parent_image_id: string | null
          processing_completed_at: string | null
          processing_duration_ms: number | null
          processing_started_at: string | null
          public_url: string | null
          status: Database["public"]["Enums"]["image_status_enum"]
          storage_bucket: string
          storage_path: string
          type: Database["public"]["Enums"]["image_type_enum"]
          updated_at: string | null
          width: number | null
        }
        Insert: {
          created_at?: string | null
          file_size_bytes?: number | null
          format?: string | null
          height?: number | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          order_id?: string | null
          parent_image_id?: string | null
          processing_completed_at?: string | null
          processing_duration_ms?: number | null
          processing_started_at?: string | null
          public_url?: string | null
          status?: Database["public"]["Enums"]["image_status_enum"]
          storage_bucket: string
          storage_path: string
          type: Database["public"]["Enums"]["image_type_enum"]
          updated_at?: string | null
          width?: number | null
        }
        Update: {
          created_at?: string | null
          file_size_bytes?: number | null
          format?: string | null
          height?: number | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          order_id?: string | null
          parent_image_id?: string | null
          processing_completed_at?: string | null
          processing_duration_ms?: number | null
          processing_started_at?: string | null
          public_url?: string | null
          status?: Database["public"]["Enums"]["image_status_enum"]
          storage_bucket?: string
          storage_path?: string
          type?: Database["public"]["Enums"]["image_type_enum"]
          updated_at?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "images_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "images_parent_image_id_fkey"
            columns: ["parent_image_id"]
            isOneToOne: false
            referencedRelation: "images"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          completed_at: string | null
          created_at: string | null
          currency: string | null
          customer_id: string | null
          discount_amount: number | null
          id: string
          metadata: Json | null
          order_number: string
          paid_at: string | null
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["payment_status_enum"] | null
          status: Database["public"]["Enums"]["order_status_enum"]
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          subtotal: number | null
          tax_amount: number | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          id?: string
          metadata?: Json | null
          order_number: string
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status_enum"] | null
          status?: Database["public"]["Enums"]["order_status_enum"]
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          id?: string
          metadata?: Json | null
          order_number?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status_enum"] | null
          status?: Database["public"]["Enums"]["order_status_enum"]
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      restoration_jobs: {
        Row: {
          attempt_number: number | null
          completed_at: string | null
          created_at: string | null
          error_code: string | null
          error_message: string | null
          external_job_id: string | null
          external_provider: string
          external_status: string | null
          failed_at: string | null
          id: string
          input_parameters: Json | null
          max_attempts: number | null
          metadata: Json | null
          original_image_id: string | null
          output_data: Json | null
          queued_at: string | null
          restored_image_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["job_status_enum"]
          updated_at: string | null
        }
        Insert: {
          attempt_number?: number | null
          completed_at?: string | null
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          external_job_id?: string | null
          external_provider?: string
          external_status?: string | null
          failed_at?: string | null
          id?: string
          input_parameters?: Json | null
          max_attempts?: number | null
          metadata?: Json | null
          original_image_id?: string | null
          output_data?: Json | null
          queued_at?: string | null
          restored_image_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status_enum"]
          updated_at?: string | null
        }
        Update: {
          attempt_number?: number | null
          completed_at?: string | null
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          external_job_id?: string | null
          external_provider?: string
          external_status?: string | null
          failed_at?: string | null
          id?: string
          input_parameters?: Json | null
          max_attempts?: number | null
          metadata?: Json | null
          original_image_id?: string | null
          output_data?: Json | null
          queued_at?: string | null
          restored_image_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status_enum"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restoration_jobs_original_image_id_fkey"
            columns: ["original_image_id"]
            isOneToOne: false
            referencedRelation: "images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restoration_jobs_restored_image_id_fkey"
            columns: ["restored_image_id"]
            isOneToOne: false
            referencedRelation: "images"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_order_completion: {
        Args: {
          order_uuid: string
        }
        Returns: boolean
      }
      cleanup_expired_uploads: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      generate_order_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      download_link_type_enum: "single_image" | "zip_all" | "share"
      email_status_enum: "pending" | "sending" | "sent" | "failed" | "bounced"
      email_type_enum: "order_confirmation" | "restoration_complete" | "share_family"
      image_status_enum: "pending" | "uploaded" | "processing" | "completed" | "failed"
      image_type_enum: "original" | "restored"
      job_status_enum: "pending" | "queued" | "processing" | "completed" | "failed" | "cancelled"
      order_status_enum: "pending_payment" | "processing" | "completed" | "failed" | "refunded"
      payment_status_enum: "pending" | "paid" | "failed" | "refunded"
      upload_status_enum: "pending" | "uploaded" | "moved_to_permanent" | "expired" | "deleted"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      download_link_type_enum: ["single_image", "zip_all", "share"],
      email_status_enum: ["pending", "sending", "sent", "failed", "bounced"],
      email_type_enum: [
        "order_confirmation",
        "restoration_complete",
        "share_family",
      ],
      image_status_enum: [
        "pending",
        "uploaded",
        "processing",
        "completed",
        "failed",
      ],
      image_type_enum: ["original", "restored"],
      job_status_enum: [
        "pending",
        "queued",
        "processing",
        "completed",
        "failed",
        "cancelled",
      ],
      order_status_enum: [
        "pending_payment",
        "processing",
        "completed",
        "failed",
        "refunded",
      ],
      payment_status_enum: ["pending", "paid", "failed", "refunded"],
      upload_status_enum: [
        "pending",
        "uploaded",
        "moved_to_permanent",
        "expired",
        "deleted",
      ],
    },
  },
} as const
