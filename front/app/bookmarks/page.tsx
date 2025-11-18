"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getBookmarks,
  toggleBookmark,
  type BookmarkItem,
} from "@/app/actions/bookmarks";
import { AudioButton } from "@/components/Chat/AudioButton";
import { DeleteBookmarkModal } from "@/components/Bookmarks/DeleteBookmarkModal";
import { splitEnglishAndJapanese } from "@/lib/messages";

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    bookmark: BookmarkItem | null;
  }>({ isOpen: false, bookmark: null });

  useEffect(() => {
    loadBookmarks();
  }, []);

  const loadBookmarks = async () => {
    setIsLoading(true);
    setError(null);
    const result = await getBookmarks();
    if (result.success) {
      setBookmarks(result.bookmarks);
    } else {
      setError(result.error);
    }
    setIsLoading(false);
  };

  const handleDeleteClick = (bookmark: BookmarkItem) => {
    setDeleteModal({ isOpen: true, bookmark });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.bookmark) return;

    const result = await toggleBookmark(deleteModal.bookmark.messageId);
    if (result.success) {
      // ブックマーク一覧を再読み込み
      await loadBookmarks();
    } else {
      alert(`エラー: ${result.error}`);
    }
    setDeleteModal({ isOpen: false, bookmark: null });
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, bookmark: null });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* メインコンテンツ */}
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-slate-800 dark:text-slate-100">
            ブックマーク一覧
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            保存した英語表現を確認・管理できます
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex gap-1">
              <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400"></div>
              <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0.2s]"></div>
              <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0.4s]"></div>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-red-50 p-6 text-center shadow-lg dark:bg-red-900/20">
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={loadBookmarks}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
            >
              再読み込み
            </button>
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="rounded-2xl bg-white/80 p-12 text-center shadow-lg backdrop-blur-sm dark:bg-slate-800/80">
            <svg
              className="mx-auto mb-4 h-12 w-12 text-slate-400"
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
            <p className="text-slate-600 dark:text-slate-400">
              ブックマークがありません
            </p>
            <Link
              href="/chat"
              className="mt-4 inline-block rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 px-6 py-3 font-semibold text-white shadow-lg shadow-indigo-500/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-indigo-500/50 dark:from-indigo-500 dark:via-purple-500 dark:to-indigo-500"
            >
              チャットを始める
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookmarks.map((bookmark) => {
              const { english, japanese } = splitEnglishAndJapanese(
                bookmark.content
              );
              return (
                <div
                  key={bookmark.id}
                  className="rounded-2xl bg-white/80 p-6 shadow-lg backdrop-blur-sm transition-shadow hover:shadow-xl dark:bg-slate-800/80"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="whitespace-pre-wrap break-words text-lg text-slate-900 dark:text-slate-100">
                        {english}
                      </p>
                      {japanese && (
                        <p className="mt-2 whitespace-pre-wrap break-words text-base text-slate-600 dark:text-slate-400">
                          {japanese}
                        </p>
                      )}
                      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        {new Date(bookmark.createdAt).toLocaleDateString(
                          "ja-JP",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <AudioButton
                        text={english}
                        messageId={bookmark.messageId}
                      />
                      <button
                        onClick={() => handleDeleteClick(bookmark)}
                        className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="削除"
                        aria-label="ブックマークを削除"
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
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 削除確認モーダル */}
      {deleteModal.bookmark && (
        <DeleteBookmarkModal
          isOpen={deleteModal.isOpen}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          content={deleteModal.bookmark.content}
        />
      )}
    </div>
  );
}
