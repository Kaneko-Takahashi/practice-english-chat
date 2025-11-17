"use client";

import { SidebarNavContainer } from "../Sidebar/SidebarNavContainer";

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNavContainer />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

