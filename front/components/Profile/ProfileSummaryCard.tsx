"use client";

import type { Profile } from "@/types/supabase";

interface ProfileSummaryCardProps {
  profile: Profile | null;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function ProfileSummaryCard({
  profile,
  isLoading = false,
  error = null,
  onRetry,
}: ProfileSummaryCardProps) {
  const formattedJoinedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const shortUserId = profile?.user_id
    ? `${profile.user_id.slice(0, 8)}…${profile.user_id.slice(-4)}`
    : null;

  const displayName = profile?.display_name?.trim() || "表示名未設定";
  const avatarInitial =
    profile?.display_name?.trim().charAt(0)?.toUpperCase() ?? "U";

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-lg shadow-indigo-200/40 backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-800/80 dark:shadow-slate-900/40">
        <div className="flex animate-pulse items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="flex-1 space-y-3">
            <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-3 w-1/2 rounded bg-slate-100 dark:bg-slate-600" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-lg shadow-indigo-200/40 backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-800/80 dark:shadow-slate-900/40">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">
              プロフィールを読み込めませんでした
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {error}
            </p>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10"
            >
              再取得
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-lg shadow-indigo-200/40 backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-800/80 dark:shadow-slate-900/40">
        <div className="text-sm text-slate-600 dark:text-slate-400">
          プロフィール情報が見つかりませんでした。
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-lg shadow-indigo-200/40 backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-800/80 dark:shadow-slate-900/40">
      {/* PC画面では2カラム構成（flex justify-between）、スマホでは縦並び（flex-col） */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* 左側：アイコン＋テキスト情報 */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100 dark:border-slate-600 dark:bg-slate-700">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={`${displayName}のアバター`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xl font-semibold text-slate-600 dark:text-slate-200">
                {avatarInitial}
              </span>
            )}
          </div>
          {/* テキストブロック：改行を防ぐためmin-w-0とflex-1を設定 */}
          <div className="min-w-0 flex-1">
            {/* ラベル：改行を防ぐ */}
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 whitespace-nowrap">
              あなたのプロフィール
            </p>
            {/* 表示名 */}
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
              {displayName}
            </p>
            {/* ID：長い場合は省略表示 */}
            {shortUserId && (
              <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                ID: {shortUserId}
              </p>
            )}
          </div>
        </div>
        {/* 右側：学習開始日のバッジ（PCでは右寄せ、スマホでは左寄せ） */}
        <div className="flex flex-col items-start gap-2 text-sm text-slate-500 dark:text-slate-400 lg:items-end lg:flex-shrink-0">
          {formattedJoinedDate && (
            <div className="rounded-xl bg-indigo-50/80 px-4 py-2 font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200 whitespace-nowrap">
              学習開始 {formattedJoinedDate}
            </div>
          )}
          <p className="text-xs whitespace-nowrap">
            Supabaseのprofilesテーブルから取得しています
          </p>
        </div>
      </div>
    </div>
  );
}
