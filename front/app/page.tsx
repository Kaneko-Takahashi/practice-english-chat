import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4 py-12 font-sans dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* 背景装飾 */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-tr from-indigo-400/20 to-pink-400/20 blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-2xl text-center">
        <h1
          className="mb-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-6xl font-extrabold tracking-tight text-transparent dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400"
          suppressHydrationWarning
          translate="no"
        >
          Lingo Leap
        </h1>
        <p className="mb-8 text-2xl font-light text-slate-600 dark:text-slate-300">
          英語チャットの練習アプリへようこそ
        </p>

        {user ? (
          <div className="mt-12 rounded-2xl bg-white/80 p-8 shadow-2xl backdrop-blur-sm dark:bg-slate-800/80 dark:shadow-slate-900/50">
            <div className="mb-6">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-2xl font-bold text-white">
                {user.email?.charAt(0).toUpperCase() || "U"}
              </div>
              <h2 className="mb-2 text-2xl font-bold text-slate-800 dark:text-slate-100">
                認証が完了しました！
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                {user.email} でログインしています
              </p>
            </div>
            <div className="space-y-4">
              <Link
                href="/chat"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-indigo-500/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/50 dark:from-indigo-500 dark:via-purple-500 dark:to-indigo-500 dark:shadow-indigo-500/30 dark:hover:shadow-indigo-500/40"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                チャットを始める
              </Link>
              <Link
                href="/bookmarks"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-6 py-3.5 font-semibold text-slate-700 transition-all duration-200 hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:bg-indigo-900/20"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
                ブックマーク一覧
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-12 rounded-2xl bg-white/80 p-8 shadow-2xl backdrop-blur-sm dark:bg-slate-800/80 dark:shadow-slate-900/50">
            <h2 className="mb-4 text-2xl font-bold text-slate-800 dark:text-slate-100">
              はじめましょう
            </h2>
            <p className="mb-8 text-slate-600 dark:text-slate-400">
              AIとのチャットを通じて、楽しく英語を学習できます
            </p>
            <div className="space-y-4">
              <Link
                href="/auth/signup"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-indigo-500/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/50 dark:from-indigo-500 dark:via-purple-500 dark:to-indigo-500 dark:shadow-indigo-500/30 dark:hover:shadow-indigo-500/40"
              >
                新規登録
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-6 py-3.5 font-semibold text-slate-700 transition-all duration-200 hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:bg-indigo-900/20"
              >
                ログイン
              </Link>
            </div>
          </div>
        )}

        <div className="mt-8 text-sm text-slate-500 dark:text-slate-400">
          <p suppressHydrationWarning translate="no">
            Lingo
            Leapは、AIとの対話を通じて英語を学習できるアプリケーションです。
          </p>
        </div>
      </div>
    </div>
  );
}
