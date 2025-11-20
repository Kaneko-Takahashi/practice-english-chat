"use server";

import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";

type StudyLogInsert = Database["public"]["Tables"]["study_logs"]["Insert"];
type EventType = StudyLogInsert["event_type"];

/**
 * 学習ログを記録する
 * プライバシー設定で許可されている場合のみ記録される
 */
export async function logStudyEvent(
  eventType: EventType,
  metadata?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "認証エラー" };
    }

    // プライバシー設定を確認
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("allow_usage_analysis, learning_level")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      console.error("Failed to fetch privacy settings:", profileError);
      return { success: false, error: "設定の取得に失敗しました" };
    }

    // プライバシー設定で許可されていない場合はログを記録しない
    if (!(profileData as any).allow_usage_analysis) {
      return { success: true }; // エラーではないが、ログは記録しない
    }

    // ログを記録
    const { error: insertError } = await (supabase as any)
      .from("study_logs")
      .insert({
        user_id: user.id,
        event_type: eventType,
        learning_level: (profileData as any).learning_level,
        metadata: metadata || {},
      });

    if (insertError) {
      console.error("Failed to insert study log:", insertError);
      return { success: false, error: "ログの記録に失敗しました" };
    }

    return { success: true };
  } catch (error) {
    console.error("logStudyEvent error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "不明なエラー",
    };
  }
}

/**
 * 学習統計データを取得する
 */
export async function getStudyStatistics(days: number = 30): Promise<{
  success: boolean;
  data?: {
    totalChatCount: number;
    totalAudioPlayCount: number;
    totalBookmarkCount: number;
    dailyStats: Array<{
      date: string;
      chatCount: number;
      audioPlayCount: number;
      bookmarkCount: number;
    }>;
    eventTypeCounts: {
      chat_send: number;
      audio_play: number;
      bookmark_add: number;
      bookmark_remove: number;
    };
  };
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "認証エラー" };
    }

    // 指定期間のログを取得
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: logs, error: logsError } = await (supabase as any)
      .from("study_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true });

    if (logsError) {
      console.error("Failed to fetch study logs:", logsError);
      return { success: false, error: "ログの取得に失敗しました" };
    }

    if (!logs || logs.length === 0) {
      return {
        success: true,
        data: {
          totalChatCount: 0,
          totalAudioPlayCount: 0,
          totalBookmarkCount: 0,
          dailyStats: [],
          eventTypeCounts: {
            chat_send: 0,
            audio_play: 0,
            bookmark_add: 0,
            bookmark_remove: 0,
          },
        },
      };
    }

    // イベントタイプ別の集計
    const eventTypeCounts = logs.reduce(
      (acc: Record<EventType, number>, log: any) => {
        acc[log.event_type as EventType] =
          (acc[log.event_type as EventType] || 0) + 1;
        return acc;
      },
      {
        chat_send: 0,
        audio_play: 0,
        bookmark_add: 0,
        bookmark_remove: 0,
      } as Record<EventType, number>
    );

    // 日別の集計
    const dailyStatsMap = new Map<
      string,
      { chatCount: number; audioPlayCount: number; bookmarkCount: number }
    >();

    logs.forEach((log: any) => {
      const date = new Date(log.created_at).toISOString().split("T")[0];
      const stats = dailyStatsMap.get(date) || {
        chatCount: 0,
        audioPlayCount: 0,
        bookmarkCount: 0,
      };

      if (log.event_type === "chat_send") {
        stats.chatCount++;
      } else if (log.event_type === "audio_play") {
        stats.audioPlayCount++;
      } else if (log.event_type === "bookmark_add") {
        stats.bookmarkCount++;
      }

      dailyStatsMap.set(date, stats);
    });

    const dailyStats = Array.from(dailyStatsMap.entries())
      .map(([date, stats]) => ({
        date,
        chatCount: stats.chatCount,
        audioPlayCount: stats.audioPlayCount,
        bookmarkCount: stats.bookmarkCount,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      success: true,
      data: {
        totalChatCount: eventTypeCounts.chat_send,
        totalAudioPlayCount: eventTypeCounts.audio_play,
        totalBookmarkCount:
          eventTypeCounts.bookmark_add - eventTypeCounts.bookmark_remove,
        dailyStats,
        eventTypeCounts,
      },
    };
  } catch (error) {
    console.error("getStudyStatistics error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "不明なエラー",
    };
  }
}
