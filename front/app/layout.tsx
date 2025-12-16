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
      { url: "/icon.png", sizes: "any" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
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
