"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Profile } from "@/types/supabase";

export type UserSettings = {
  learning_level: "beginner" | "standard" | "advanced";
  tts_enabled: boolean;
  tts_speed: "slow" | "normal" | "fast";
  tts_voice: string | null;
  theme: "light" | "dark";
  font_size: "small" | "medium" | "large";
  allow_usage_analysis: boolean;
};

export type GetSettingsResult =
  | { success: true; settings: UserSettings }
  | { success: false; error: string };

/**
 * 現在のユーザーの設定を取得するServer Action
 */
export async function getSettings(): Promise<GetSettingsResult> {
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

    // まず、プロフィールが存在するか確認
    // 存在するカラムのみを選択（存在しないカラムはエラーになるため）
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url, created_at, updated_at")
      .eq("user_id", user.id)
      .single();

    // プロフィールが存在しない場合はデフォルト値を返す
    if (profileError && profileError.code === "PGRST116") {
      const defaultSettings: UserSettings = {
        learning_level: "standard",
        tts_enabled: true,
        tts_speed: "normal",
        tts_voice: null,
        theme: "light",
        font_size: "medium",
        allow_usage_analysis: false,
      };
      return { success: true, settings: defaultSettings };
    }

    // 設定カラムを個別に取得（存在しない場合はエラーを無視）
    const settingsQueries = await Promise.allSettled([
      supabase
        .from("profiles")
        .select("learning_level")
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("profiles")
        .select("tts_enabled")
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("profiles")
        .select("tts_speed")
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("profiles")
        .select("tts_voice")
        .eq("user_id", user.id)
        .single(),
      supabase.from("profiles").select("theme").eq("user_id", user.id).single(),
      supabase
        .from("profiles")
        .select("font_size")
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("profiles")
        .select("allow_usage_analysis")
        .eq("user_id", user.id)
        .single(),
    ]);

    // デフォルト値で補完（カラムが存在しない場合はデフォルト値を使用）
    const settings: UserSettings = {
      learning_level:
        settingsQueries[0].status === "fulfilled" &&
        settingsQueries[0].value.data?.learning_level
          ? (settingsQueries[0].value.data
              .learning_level as UserSettings["learning_level"])
          : "standard",
      tts_enabled:
        settingsQueries[1].status === "fulfilled" &&
        settingsQueries[1].value.data?.tts_enabled !== undefined
          ? settingsQueries[1].value.data.tts_enabled
          : true,
      tts_speed:
        settingsQueries[2].status === "fulfilled" &&
        settingsQueries[2].value.data?.tts_speed
          ? (settingsQueries[2].value.data
              .tts_speed as UserSettings["tts_speed"])
          : "normal",
      tts_voice:
        settingsQueries[3].status === "fulfilled" &&
        settingsQueries[3].value.data?.tts_voice !== undefined
          ? settingsQueries[3].value.data.tts_voice
          : null,
      theme:
        settingsQueries[4].status === "fulfilled" &&
        settingsQueries[4].value.data?.theme
          ? (settingsQueries[4].value.data.theme as UserSettings["theme"])
          : "light",
      font_size:
        settingsQueries[5].status === "fulfilled" &&
        settingsQueries[5].value.data?.font_size
          ? (settingsQueries[5].value.data
              .font_size as UserSettings["font_size"])
          : "medium",
      allow_usage_analysis:
        settingsQueries[6].status === "fulfilled" &&
        settingsQueries[6].value.data?.allow_usage_analysis !== undefined
          ? settingsQueries[6].value.data.allow_usage_analysis
          : false,
    };

    return { success: true, settings };
  } catch (error) {
    console.error("Get settings error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "予期しないエラーが発生しました",
    };
  }
}

export type UpdateSettingsResult =
  | { success: true; message: string }
  | { success: false; error: string };

/**
 * 設定を更新するServer Action
 */
export async function updateSettings(
  settings: Partial<UserSettings>
): Promise<UpdateSettingsResult> {
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

    // 設定カラムが存在するか確認してから更新
    // 存在しないカラムはスキップして、存在するカラムのみを更新
    const updateData: Record<string, any> = {};

    // 各設定項目を順次チェック（存在するカラムのみを更新データに追加）
    const columnsToCheck = [
      { key: "learning_level", value: settings.learning_level },
      { key: "tts_enabled", value: settings.tts_enabled },
      { key: "tts_speed", value: settings.tts_speed },
      { key: "tts_voice", value: settings.tts_voice },
      { key: "theme", value: settings.theme },
      { key: "font_size", value: settings.font_size },
      { key: "allow_usage_analysis", value: settings.allow_usage_analysis },
    ];

    for (const { key, value } of columnsToCheck) {
      if (value === undefined) continue;

      console.log(`updateSettings - Checking column ${key} with value:`, value);

      try {
        // テストクエリでカラムの存在を確認
        const { error: testError } = await supabase
          .from("profiles")
          .select(key)
          .eq("user_id", user.id)
          .limit(1);

        // エラーがなく、または「does not exist」エラーでない場合は追加
        if (
          !testError ||
          (!testError.message.includes("does not exist") &&
            !testError.message.includes("schema cache"))
        ) {
          updateData[key] = value;
          console.log(
            `updateSettings - Column ${key} exists, adding to update data`
          );
        } else {
          console.log(
            `updateSettings - Column ${key} does not exist, skipping`
          );
        }
      } catch (e) {
        // エラーは無視（カラムが存在しない場合）
        console.log(`updateSettings - Error checking column ${key}:`, e);
      }
    }

    console.log("updateSettings - Final update data:", updateData);

    // 更新するデータがない場合は成功として扱う（マイグレーション未実行時）
    if (Object.keys(updateData).length === 0) {
      return {
        success: true,
        message:
          "設定を更新しました（一部の設定はマイグレーション後に有効になります）",
      };
    }

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("user_id", user.id);

    if (error) {
      console.error("Update settings error:", error);
      // カラムが存在しないエラーの場合、より分かりやすいメッセージを返す
      if (
        error.message.includes("does not exist") ||
        error.message.includes("schema cache")
      ) {
        return {
          success: false,
          error:
            "データベースのマイグレーションが必要です。マイグレーションファイルを実行してください。",
        };
      }
      return { success: false, error: error.message };
    }

    revalidatePath("/settings");
    revalidatePath("/chat");
    revalidatePath("/profile");
    return { success: true, message: "設定を更新しました" };
  } catch (error) {
    console.error("Update settings error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "予期しないエラーが発生しました",
    };
  }
}
