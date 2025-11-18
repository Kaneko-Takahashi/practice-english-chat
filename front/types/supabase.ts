export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string;
          display_name: string | null;
          avatar_url: string | null;
          learning_level: "beginner" | "standard" | "advanced";
          tts_enabled: boolean;
          tts_speed: "slow" | "normal" | "fast";
          tts_voice: string | null;
          theme: "light" | "dark";
          font_size: "small" | "medium" | "large";
          allow_usage_analysis: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          learning_level?: "beginner" | "standard" | "advanced";
          tts_enabled?: boolean;
          tts_speed?: "slow" | "normal" | "fast";
          tts_voice?: string | null;
          theme?: "light" | "dark";
          font_size?: "small" | "medium" | "large";
          allow_usage_analysis?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          learning_level?: "beginner" | "standard" | "advanced";
          tts_enabled?: boolean;
          tts_speed?: "slow" | "normal" | "fast";
          tts_voice?: string | null;
          theme?: "light" | "dark";
          font_size?: "small" | "medium" | "large";
          allow_usage_analysis?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      conversations: {
        Row: {
          id: string;
          user_id: string | null;
          title: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          title?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          title?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          response_to_message_id: string | null;
          message_set_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          response_to_message_id?: string | null;
          message_set_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          role?: "user" | "assistant" | "system";
          content?: string;
          response_to_message_id?: string | null;
          message_set_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          }
        ];
      };
      bookmarks: {
        Row: {
          id: string;
          user_id: string;
          message_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          message_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          message_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookmarks_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookmarks_message_id_fkey";
            columns: ["message_id"];
            referencedRelation: "messages";
            referencedColumns: ["id"];
          }
        ];
      };
      tts_cache: {
        Row: {
          id: string;
          message_id: string;
          provider: string;
          voice: string;
          audio_url: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          provider: string;
          voice: string;
          audio_url: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          provider?: string;
          voice?: string;
          audio_url?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tts_cache_message_id_fkey";
            columns: ["message_id"];
            referencedRelation: "messages";
            referencedColumns: ["id"];
          }
        ];
      };
      study_logs: {
        Row: {
          id: string;
          user_id: string;
          event_type:
            | "chat_send"
            | "audio_play"
            | "bookmark_add"
            | "bookmark_remove";
          learning_level: "beginner" | "standard" | "advanced" | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_type:
            | "chat_send"
            | "audio_play"
            | "bookmark_add"
            | "bookmark_remove";
          learning_level?: "beginner" | "standard" | "advanced" | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_type?:
            | "chat_send"
            | "audio_play"
            | "bookmark_add"
            | "bookmark_remove";
          learning_level?: "beginner" | "standard" | "advanced" | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "study_logs_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
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
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
