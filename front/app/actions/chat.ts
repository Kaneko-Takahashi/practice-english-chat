"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  messageSetId?: string | null;
  bubbleIndex?: number | null;
  isBookmarked?: boolean;
};

export type CreateConversationResult =
  | { success: true; conversationId: string }
  | { success: false; error: string };

/**
 * 会話を作成するServer Action
 */
export async function createConversation(): Promise<CreateConversationResult> {
  try {
    const supabase = await createClient();

    // 現在のユーザーを取得
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        error: "認証が必要です。ログインしてください。",
      };
    }

    // profilesテーブルにレコードが存在するか確認
    const { data: profileData, error: profileCheckError } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .single();

    // profilesテーブルにレコードが存在しない場合は作成
    if (profileCheckError || !profileData) {
      console.log("Profile not found, creating profile for user:", user.id);
      const { error: profileCreateError } = await supabase
        .from("profiles")
        .upsert(
          {
            user_id: user.id,
            display_name:
              user.user_metadata?.display_name ||
              user.user_metadata?.full_name ||
              user.email?.split("@")[0] ||
              null,
            avatar_url: user.user_metadata?.avatar_url || null,
            learning_level: "standard",
            tts_enabled: true,
            tts_speed: "normal",
            tts_voice: null,
            theme: "light",
            font_size: "medium",
            allow_usage_analysis: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: "user_id" }
        );

      if (profileCreateError) {
        console.error("Profile creation error:", profileCreateError);
        return {
          success: false,
          error: `プロファイルの作成に失敗しました: ${profileCreateError.message}`,
        };
      }
      
      // プロファイル作成後、再度確認
      const { data: verifyProfile, error: verifyError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("user_id", user.id)
        .single();
        
      if (verifyError || !verifyProfile) {
        console.error("Profile verification failed:", verifyError);
        return {
          success: false,
          error: "プロファイルの作成確認に失敗しました",
        };
      }
    }

    // チャットグループを作成
    const { data, error } = await supabase
      .from("chat_groups")
      .insert({
        profile_id: user.id,
        title: null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Create conversation error:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/chat");
    return { success: true, conversationId: data.id };
  } catch (error) {
    console.error("Create conversation error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "予期しないエラーが発生しました",
    };
  }
}

export type GetOrCreateConversationResult =
  | { success: true; conversationId: string }
  | { success: false; error: string };

/**
 * 最新の会話を取得、なければ作成するServer Action
 */
export async function getOrCreateConversation(): Promise<GetOrCreateConversationResult> {
  try {
    const supabase = await createClient();

    // 現在のユーザーを取得
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        error: "認証が必要です。ログインしてください。",
      };
    }

    // 最新のチャットグループを取得
    const { data: chatGroups, error: fetchError } = await supabase
      .from("chat_groups")
      .select("id")
      .eq("profile_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error("Fetch chat group error:", fetchError);
      return { success: false, error: fetchError.message };
    }

    // チャットグループが存在する場合はそれを返す
    if (chatGroups && chatGroups.length > 0) {
      return { success: true, conversationId: chatGroups[0].id };
    }

    // 会話が存在しない場合は新規作成
    return await createConversation();
  } catch (error) {
    console.error("Get or create conversation error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "予期しないエラーが発生しました",
    };
  }
}

export type SaveMessageResult =
  | { success: true; messageId: string }
  | { success: false; error: string };

/**
 * メッセージを保存するServer Action
 */
export async function saveMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  sequenceNum: number,
  responseToMessageId?: string | null,
  messageSetId?: string | null,
  bubbleIndex?: number | null
): Promise<SaveMessageResult> {
  try {
    const supabase = await createClient();

    // 現在のユーザーを取得
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        error: "認証が必要です。ログインしてください。",
      };
    }

    // メッセージを保存
    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        chat_group_id: conversationId,
        role,
        content,
        sequence_num: sequenceNum,
        response_to_message_id: responseToMessageId || null,
        message_set_id: messageSetId || null,
        bubble_index: bubbleIndex || null,
        language_code: "en",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Save message error:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/chat");
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error("Save message error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "予期しないエラーが発生しました",
    };
  }
}

export type GetMessagesResult =
  | { success: true; messages: ChatMessage[] }
  | { success: false; error: string };

/**
 * 会話のメッセージを取得するServer Action
 */
export async function getMessages(
  conversationId: string
): Promise<GetMessagesResult> {
  try {
    const supabase = await createClient();

    // 現在のユーザーを取得
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        error: "認証が必要です。ログインしてください。",
      };
    }

    // メッセージを取得
    const { data: messages, error } = await supabase
      .from("chat_messages")
      .select("id, role, content, created_at, message_set_id, bubble_index")
      .eq("chat_group_id", conversationId)
      .is("deleted_at", null)
      .order("sequence_num", { ascending: true });

    if (error) {
      console.error("Get messages error:", error);
      return { success: false, error: error.message };
    }

    // ブックマーク情報を取得
    const { data: bookmarks } = await supabase
      .from("bookmarks")
      .select("message_id")
      .eq("user_id", user.id);

    const bookmarkedMessageIds = new Set(
      bookmarks?.map((b) => b.message_id) || []
    );

    // メッセージを整形
    const formattedMessages: ChatMessage[] =
      messages?.map((msg) => ({
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: msg.content,
        createdAt: new Date(msg.created_at),
        messageSetId: msg.message_set_id,
        bubbleIndex: msg.bubble_index,
        isBookmarked: bookmarkedMessageIds.has(msg.id),
      })) || [];

    return { success: true, messages: formattedMessages };
  } catch (error) {
    console.error("Get messages error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "予期しないエラーが発生しました",
    };
  }
}
