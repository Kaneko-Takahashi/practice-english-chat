"use client";

import { useEffect } from "react";
import { getSettings } from "@/app/actions/settings";

/**
 * ユーザーのテーマとフォントサイズ設定を読み込んで適用するコンポーネント
 */
export function ThemeProvider() {
  useEffect(() => {
    const applySettings = async () => {
      try {
        // まずローカルストレージから設定を読み込む（即座に適用）
        let savedTheme: string | null = null;
        let savedFontSize: string | null = null;

        if (typeof window !== "undefined") {
          savedTheme = localStorage.getItem("theme");
          savedFontSize = localStorage.getItem("font_size");

          if (savedTheme) {
            const htmlElement = document.documentElement;
            if (savedTheme === "dark") {
              htmlElement.classList.remove("light");
              htmlElement.classList.add("dark");
              // 確実に適用
              if (!htmlElement.classList.contains("dark")) {
                htmlElement.className =
                  htmlElement.className.replace(/\bdark\b/g, "").trim() +
                  " dark";
              }
            } else {
              htmlElement.classList.remove("dark");
              htmlElement.classList.add("light");
            }
          }

          if (savedFontSize) {
            document.documentElement.className =
              document.documentElement.className
                .replace(/font-size-\w+/g, "")
                .trim();
            document.documentElement.classList.add(
              `font-size-${savedFontSize}`
            );
          }
        }

        // サーバーから設定を取得して適用
        // ただし、ローカルストレージに設定がある場合はそれを優先
        const result = await getSettings();
        if (result.success) {
          // ローカルストレージの設定を優先
          const finalTheme = savedTheme || result.settings.theme;
          const finalFontSize = savedFontSize || result.settings.font_size;

          // テーマを適用
          const htmlElement = document.documentElement;
          if (finalTheme === "dark") {
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

          // フォントサイズを適用
          document.documentElement.className =
            document.documentElement.className
              .replace(/font-size-\w+/g, "")
              .trim();
          document.documentElement.classList.add(`font-size-${finalFontSize}`);

          // ローカルストレージにも保存
          if (typeof window !== "undefined") {
            localStorage.setItem("theme", finalTheme);
            localStorage.setItem("font_size", finalFontSize);
          }
        }
      } catch (error) {
        console.error("Failed to apply theme settings:", error);
        // エラー時はローカルストレージから読み込む
        if (typeof window !== "undefined") {
          const savedTheme = localStorage.getItem("theme");
          const savedFontSize = localStorage.getItem("font_size");

          if (savedTheme) {
            const htmlElement = document.documentElement;
            if (savedTheme === "dark") {
              htmlElement.classList.remove("light");
              htmlElement.classList.add("dark");
              // 確実に適用
              if (!htmlElement.classList.contains("dark")) {
                htmlElement.className =
                  htmlElement.className.replace(/\bdark\b/g, "").trim() +
                  " dark";
              }
            } else {
              htmlElement.classList.remove("dark");
              htmlElement.classList.add("light");
            }
          }

          if (savedFontSize) {
            document.documentElement.className =
              document.documentElement.className
                .replace(/font-size-\w+/g, "")
                .trim();
            document.documentElement.classList.add(
              `font-size-${savedFontSize}`
            );
          }
        }
      }
    };

    applySettings();
  }, []);

  return null;
}
