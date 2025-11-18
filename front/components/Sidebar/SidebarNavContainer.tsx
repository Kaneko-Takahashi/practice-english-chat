"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { logout } from "@/app/actions/auth";
import { LogoSection } from "./LogoSection";
import { NavigationLinkItem } from "./NavigationLinkItem";
import { CollapseButton } from "./CollapseButton";

export function SidebarNavContainer() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // モバイル判定
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleLogout = async () => {
    if (!confirm("ログアウトしますか？")) return;
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
      setIsLoggingOut(false);
    }
  };

  const navigationItems = [
    {
      href: "/chat",
      icon: (
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
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      ),
      label: "チャット",
    },
    {
      href: "/bookmarks",
      icon: (
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
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
          />
        </svg>
      ),
      label: "ブックマーク一覧",
    },
    {
      href: "/profile",
      icon: (
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
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
      label: "マイページ",
    },
    {
      href: "/history",
      icon: (
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
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
      label: "学習履歴可視化",
    },
    {
      href: "/quiz",
      icon: (
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
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      ),
      label: "クイズ／ゲーム",
      disabled: true,
    },
    {
      href: "/settings",
      icon: (
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
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
      label: "設定",
    },
    {
      href: "/faq",
      icon: (
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
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      label: "FAQ・サポート",
      disabled: true,
    },
  ];

  // モバイル用ハンバーガーメニューボタン
  const MobileMenuButton = () => (
    <button
      onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      className="fixed left-4 top-4 z-50 rounded-lg bg-white p-2 shadow-lg dark:bg-slate-800 md:hidden"
      aria-label="メニューを開く"
    >
      <svg
        className="h-6 w-6 text-slate-700 dark:text-slate-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        {isMobileMenuOpen ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        )}
      </svg>
    </button>
  );

  // サイドバーコンテンツ
  const SidebarContent = ({ collapsed = false }: { collapsed?: boolean }) => (
    <div className="flex h-full flex-col border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      {/* ロゴセクション */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        {collapsed ? (
          <div className="flex items-center justify-center py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
              <span className="text-xl font-bold text-white">L</span>
            </div>
          </div>
        ) : (
          <LogoSection />
        )}
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
        {navigationItems.map((item) => (
          <NavigationLinkItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            disabled={item.disabled}
            isCollapsed={collapsed}
          />
        ))}
      </nav>

      {/* ユーザー情報とログアウト */}
      {user && (
        <div className="border-t border-slate-200 p-4 dark:border-slate-700">
          {!collapsed && (
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-sm font-bold text-white">
                {user.email?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-300">
                  {user.email}
                </p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
            title="ログアウト"
          >
            {isLoggingOut ? (
              <svg
                className="h-4 w-4 animate-spin"
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
            ) : (
              <>
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
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                {!collapsed && <span>ログアウト</span>}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );

  // モバイル表示
  if (isMobile) {
    return (
      <>
        <MobileMenuButton />
        {isMobileMenuOpen && (
          <>
            {/* オーバーレイ */}
            <div
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            {/* サイドバー */}
            <aside className="fixed left-0 top-0 z-40 h-full w-64 transform transition-transform md:hidden">
              <SidebarContent collapsed={false} />
            </aside>
          </>
        )}
      </>
    );
  }

  // デスクトップ表示
  return (
    <aside
      className={`relative hidden h-screen overflow-visible transition-all duration-300 md:block ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      <SidebarContent collapsed={isCollapsed} />
      {!isMobile && (
        <CollapseButton
          isCollapsed={isCollapsed}
          onClick={() => setIsCollapsed(!isCollapsed)}
        />
      )}
    </aside>
  );
}
