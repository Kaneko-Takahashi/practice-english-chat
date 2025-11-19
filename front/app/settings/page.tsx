"use client";

import { useState, FormEvent, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getSettings,
  updateSettings,
  type UserSettings,
} from "@/app/actions/settings";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({
    learning_level: "standard",
    tts_enabled: true,
    tts_speed: "normal",
    tts_voice: null,
    theme: "light",
    font_size: "medium",
    allow_usage_analysis: false,
  });
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
  } | null>(null);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      // まずlocalStorageから値を取得（優先）
      let savedTheme: string | null = null;
      let savedFontSize: string | null = null;
      if (typeof window !== "undefined") {
        savedTheme = localStorage.getItem("theme");
        savedFontSize = localStorage.getItem("font_size");
        console.log("Settings page - localStorage values:", {
          savedTheme,
          savedFontSize,
        });
      }

      const result = await getSettings();
      console.log("Settings page - DB values:", result);

      if (result.success) {
        // localStorageの値がある場合は優先
        const mergedSettings = {
          ...result.settings,
          theme: (savedTheme || result.settings.theme) as UserSettings["theme"],
          font_size: (savedFontSize ||
            result.settings.font_size) as UserSettings["font_size"],
        };
        console.log("Settings page - Merged settings:", mergedSettings);
        setSettings(mergedSettings);
      } else {
        setResult({ success: false, error: result.error });
      }
    } catch (error) {
      console.error("Fetch settings error:", error);
      setResult({
        success: false,
        error:
          error instanceof Error ? error.message : "設定の取得に失敗しました",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

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
        await fetchSettings();
      }
    };

    checkAuth();
  }, [router, fetchSettings]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    setResult(null);

    console.log("Settings - Submitting settings:", settings);

    try {
      const result = await updateSettings(settings);
      console.log("Settings - Update result:", result);
      if (result.success) {
        setResult({ success: true, message: result.message });

        // テーマを即座に反映（確実に適用するため、複数回実行）
        const applyTheme = () => {
          const htmlElement = document.documentElement;
          console.log("Applying theme:", settings.theme);
          console.log("Current classes:", htmlElement.className);

          if (settings.theme === "dark") {
            // 確実にdarkクラスを追加
            htmlElement.classList.remove("light");
            htmlElement.classList.add("dark");
            // htmlタグのclass属性を直接確認
            if (!htmlElement.classList.contains("dark")) {
              htmlElement.className =
                htmlElement.className.replace(/\bdark\b/g, "").trim() + " dark";
            }
            console.log(
              "Dark class added:",
              htmlElement.classList.contains("dark")
            );
            console.log("Final classes:", htmlElement.className);
          } else {
            htmlElement.classList.remove("dark");
            htmlElement.classList.add("light");
            console.log("Light theme applied");
          }
        };

        // 即座に適用
        applyTheme();
        // 少し遅延させて再度適用（確実性のため）
        setTimeout(applyTheme, 50);
        setTimeout(applyTheme, 100);
        setTimeout(applyTheme, 200);
        setTimeout(applyTheme, 500);

        // フォントサイズを即座に反映（確実に適用するため）
        const applyFontSize = () => {
          document.documentElement.className =
            document.documentElement.className
              .replace(/font-size-\w+/g, "")
              .trim();
          document.documentElement.classList.add(
            `font-size-${settings.font_size}`
          );
        };

        applyFontSize();
        setTimeout(applyFontSize, 100);

        // ローカルストレージにも保存して、ページリロード時にも適用されるようにする
        if (typeof window !== "undefined") {
          localStorage.setItem("theme", settings.theme);
          localStorage.setItem("font_size", settings.font_size);

          // カスタムイベントを発火して、他のコンポーネント（AudioButtonなど）に通知
          window.dispatchEvent(new CustomEvent("settingsChanged"));
          console.log("Settings saved - dispatched settingsChanged event");
        }

        // 設定を再取得せずに、現在の設定を維持
        // （保存後の状態は既にローカルで反映されているため）
        console.log(
          "Settings saved successfully. Current theme:",
          settings.theme
        );

        // 3秒後にメッセージを消す
        setTimeout(() => {
          setResult(null);
        }, 3000);
      } else {
        setResult({ success: false, error: result.error });
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
      setIsSaving(false);
    }
  };

  // テーマ変更時に即座に反映（設定読み込み後のみ）
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const htmlElement = document.documentElement;
      if (settings.theme === "dark") {
        htmlElement.classList.remove("light");
        htmlElement.classList.add("dark");
        // 確実に適用
        if (!htmlElement.classList.contains("dark")) {
          htmlElement.className =
            htmlElement.className.replace(/\bdark\b/g, "").trim() + " dark";
        }
      } else {
        htmlElement.classList.remove("dark");
        htmlElement.classList.add("light");
      }
      // ローカルストレージにも保存
      if (typeof window !== "undefined") {
        localStorage.setItem("theme", settings.theme);
      }
    }
  }, [settings.theme, isLoading, isAuthenticated]);

  // フォントサイズ変更時に即座に反映（設定読み込み後のみ）
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      document.documentElement.className = document.documentElement.className
        .replace(/font-size-\w+/g, "")
        .trim();
      document.documentElement.classList.add(`font-size-${settings.font_size}`);
    }
  }, [settings.font_size, isLoading, isAuthenticated]);

  if (isAuthenticated === null || isLoading) {
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
          設定
        </p>
      </div>

      <div className="relative z-10 w-full max-w-2xl space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 学習レベル */}
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-2xl backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/80">
            <h2 className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
              学習レベル
            </h2>
            <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
              英語の難易度を選択できます。今のレベルに近いものを選んでください。
            </p>
            <div className="space-y-2">
              {[
                { value: "beginner", label: "やさしい" },
                { value: "standard", label: "ふつう" },
                { value: "advanced", label: "チャレンジ" },
              ].map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50"
                >
                  <input
                    type="radio"
                    name="learning_level"
                    value={option.value}
                    checked={settings.learning_level === option.value}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        learning_level: e.target
                          .value as UserSettings["learning_level"],
                      })
                    }
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 dark:text-indigo-400"
                  />
                  <span className="text-slate-700 dark:text-slate-300">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 音声設定 */}
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-2xl backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/80">
            <h2 className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
              音声設定
            </h2>
            <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
              チャットの読み上げの有無やスピード、声の種類を変更できます。
            </p>
            <div className="space-y-4">
              {/* 読み上げON/OFF */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  読み上げを有効にする
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setSettings({
                      ...settings,
                      tts_enabled: !settings.tts_enabled,
                    })
                  }
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    settings.tts_enabled
                      ? "bg-indigo-600 dark:bg-indigo-500"
                      : "bg-slate-300 dark:bg-slate-600"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                      settings.tts_enabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* 読み上げ速度 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  読み上げ速度
                </label>
                <select
                  value={settings.tts_speed}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      tts_speed: e.target.value as UserSettings["tts_speed"],
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20"
                >
                  <option value="slow">ゆっくり</option>
                  <option value="normal">ふつう</option>
                  <option value="fast">はやい</option>
                </select>
              </div>

              {/* 声の種類 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  声のタイプ
                </label>
                <select
                  value={settings.tts_voice || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      tts_voice: e.target.value || null,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20"
                >
                  <option value="">デフォルト</option>
                  <option value="female_1">女性1</option>
                  <option value="male_1">男性1</option>
                </select>
              </div>
            </div>
          </div>

          {/* テーマ */}
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-2xl backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/80">
            <h2 className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
              テーマ
            </h2>
            <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
              画面の明るさや文字サイズを変更できます。
            </p>
            <div className="space-y-4">
              {/* カラーテーマ */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  カラーテーマ
                </label>
                <div className="space-y-2">
                  {[
                    { value: "light", label: "ライト" },
                    { value: "dark", label: "ダーク" },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50"
                    >
                      <input
                        type="radio"
                        name="theme"
                        value={option.value}
                        checked={settings.theme === option.value}
                        onChange={(e) => {
                          const newTheme = e.target
                            .value as UserSettings["theme"];
                          setSettings({
                            ...settings,
                            theme: newTheme,
                          });
                          // 即座にテーマを適用
                          const htmlElement = document.documentElement;
                          if (newTheme === "dark") {
                            htmlElement.classList.remove("light");
                            htmlElement.classList.add("dark");
                            // 確実に適用
                            if (!htmlElement.classList.contains("dark")) {
                              htmlElement.className =
                                htmlElement.className
                                  .replace(/\bdark\b/g, "")
                                  .trim() + " dark";
                            }
                          } else {
                            htmlElement.classList.remove("dark");
                            htmlElement.classList.add("light");
                          }
                          // ローカルストレージにも保存
                          if (typeof window !== "undefined") {
                            localStorage.setItem("theme", newTheme);
                          }
                        }}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 dark:text-indigo-400"
                      />
                      <span className="text-slate-700 dark:text-slate-300">
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* フォントサイズ */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  フォントサイズ
                </label>
                <select
                  value={settings.font_size}
                  onChange={(e) => {
                    const newFontSize = e.target
                      .value as UserSettings["font_size"];
                    setSettings({
                      ...settings,
                      font_size: newFontSize,
                    });
                    // 即座にフォントサイズを適用
                    document.documentElement.className =
                      document.documentElement.className
                        .replace(/font-size-\w+/g, "")
                        .trim();
                    document.documentElement.classList.add(
                      `font-size-${newFontSize}`
                    );
                    // ローカルストレージにも保存
                    if (typeof window !== "undefined") {
                      localStorage.setItem("font_size", newFontSize);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20"
                >
                  <option value="small">小さめ</option>
                  <option value="medium">ふつう</option>
                  <option value="large">大きめ</option>
                </select>
              </div>
            </div>
          </div>

          {/* 学習履歴の記録 */}
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-2xl backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/80">
            <h2 className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
              学習履歴を記録して、あなたの進捗をグラフで確認できます。
            </h2>
            <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
              学習活動を記録すると、「学習履歴可視化」ページで日別の推移や活動内訳をグラフで確認できます。
            </p>
            <div className="space-y-3">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={settings.allow_usage_analysis}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      allow_usage_analysis: e.target.checked,
                    })
                  }
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:text-indigo-400"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  学習活動を記録する（チャット・音声再生・ブックマーク）
                </span>
              </label>
              <p className="ml-7 text-xs text-slate-500 dark:text-slate-500">
                ※記録されたデータは、学習履歴ページでグラフとして表示されます。
              </p>
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
                {result.success ? (
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
                  <p className="text-sm font-medium">
                    {result.success ? result.message : result.error}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 保存ボタン */}
          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 px-6 py-3 font-semibold text-white shadow-lg shadow-indigo-500/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 dark:from-indigo-500 dark:via-purple-500 dark:to-indigo-500"
          >
            {isSaving ? "保存中..." : "設定を保存"}
          </button>
        </form>

        {/* ホームへ戻る */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
          >
            ← ホームに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
