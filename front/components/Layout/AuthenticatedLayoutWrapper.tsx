"use client";

import { usePathname } from "next/navigation";
import { SidebarNavContainer } from "../Sidebar/SidebarNavContainer";

interface AuthenticatedLayoutWrapperProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
}

export function AuthenticatedLayoutWrapper({
  children,
  isAuthenticated,
}: AuthenticatedLayoutWrapperProps) {
  const pathname = usePathname();

  // 認証ページではサイドバーを表示しない
  const isAuthPage = pathname?.startsWith("/auth");

  // 認証済みで、かつ認証ページでない場合のみサイドバーを表示
  if (isAuthenticated && !isAuthPage) {
    return (
      // overflow-x-visibleを追加してサイドバーの折りたたみボタンが切れないようにする
      <div className="relative flex h-screen overflow-x-visible overflow-y-hidden">
        <div className="relative overflow-visible">
          <SidebarNavContainer />
        </div>
        <main className="relative flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    );
  }

  // 認証ページや未認証の場合はサイドバーなしで表示
  return <>{children}</>;
}
