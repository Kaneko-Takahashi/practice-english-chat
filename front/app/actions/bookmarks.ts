"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ToggleBookmarkResult =
  | { success: true; isBookmarked: boolean }
  | { success: false; error: string };

export type BookmarkItem = {
  id: string;
  messageId: string;
  content: string;
  createdAt: string;
};

export type GetBookmarksResult =
  | { success: true; bookmarks: BookmarkItem[] }
  | { success: false; error: string };

/**
 * ブックマークをトグルするServer Action
 */
export async function toggleBookmark(
  messageId: string
): Promise<ToggleBookmarkResult> {
  try {
    // UUID形式の検証
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(messageId)) {
      return {
        success: false,
        error:
          "メッセージがまだ保存されていません。しばらく待ってから再度お試しください。",
      };
    }

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

    // メッセージが存在するか確認
    const { data: message, error: messageError } = await supabase
      .from("chat_messages")
      .select("id")
      .eq("id", messageId)
      .maybeSingle();

    if (messageError) {
      console.error("Check message error:", messageError);
      return { success: false, error: messageError.message };
    }

    if (!message) {
      return {
        success: false,
        error: "メッセージが見つかりません。",
      };
    }

    // 既存のブックマークを確認
    const { data: existingBookmark, error: findError } = await supabase
      .from("bookmarks")
      .select("id")
      .eq("user_id", user.id)
      .eq("message_id", messageId)
      .maybeSingle();

    if (findError) {
      console.error("Find bookmark error:", findError);
      return { success: false, error: findError.message };
    }

    if (existingBookmark) {
      const bookmarkId = (existingBookmark as any).id;
      if (!bookmarkId) {
        return { success: false, error: "ブックマークIDが見つかりません" };
      }
      // ブックマークを削除（物理削除）
      const { error } = await supabase
        .from("bookmarks")
        .delete()
        .eq("id", bookmarkId);

      if (error) {
        console.error("Delete bookmark error:", error);
        return { success: false, error: error.message };
      }

      revalidatePath("/chat");
      revalidatePath("/bookmarks");
      return { success: true, isBookmarked: false };
    } else {
      // ブックマークを追加
      const { error } = await supabase.from("bookmarks").insert({
        user_id: user.id,
        message_id: messageId,
      } as any);

      if (error) {
        console.error("Create bookmark error:", error);
        return { success: false, error: error.message };
      }

      revalidatePath("/chat");
      revalidatePath("/bookmarks");
      return { success: true, isBookmarked: true };
    }
  } catch (error) {
    console.error("Toggle bookmark error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "予期しないエラーが発生しました",
    };
  }
}

/**
 * ブックマーク一覧を取得するServer Action
 */
export async function getBookmarks(): Promise<GetBookmarksResult> {
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

    // ブックマークを取得
    const { data: bookmarksData, error: bookmarksError } = await supabase
      .from("bookmarks")
      .select("id, message_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (bookmarksError) {
      console.error("Get bookmarks error:", bookmarksError);
      return { success: false, error: bookmarksError.message };
    }

    if (!bookmarksData || bookmarksData.length === 0) {
      return { success: true, bookmarks: [] };
    }

    // メッセージIDのリストを取得
    const messageIds = (bookmarksData as any[])
      .map((b: any) => b.message_id)
      .filter((id: any): id is string => typeof id === "string");

    if (messageIds.length === 0) {
      return { success: true, bookmarks: [] };
    }

    // メッセージを一括取得
    const { data: messagesData, error: messagesError } = await supabase
      .from("chat_messages")
      .select("id, content")
      .in("id", messageIds);

    if (messagesError) {
      console.error("Get messages error:", messagesError);
      return { success: false, error: messagesError.message };
    }

    // メッセージをマップに変換（高速検索のため）
    const messagesMap = new Map(
      ((messagesData as any[]) || []).map((m: any) => [m.id, m.content])
    );

    // データを整形
    const bookmarks: BookmarkItem[] = (bookmarksData as any[])
      .map((bookmark: any) => {
        const content = messagesMap.get(bookmark.message_id);
        if (!content) return null;

        return {
          id: bookmark.id,
          messageId: bookmark.message_id,
          content,
          createdAt: bookmark.created_at,
        };
      })
      .filter((item): item is BookmarkItem => item !== null);

    return { success: true, bookmarks };
  } catch (error) {
    console.error("Get bookmarks error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "予期しないエラーが発生しました",
    };
  }
}
