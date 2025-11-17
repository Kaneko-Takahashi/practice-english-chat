"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

interface NavigationLinkItemProps {
  href: string;
  icon: ReactNode;
  label: string;
  disabled?: boolean;
  isCollapsed?: boolean;
}

export function NavigationLinkItem({
  href,
  icon,
  label,
  disabled = false,
  isCollapsed = false,
}: NavigationLinkItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  if (disabled) {
    return (
      <div
        className={`flex items-center gap-3 rounded-lg px-4 py-3 text-slate-400 opacity-50 cursor-not-allowed ${
          isCollapsed ? "justify-center" : ""
        }`}
        title={isCollapsed ? label : undefined}
      >
        {icon}
        {!isCollapsed && (
          <>
            <span className="text-sm font-medium">{label}</span>
            <span className="ml-auto text-xs text-slate-400">準備中</span>
          </>
        )}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
        isActive
          ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md"
          : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
      } ${isCollapsed ? "justify-center" : ""}`}
      title={isCollapsed ? label : undefined}
    >
      {icon}
      {!isCollapsed && <span>{label}</span>}
    </Link>
  );
}

