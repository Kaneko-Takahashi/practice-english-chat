"use client";

import { SidebarNavContainer } from "../Sidebar/SidebarNavContainer";

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  return (
    // overflow-x-visibleを追加してサイドバーの折りたたみボタンが切れないようにする
    <div className="flex h-screen overflow-x-visible overflow-y-hidden">
      <SidebarNavContainer />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
