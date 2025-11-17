"use client";

import { useState, FormEvent, useEffect } from "react";
import {
  changePassword,
  type ChangePasswordResult,
  resetPassword,
  type ResetPasswordResult,
} from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ProfilePage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [result, setResult] = useState<ChangePasswordResult | null>(null);
  const [resetResult, setResetResult] = useState<ResetPasswordResult | null>(
    null
  );
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    // 認証状態を確認
    const checkAuth = async () => {
      const supabase = createClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        setIsAuthenticated(false);
        router.push("/auth/login");
      } else {
        setIsAuthenticated(true);
        setUserEmail(user.email || null);
      }
    };

    checkAuth();
  }, [router]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    // バリデーション
    if (!currentPassword) {
      setResult({
        success: false,
        error: "現在のパスワードを入力してください",
      });
      setIsLoading(false);
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setResult({
        success: false,
        error: "新しいパスワードは6文字以上で入力してください",
      });
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setResult({
        success: false,
        error: "新しいパスワードが一致しません",
      });
      setIsLoading(false);
      return;
    }

    if (currentPassword === newPassword) {
      setResult({
        success: false,
        error:
          "新しいパスワードは現在のパスワードと異なるものを入力してください",
      });
      setIsLoading(false);
      return;
    }

    try {
      const result = await changePassword(currentPassword, newPassword);
      setResult(result);

      if (result.success) {
        // 成功時はフォームをクリア
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
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

  const handleResetPassword = async () => {
    if (!userEmail) {
      setResetResult({
        success: false,
        error: "メールアドレスが見つかりません",
      });
      return;
    }

    setIsResetLoading(true);
    setResetResult(null);

    try {
      const result = await resetPassword(userEmail);
      setResetResult(result);
    } catch (error) {
      setResetResult({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "予期しないエラーが発生しました",
      });
    } finally {
      setIsResetLoading(false);
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex gap-1">
          <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400"></div>
          <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0.2s]"></div>
          <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0.4s]"></div>
        </div>
      </div>
    );
  }

  if (isAuthenticated === false) {
    return null; // リダイレクト中
  }

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
          マイページ
        </p>
      </div>

      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white/80 p-8 shadow-2xl backdrop-blur-sm dark:bg-slate-800/80 dark:shadow-slate-900/50">
        {/* ユーザー情報表示 */}
        <div className="mb-8 rounded-xl bg-slate-50 p-4 dark:bg-slate-900/50">
          <h2 className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
            アカウント情報
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            <span className="font-medium">メールアドレス:</span> {userEmail}
          </p>
        </div>

        {/* パスワードリセットメール送信セクション */}
        <div className="mb-8 rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-900/50">
          <h2 className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
            パスワードリセットメール送信
          </h2>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
            パスワードを忘れた場合は、登録済みのメールアドレスにリセットメールを送信できます。
          </p>
          <div className="mb-4 rounded-lg bg-white p-3 dark:bg-slate-800">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              送信先メールアドレス
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {userEmail}
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetPassword}
            disabled={isResetLoading || !userEmail}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 px-6 py-3 font-semibold text-white shadow-lg shadow-indigo-500/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 dark:from-indigo-500 dark:via-purple-500 dark:to-indigo-500"
          >
            {isResetLoading ? "送信中..." : "パスワードリセットメールを送信"}
          </button>
          {resetResult && (
            <div
              className={`mt-4 rounded-xl p-4 ${
                resetResult.success
                  ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                  : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400"
              }`}
            >
              <div className="flex items-start gap-2">
                {resetResult.success ? (
                  <svg
                    className="h-5 w-5 flex-shrink-0"
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
                    className="h-5 w-5 flex-shrink-0"
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
                <div className="flex-1">
                  {resetResult.success ? (
                    <p className="text-sm font-medium">{resetResult.message}</p>
                  ) : (
                    <p className="text-sm font-medium">{resetResult.error}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* パスワード変更フォーム */}
        <div className="mb-6">
          <h2 className="mb-4 text-2xl font-bold text-slate-800 dark:text-slate-100">
            パスワード変更
          </h2>
          <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
            セキュリティのため、現在のパスワードを入力してください
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 現在のパスワード */}
            <div>
              <label
                htmlFor="currentPassword"
                className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                現在のパスワード
                <span className="ml-1 text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-slate-900 transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20"
                  placeholder="現在のパスワードを入力"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  aria-label={
                    showCurrentPassword
                      ? "パスワードを隠す"
                      : "パスワードを表示"
                  }
                >
                  {showCurrentPassword ? (
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

            {/* 新しいパスワード */}
            <div>
              <label
                htmlFor="newPassword"
                className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                新しいパスワード
                <span className="ml-1 text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-slate-900 transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20"
                  placeholder="新しいパスワードを入力（6文字以上）"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  aria-label={
                    showNewPassword ? "パスワードを隠す" : "パスワードを表示"
                  }
                >
                  {showNewPassword ? (
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

            {/* 新しいパスワード確認 */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                新しいパスワード（確認）
                <span className="ml-1 text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-slate-900 transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20"
                  placeholder="新しいパスワードを再入力"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  aria-label={
                    showConfirmPassword
                      ? "パスワードを隠す"
                      : "パスワードを表示"
                  }
                >
                  {showConfirmPassword ? (
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

            {/* 結果メッセージ */}
            {result && (
              <div
                className={`rounded-xl p-4 ${
                  result.success
                    ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                    : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    {result.success ? (
                      <p className="font-medium">{result.message}</p>
                    ) : (
                      <p className="font-medium">{result.error}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 送信ボタン */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 px-6 py-3 font-semibold text-white shadow-lg shadow-indigo-500/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 dark:from-indigo-500 dark:via-purple-500 dark:to-indigo-500"
            >
              {isLoading ? "変更中..." : "パスワードを変更"}
            </button>
          </form>
        </div>

        {/* ナビゲーションリンク */}
        <div className="mt-6 flex flex-col gap-3 text-center">
          <Link
            href="/"
            className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            ホームに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
