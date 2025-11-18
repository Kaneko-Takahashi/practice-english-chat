"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getStudyStatistics } from "@/app/actions/analytics";
import { getSettings } from "@/app/actions/settings";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type StudyStatistics = {
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

export default function HistoryPage() {
  const [statistics, setStatistics] = useState<StudyStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<7 | 30 | 90>(30);
  const [recordingEnabled, setRecordingEnabled] = useState(true);

  // ユーザーの記録設定を確認
  useEffect(() => {
    const checkSettings = async () => {
      try {
        const result = await getSettings();
        if (result.success) {
          setRecordingEnabled(result.settings.allow_usage_analysis);
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      }
    };
    checkSettings();
  }, []);

  useEffect(() => {
    const fetchStatistics = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getStudyStatistics(period);

        if (result.success && result.data) {
          setStatistics(result.data);
        } else {
          setError(result.error || "統計データの取得に失敗しました");
        }
      } catch (err) {
        console.error("Failed to fetch statistics:", err);
        setError(
          err instanceof Error ? err.message : "予期しないエラーが発生しました"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatistics();
  }, [period]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            データを読み込み中...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="rounded-2xl bg-white p-8 shadow-lg dark:bg-slate-800">
          <div className="mb-4 text-center text-6xl">⚠️</div>
          <h2 className="mb-2 text-center text-xl font-bold text-slate-800 dark:text-slate-100">
            エラー
          </h2>
          <p className="text-center text-slate-600 dark:text-slate-400">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="rounded-2xl bg-white p-8 shadow-lg dark:bg-slate-800">
          <p className="text-center text-slate-600 dark:text-slate-400">
            データがありません
          </p>
        </div>
      </div>
    );
  }

  // グラフ用のデータを整形（日本語の日付形式）
  const chartData = statistics.dailyStats.map((stat) => ({
    date: new Date(stat.date).toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
    }),
    チャット: stat.chatCount,
    音声再生: stat.audioPlayCount,
    ブックマーク: stat.bookmarkCount,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="mx-auto max-w-7xl">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-slate-800 dark:text-slate-100">
            📊 学習履歴
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            あなたの学習の進捗を可視化します
          </p>
        </div>

        {/* 記録無効時の警告バナー */}
        {!recordingEnabled && (
          <div className="mb-6 rounded-xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/20">
            <div className="flex gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
                  現在、学習活動の記録は無効です
                </h3>
                <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                  新しいデータは記録されませんが、過去のデータは閲覧できます。
                  <Link
                    href="/settings"
                    className="ml-1 underline hover:text-yellow-900 dark:hover:text-yellow-100"
                  >
                    設定ページ
                  </Link>
                  から記録を有効にできます。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 期間選択 */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setPeriod(7)}
            className={`rounded-xl px-4 py-2 font-medium transition-all ${
              period === 7
                ? "bg-indigo-600 text-white shadow-lg"
                : "bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            7日間
          </button>
          <button
            onClick={() => setPeriod(30)}
            className={`rounded-xl px-4 py-2 font-medium transition-all ${
              period === 30
                ? "bg-indigo-600 text-white shadow-lg"
                : "bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            30日間
          </button>
          <button
            onClick={() => setPeriod(90)}
            className={`rounded-xl px-4 py-2 font-medium transition-all ${
              period === 90
                ? "bg-indigo-600 text-white shadow-lg"
                : "bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            90日間
          </button>
        </div>

        {/* サマリーカード */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-slate-800">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-3xl">💬</span>
              <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">
                チャット送信
              </h3>
            </div>
            <p className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">
              {statistics.totalChatCount}
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">
              回
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-slate-800">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-3xl">🔊</span>
              <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">
                音声再生
              </h3>
            </div>
            <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">
              {statistics.totalAudioPlayCount}
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">
              回
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-slate-800">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-3xl">⭐</span>
              <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">
                ブックマーク
              </h3>
            </div>
            <p className="text-4xl font-bold text-yellow-600 dark:text-yellow-400">
              {statistics.totalBookmarkCount}
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">
              件
            </p>
          </div>
        </div>

        {/* グラフ: 日別推移（折れ線グラフ） */}
        {chartData.length > 0 ? (
          <>
            <div className="mb-8 rounded-2xl bg-white p-6 shadow-lg dark:bg-slate-800">
              <h2 className="mb-4 text-xl font-bold text-slate-800 dark:text-slate-100">
                📈 日別推移
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    dataKey="date"
                    stroke="#64748B"
                    style={{ fontSize: "12px" }}
                  />
                  <YAxis stroke="#64748B" style={{ fontSize: "12px" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFF",
                      border: "1px solid #E2E8F0",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="チャット"
                    stroke="#6366F1"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="音声再生"
                    stroke="#A855F7"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ブックマーク"
                    stroke="#EAB308"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* グラフ: 活動内訳（棒グラフ） */}
            <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-slate-800">
              <h2 className="mb-4 text-xl font-bold text-slate-800 dark:text-slate-100">
                📊 活動内訳
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    {
                      name: "チャット送信",
                      回数: statistics.totalChatCount,
                      fill: "#6366F1",
                    },
                    {
                      name: "音声再生",
                      回数: statistics.totalAudioPlayCount,
                      fill: "#A855F7",
                    },
                    {
                      name: "ブックマーク追加",
                      回数: statistics.eventTypeCounts.bookmark_add,
                      fill: "#EAB308",
                    },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    dataKey="name"
                    stroke="#64748B"
                    style={{ fontSize: "12px" }}
                  />
                  <YAxis stroke="#64748B" style={{ fontSize: "12px" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFF",
                      border: "1px solid #E2E8F0",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="回数" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="rounded-2xl bg-white p-12 text-center shadow-lg dark:bg-slate-800">
            <div className="mb-4 text-6xl">📝</div>
            <h3 className="mb-2 text-xl font-bold text-slate-800 dark:text-slate-100">
              まだデータがありません
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              学習を始めると、ここに統計が表示されます
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
