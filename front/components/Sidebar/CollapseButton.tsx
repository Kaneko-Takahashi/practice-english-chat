"use client";

interface CollapseButtonProps {
  isCollapsed: boolean;
  onClick: () => void;
}

export function CollapseButton({ isCollapsed, onClick }: CollapseButtonProps) {
  return (
    <button
      onClick={onClick}
      className="absolute -right-3 top-4 flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-200 bg-white shadow-md transition-all hover:scale-110 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800"
      aria-label={isCollapsed ? "サイドバーを展開" : "サイドバーを折りたたむ"}
    >
      <svg
        className={`h-4 w-4 text-slate-600 transition-transform dark:text-slate-300 ${
          isCollapsed ? "rotate-180" : ""
        }`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 19l-7-7 7-7"
        />
      </svg>
    </button>
  );
}

