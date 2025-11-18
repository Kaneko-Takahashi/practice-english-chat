"use client";

import { AudioButton } from "./AudioButton";
import { BookmarkButton } from "./BookmarkButton";
import { splitEnglishAndJapanese } from "@/lib/messages";

interface MessageBubbleProps {
  id: string;
  role: "user" | "assistant";
  content: string;
  isBookmarked?: boolean;
  displayName?: string | null;
}

export function MessageBubble({
  id,
  role,
  content,
  isBookmarked = false,
  displayName,
}: MessageBubbleProps) {
  const isUser = role === "user";
  const { english, japanese } = splitEnglishAndJapanese(content);

  return (
    <div
      className={`flex flex-col ${
        isUser ? "items-end" : "items-start"
      } animate-in fade-in slide-in-from-bottom-2 duration-300`}
    >
      {/* ユーザーメッセージの場合、表示名を表示 */}
      {isUser && displayName && (
        <span className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-400">
          {displayName}
        </span>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/50"
            : "bg-white text-slate-900 shadow-md dark:bg-slate-800 dark:text-slate-100"
        }`}
      >
        {!isUser ? (
          <>
            {/* 英語と日本語を分離して表示 */}
            <>
              <p className="whitespace-pre-wrap break-words text-lg font-medium text-slate-900 dark:text-slate-100">
                {english}
              </p>
              {japanese && (
                <p className="mt-2 whitespace-pre-wrap break-words text-base text-slate-600 dark:text-slate-400">
                  {japanese}
                </p>
              )}
            </>
            <div className="mt-2 flex items-center gap-2">
              {/* 音声ボタンは英語のみを使用 */}
              <AudioButton text={english} messageId={id} />
              <BookmarkButton
                messageId={id}
                initialIsBookmarked={isBookmarked}
              />
            </div>
          </>
        ) : (
          <p className="whitespace-pre-wrap break-words">{content}</p>
        )}
      </div>
    </div>
  );
}
