"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const message = searchParams.get("message");

  const getErrorMessage = () => {
    if (message) {
      return decodeURIComponent(message);
    }

    switch (error) {
      case "access_denied":
        return "アクセスが拒否されました";
      case "otp_expired":
        return "認証リンクの有効期限が切れています。新しい認証メールを送信してください。";
      case "exchange_error":
        return "認証コードの交換に失敗しました";
      default:
        return "認証エラーが発生しました";
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4 py-12 font-sans dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* 背景装飾 */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-tr from-indigo-400/20 to-pink-400/20 blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white/80 p-8 shadow-2xl backdrop-blur-sm dark:bg-slate-800/80 dark:shadow-slate-900/50">
        <div className="mb-6 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <svg
              className="h-8 w-8 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-slate-800 dark:text-slate-100">
            認証エラー
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {getErrorMessage()}
          </p>
        </div>

        <div className="space-y-4">
          {error === "otp_expired" && (
            <Link
              href="/auth/signup"
              className="block w-full rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 px-6 py-3.5 text-center font-semibold text-white shadow-lg shadow-indigo-500/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/50 dark:from-indigo-500 dark:via-purple-500 dark:to-indigo-500 dark:shadow-indigo-500/30 dark:hover:shadow-indigo-500/40"
            >
              新規登録ページに戻る
            </Link>
          )}
          <Link
            href="/"
            className="block w-full rounded-xl border-2 border-slate-200 bg-white px-6 py-3.5 text-center font-semibold text-slate-700 transition-all duration-200 hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:bg-indigo-900/20"
          >
            ホームに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
