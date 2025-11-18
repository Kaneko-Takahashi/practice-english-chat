"use client";

interface DeleteBookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  content: string;
}

export function DeleteBookmarkModal({
  isOpen,
  onClose,
  onConfirm,
  content,
}: DeleteBookmarkModalProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-xl font-bold text-slate-900 dark:text-slate-100">
          ブックマークを削除しますか？
        </h3>
        <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">
          以下の内容が削除されます：
        </p>
        <div className="mb-6 rounded-lg bg-slate-50 p-3 dark:bg-slate-700">
          <p className="text-sm text-slate-800 dark:text-slate-200 line-clamp-3">
            {content}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
          >
            キャンセル
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700"
          >
            削除
          </button>
        </div>
      </div>
    </div>
  );
}
