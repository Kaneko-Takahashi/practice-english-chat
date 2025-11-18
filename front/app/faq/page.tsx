"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function FAQPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        setIsAuthenticated(false);
        router.push("/auth/login");
      } else {
        setIsAuthenticated(true);
      }
    };

    checkAuth();
  }, [router]);

  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex gap-1">
          <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400"></div>
          <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0.2s]"></div>
          <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0.4s]"></div>
        </div>
      </div>
    );
  }

  if (isAuthenticated === false) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4 py-12 font-sans dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="text-center">
        <h1 className="mb-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-4xl font-bold text-transparent dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400">
          FAQ・サポート
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          準備中です。しばらくお待ちください。
        </p>
      </div>
    </div>
  );
}
