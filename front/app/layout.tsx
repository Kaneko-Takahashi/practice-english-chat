import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { AuthenticatedLayoutWrapper } from "@/components/Layout/AuthenticatedLayoutWrapper";
import { ThemeProvider } from "@/components/Settings/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lingo Leap - 英語チャット練習アプリ",
  description: "AIとの対話を通じて英語を学習できるアプリケーション",
  icons: {
    icon: [
      { url: "/favicon-16x16.png?v=20251216_2", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png?v=20251216_2", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico?v=20251216_2", type: "image/x-icon" },
    ],
    shortcut: "/favicon.ico?v=20251216_2",
    apple: [
      { url: "/apple-touch-icon.png?v=20251216_2", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 認証状態をチェック
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider />
        <AuthenticatedLayoutWrapper isAuthenticated={!!user}>
          {children}
        </AuthenticatedLayoutWrapper>
      </body>
    </html>
  );
}
