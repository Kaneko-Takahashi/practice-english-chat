"use client";

import { useState, FormEvent } from "react";
import {
  login,
  resetPassword,
  type LoginResult,
  type ResetPasswordResult,
} from "@/app/actions/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [result, setResult] = useState<LoginResult | null>(null);
  const [resetPasswordEmail, setResetPasswordEmail] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetPasswordResult, setResetPasswordResult] =
    useState<ResetPasswordResult | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    try {
      const result = await login(email, password);
      setResult(result);

      if (result.success) {
        // 成功時はホームページにリダイレクト
        router.push("/");
        router.refresh();
      }
    } catch (error) {
      setResult({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "予期しないエラーが発生しました",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsResettingPassword(true);
    setResetPasswordResult(null);

    try {
      const result = await resetPassword(resetPasswordEmail);
      setResetPasswordResult(result);
      if (result.success) {
        // 成功時は3秒後にフォームを閉じる
        setTimeout(() => {
          setShowResetPassword(false);
          setResetPasswordEmail("");
        }, 3000);
      }
    } catch (error) {
      setResetPasswordResult({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "予期しないエラーが発生しました",
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleOAuthLogin = async (provider: "google") => {
    try {
      const supabase = createClient();
      const redirectTo =
        process.env.NEXT_PUBLIC_SITE_URL ||
        (process.env.NEXT_PUBLIC_VERCEL_URL
          ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
          : "http://localhost:3001");

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${redirectTo}/auth/callback`,
        },
      });

      if (error) {
        setResult({
          success: false,
          error: error.message || `${provider}でのログインに失敗しました`,
        });
      }
    } catch (error) {
      setResult({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "予期しないエラーが発生しました",
      });
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4 py-12 font-sans dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* 背景装飾 */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-tr from-indigo-400/20 to-pink-400/20 blur-3xl"></div>
      </div>

      <div className="relative z-10 mb-10 text-center">
        <h1
          className="mb-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400"
          suppressHydrationWarning
          translate="no"
        >
          Lingo Leap
        </h1>
        <p className="text-xl font-light text-slate-600 dark:text-slate-300">
          英語チャットの練習アプリへようこそ
        </p>
      </div>

      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white/80 p-8 shadow-2xl backdrop-blur-sm dark:bg-slate-800/80 dark:shadow-slate-900/50">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
            ログイン
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            アカウントにログインして学習を続けましょう
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300"
            >
              メールアドレス
              <span className="ml-1 text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20"
              placeholder="example@email.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300"
            >
              パスワード
              <span className="ml-1 text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-slate-900 transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20"
                placeholder="パスワードを入力"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              >
                {showPassword ? (
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
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0A9.966 9.966 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                ) : (
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
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {result && (
            <div
              className={`rounded-xl p-4 transition-all duration-300 ${
                result.success
                  ? "bg-emerald-50 text-emerald-800 shadow-sm dark:bg-emerald-900/20 dark:text-emerald-400"
                  : "bg-red-50 text-red-800 shadow-sm dark:bg-red-900/20 dark:text-red-400"
              }`}
            >
              <div className="flex items-center gap-2">
                {result.success ? (
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
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                ) : (
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
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                )}
                <p className="text-sm font-medium">
                  {result.success ? result.message : result.error}
                </p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-indigo-500/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 dark:from-indigo-500 dark:via-purple-500 dark:to-indigo-500 dark:shadow-indigo-500/30 dark:hover:shadow-indigo-500/40"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {isLoading ? (
                <>
                  <svg
                    className="h-5 w-5 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  ログイン中...
                </>
              ) : (
                <>
                  ログイン
                  <svg
                    className="h-5 w-5 transition-transform group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </>
              )}
            </span>
          </button>
        </form>

        {/* OAuth ログイン */}
        <div className="mt-6">
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-300 dark:border-slate-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white/80 px-2 text-slate-500 dark:bg-slate-800/80 dark:text-slate-400">
                または
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {/* Google ログインボタン */}
            <button
              type="button"
              onClick={() => handleOAuthLogin("google")}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 font-medium text-slate-700 transition-all duration-200 hover:bg-slate-50 hover:shadow-md dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span>Googleでログイン</span>
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-3 text-center">
          <button
            type="button"
            onClick={() => {
              setShowResetPassword(!showResetPassword);
              setResetPasswordResult(null);
              setResetPasswordEmail(email); // 入力済みのメールアドレスを設定
            }}
            className="block w-full text-sm font-medium text-slate-600 transition-colors hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
          >
            パスワードをお忘れの方はこちら
          </button>

          {showResetPassword && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
              <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                パスワードリセット
              </h3>
              <form onSubmit={handleResetPassword} className="space-y-3">
                <div>
                  <label
                    htmlFor="resetEmail"
                    className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    メールアドレス
                    <span className="ml-1 text-red-500">*</span>
                  </label>
                  <input
                    id="resetEmail"
                    type="email"
                    value={resetPasswordEmail}
                    onChange={(e) => setResetPasswordEmail(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20"
                    placeholder="example@email.com"
                  />
                </div>

                {resetPasswordResult && (
                  <div
                    className={`rounded-lg p-3 text-xs transition-all duration-300 ${
                      resetPasswordResult.success
                        ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400"
                        : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {resetPasswordResult.success ? (
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="h-4 w-4"
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
                      )}
                      <p className="font-medium">
                        {resetPasswordResult.success
                          ? resetPasswordResult.message
                          : resetPasswordResult.error}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isResettingPassword}
                    className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                  >
                    {isResettingPassword ? "送信中..." : "送信"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowResetPassword(false);
                      setResetPasswordEmail("");
                      setResetPasswordResult(null);
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    キャンセル
                  </button>
                </div>
              </form>
            </div>
          )}

          <Link
            href="/auth/signup"
            className="block text-sm font-medium text-slate-600 transition-colors hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
          >
            アカウントをお持ちでない方は新規登録
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 transition-colors hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            ホームに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
