"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type SignUpResult =
  | { success: true; message: string }
  | { success: false; error: string };

/**
 * 新規登録Server Action
 * APIキーはサーバー側でのみ使用され、クライアントに露出しません
 */
export async function signUp(
  email: string,
  password: string,
  displayName?: string
): Promise<SignUpResult> {
  try {
    // バリデーション
    if (!email || !email.includes("@")) {
      return {
        success: false,
        error: "有効なメールアドレスを入力してください",
      };
    }

    if (!password || password.length < 6) {
      return {
        success: false,
        error: "パスワードは6文字以上で入力してください",
      };
    }

    // サーバー側のSupabaseクライアントを取得
    const supabase = await createClient();

    // リダイレクトURLを設定
    // 本番環境では環境変数から取得、開発環境ではlocalhost:3001を使用
    const redirectTo =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.NEXT_PUBLIC_VERCEL_URL
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
        : "http://localhost:3001");

    // 新規登録を実行
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${redirectTo}/auth/callback`,
        data: {
          display_name: displayName || null,
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: "ユーザー登録に失敗しました" };
    }

    // プロファイルテーブルにレコードを作成（トリガーで自動作成される場合もあるが、念のため）
    const { error: profileError } = await supabase.from("profiles").upsert({
      user_id: data.user.id,
      display_name: displayName || null,
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      console.error("プロファイル作成エラー:", profileError);
      // プロファイル作成エラーは無視（トリガーで作成される可能性があるため）
    }

    // 成功時はページを再検証してリダイレクト
    revalidatePath("/", "layout");

    return {
      success: true,
      message:
        "登録が完了しました。確認メールを送信しましたので、メールを確認してください。",
    };
  } catch (error) {
    console.error("Sign up error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "予期しないエラーが発生しました",
    };
  }
}

export type LoginResult =
  | { success: true; message: string }
  | { success: false; error: string };

/**
 * ログインServer Action
 */
export async function login(
  email: string,
  password: string
): Promise<LoginResult> {
  try {
    // バリデーション
    if (!email || !email.includes("@")) {
      return {
        success: false,
        error: "有効なメールアドレスを入力してください",
      };
    }

    if (!password || password.length < 6) {
      return {
        success: false,
        error: "パスワードは6文字以上で入力してください",
      };
    }

    // サーバー側のSupabaseクライアントを取得
    const supabase = await createClient();

    // ログインを実行
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: "ログインに失敗しました" };
    }

    // 成功時はページを再検証
    revalidatePath("/", "layout");

    return {
      success: true,
      message: "ログインに成功しました",
    };
  } catch (error) {
    console.error("Login error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "予期しないエラーが発生しました",
    };
  }
}
