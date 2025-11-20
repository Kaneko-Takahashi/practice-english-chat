export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      bookmarks: {
        Row: {
          created_at: string;
          id: string;
          message_id: string;
          note: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          message_id: string;
          note?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          message_id?: string;
          note?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookmarks_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "chat_messages";
            referencedColumns: ["id"];
          }
        ];
      };
      chat_groups: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          id: string;
          profile_id: string;
          title: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          profile_id: string;
          title?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          profile_id?: string;
          title?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_groups_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          }
        ];
      };
      chat_messages: {
        Row: {
          bubble_index: number | null;
          chat_group_id: string;
          content: string;
          created_at: string;
          deleted_at: string | null;
          id: string;
          language_code: string | null;
          message_set_id: string | null;
          metadata_json: Json | null;
          response_to_message_id: string | null;
          role: Database["public"]["Enums"]["message_role"];
          sequence_num: number;
          updated_at: string;
        };
        Insert: {
          bubble_index?: number | null;
          chat_group_id: string;
          content: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          language_code?: string | null;
          message_set_id?: string | null;
          metadata_json?: Json | null;
          response_to_message_id?: string | null;
          role: Database["public"]["Enums"]["message_role"];
          sequence_num: number;
          updated_at?: string;
        };
        Update: {
          bubble_index?: number | null;
          chat_group_id?: string;
          content?: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          language_code?: string | null;
          message_set_id?: string | null;
          metadata_json?: Json | null;
          response_to_message_id?: string | null;
          role?: Database["public"]["Enums"]["message_role"];
          sequence_num?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_group_id_fkey";
            columns: ["chat_group_id"];
            isOneToOne: false;
            referencedRelation: "chat_groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_messages_response_to_message_id_fkey";
            columns: ["response_to_message_id"];
            isOneToOne: false;
            referencedRelation: "chat_messages";
            referencedColumns: ["id"];
          }
        ];
      };
      conversations: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          id: string;
          title: string | null;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          title?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          title?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          bubble_index: number | null;
          content: string;
          conversation_id: string;
          created_at: string;
          deleted_at: string | null;
          id: string;
          language_code: string | null;
          message_set_id: string | null;
          metadata_json: Json | null;
          response_to_message_id: string | null;
          role: Database["public"]["Enums"]["message_role"];
          sequence_num: number;
          updated_at: string;
        };
        Insert: {
          bubble_index?: number | null;
          content: string;
          conversation_id: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          language_code?: string | null;
          message_set_id?: string | null;
          metadata_json?: Json | null;
          response_to_message_id?: string | null;
          role: Database["public"]["Enums"]["message_role"];
          sequence_num: number;
          updated_at?: string;
        };
        Update: {
          bubble_index?: number | null;
          content?: string;
          conversation_id?: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          language_code?: string | null;
          message_set_id?: string | null;
          metadata_json?: Json | null;
          response_to_message_id?: string | null;
          role?: Database["public"]["Enums"]["message_role"];
          sequence_num?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_response_to_message_id_fkey";
            columns: ["response_to_message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          }
        ];
      };
      profiles: {
        Row: {
          allow_usage_analysis: boolean;
          avatar_url: string | null;
          created_at: string;
          display_name: string | null;
          font_size: string;
          learning_level: string;
          theme: string;
          tts_enabled: boolean;
          tts_speed: string;
          tts_voice: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          allow_usage_analysis?: boolean;
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          font_size?: string;
          learning_level?: string;
          theme?: string;
          tts_enabled?: boolean;
          tts_speed?: string;
          tts_voice?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          allow_usage_analysis?: boolean;
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          font_size?: string;
          learning_level?: string;
          theme?: string;
          tts_enabled?: boolean;
          tts_speed?: string;
          tts_voice?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      study_logs: {
        Row: {
          created_at: string;
          event_type: string;
          id: string;
          learning_level: string | null;
          metadata: Json | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          event_type: string;
          id?: string;
          learning_level?: string | null;
          metadata?: Json | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          event_type?: string;
          id?: string;
          learning_level?: string | null;
          metadata?: Json | null;
          user_id?: string;
        };
        Relationships: [];
      };
      tts_cache: {
        Row: {
          audio_mime_type: string;
          created_at: string;
          expires_at: string | null;
          hash_key: string;
          id: string;
          message_id: string;
          provider: string;
          storage_key: string;
          voice: string;
        };
        Insert: {
          audio_mime_type: string;
          created_at?: string;
          expires_at?: string | null;
          hash_key: string;
          id?: string;
          message_id: string;
          provider: string;
          storage_key: string;
          voice: string;
        };
        Update: {
          audio_mime_type?: string;
          created_at?: string;
          expires_at?: string | null;
          hash_key?: string;
          id?: string;
          message_id?: string;
          provider?: string;
          storage_key?: string;
          voice?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tts_cache_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "chat_messages";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      message_role: "user" | "assistant" | "system";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
      DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  public: {
    Enums: {
      message_role: ["user", "assistant", "system"],
    },
  },
} as const;

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
