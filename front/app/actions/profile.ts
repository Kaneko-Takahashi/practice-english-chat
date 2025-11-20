"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Profile } from "@/types/supabase";

export type GetProfileResult =
  | { success: true; profile: Profile }
  | { success: false; error: string };

/**
 * 現在のユーザーのプロフィールを取得するServer Action
 */
export async function getProfile(): Promise<GetProfileResult> {
  try {
    const supabase = await createClient();

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

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("Get profile error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, profile: data as Profile };
  } catch (error) {
    console.error("Get profile error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "予期しないエラーが発生しました",
    };
  }
}

export type UpdateDisplayNameResult =
  | { success: true; message: string }
  | { success: false; error: string };

/**
 * 表示名を更新するServer Action
 */
export async function updateDisplayName(
  displayName: string
): Promise<UpdateDisplayNameResult> {
  try {
    const supabase = await createClient();

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

    // 空文字の場合はNULLに変換
    const displayNameValue = displayName.trim() || null;

    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayNameValue })
      .eq("user_id", user.id);

    if (error) {
      console.error("Update display name error:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/profile");
    revalidatePath("/chat");
    return { success: true, message: "表示名を更新しました" };
  } catch (error) {
    console.error("Update display name error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "予期しないエラーが発生しました",
    };
  }
}
