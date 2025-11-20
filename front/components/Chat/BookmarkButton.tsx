"use client";

import { useState, useEffect } from "react";
import { toggleBookmark } from "@/app/actions/bookmarks";
import { logStudyEvent } from "@/app/actions/analytics";

interface BookmarkButtonProps {
  messageId: string;
  initialIsBookmarked?: boolean;
}

// UUID形式かどうかをチェックする関数
function isValidUUID(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export function BookmarkButton({
  messageId,
  initialIsBookmarked = false,
}: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked);
  const [isLoading, setIsLoading] = useState(false);

  // ストリーミング中のメッセージ（一時的なID）の場合はブックマークを無効化
  const isValidMessageId = isValidUUID(messageId);

  // デバッグ用: メッセージIDを確認
  useEffect(() => {
    if (messageId) {
      console.log(
        "BookmarkButton - messageId:",
        messageId,
        "isValid:",
        isValidMessageId
      );
    }
  }, [messageId, isValidMessageId]);

  const handleToggle = async () => {
    if (isLoading || !isValidMessageId) {
      console.log("BookmarkButton - Toggle blocked:", {
        isLoading,
        isValidMessageId,
        messageId,
      });
      return;
    }

    console.log("BookmarkButton - Toggling bookmark for:", messageId);
    setIsLoading(true);

    try {
      const result = await toggleBookmark(messageId);
      console.log("BookmarkButton - Result:", result);

      if (result.success) {
        setIsBookmarked(result.isBookmarked);

        // 学習ログを記録（プライバシー設定で許可されている場合のみ）
        const eventType = result.isBookmarked
          ? "bookmark_add"
          : "bookmark_remove";
        logStudyEvent(eventType, {
          message_id: messageId,
        }).catch((error) => {
          console.error("Failed to log bookmark event:", error);
        });
      } else {
        console.error("BookmarkButton - Error:", result.error);
        alert(`エラー: ${result.error}`);
      }
    } catch (error) {
      console.error("BookmarkButton - Exception:", error);
      alert(
        `予期しないエラーが発生しました: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 無効なUUIDの場合はボタンを無効化（非表示ではなく）
  const isDisabled = isLoading || !isValidMessageId;

  return (
    <button
      onClick={handleToggle}
      disabled={isDisabled}
      className={`rounded p-1.5 transition-colors ${
        isBookmarked
          ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300"
          : isValidMessageId
          ? "text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          : "text-slate-300 dark:text-slate-600"
      } ${
        isDisabled && !isValidMessageId
          ? "opacity-30 cursor-not-allowed"
          : isDisabled
          ? "opacity-50 cursor-not-allowed"
          : ""
      }`}
      title={
        !isValidMessageId
          ? "メッセージが保存されるまで待ってください"
          : isBookmarked
          ? "ブックマーク解除"
          : "ブックマーク登録"
      }
      aria-label={
        !isValidMessageId
          ? "メッセージが保存されるまで待ってください"
          : isBookmarked
          ? "ブックマーク解除"
          : "ブックマーク登録"
      }
    >
      <svg
        className="h-5 w-5"
        fill={isBookmarked ? "currentColor" : "none"}
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
    </button>
  );
}
