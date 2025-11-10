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
    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        user_id: data.user.id,
        display_name: displayName || null,
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: "user_id" }
    );

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

export type ResetPasswordResult =
  | { success: true; message: string }
  | { success: false; error: string };

/**
 * パスワードリセットServer Action
 * メールアドレスにパスワードリセットメールを送信
 *
 * SupabaseのresetPasswordForEmailを使用してパスワードリセットメールを送信します。
 * メール内のリンクをクリックすると、redirectToで指定したURLにリダイレクトされます。
 *
 * 注意: redirectToのURLはSupabaseのダッシュボードで設定された
 * 「Site URL」または「Redirect URLs」に含まれている必要があります。
 */
export async function resetPassword(
  email: string
): Promise<ResetPasswordResult> {
  try {
    // バリデーション
    if (!email || !email.includes("@")) {
      return {
        success: false,
        error: "有効なメールアドレスを入力してください",
      };
    }

    // サーバー側のSupabaseクライアントを取得
    const supabase = await createClient();

    // リダイレクトURLを設定
    // 本番環境では環境変数から取得、開発環境ではlocalhost:3001を使用
    // 注意: このURLはSupabaseのダッシュボードで設定された許可されたリダイレクトURLと一致している必要があります
    const redirectTo =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.NEXT_PUBLIC_VERCEL_URL
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
        : "http://localhost:3001");

    // パスワードリセットメールを送信
    // SupabaseのresetPasswordForEmailを使用
    // redirectToは/auth/reset-passwordに設定
    // メールリンクにはハッシュフラグメント（#access_token=...&type=recovery）が含まれるため、
    // /auth/reset-passwordページでクライアント側で処理する
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${redirectTo}/auth/reset-password`,
    });

    if (error) {
      console.error("Password reset email error:", error);
      return { success: false, error: error.message };
    }

    // セキュリティ上の理由で、メールアドレスが存在するかどうかに関わらず
    // 成功メッセージを返す（メールアドレスの存在を推測させないため）
    return {
      success: true,
      message:
        "パスワードリセット用のメールを送信しました。メールボックスを確認してください。",
    };
  } catch (error) {
    console.error("Reset password error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "予期しないエラーが発生しました",
    };
  }
}

/**
 * ログアウトServer Action
 */
export async function logout() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      return { success: false, error: error.message };
    }

    // 成功時はページを再検証
    revalidatePath("/", "layout");
    redirect("/auth/login");
  } catch (error) {
    console.error("Logout error:", error);
    redirect("/auth/login");
  }
}

export type UpdatePasswordResult =
  | { success: true; message: string }
  | { success: false; error: string };

/**
 * パスワード更新Server Action
 * パスワードリセットメールのリンクから遷移したユーザーが新しいパスワードを設定する
 */
export async function updatePassword(
  password: string
): Promise<UpdatePasswordResult> {
  try {
    // バリデーション
    if (!password || password.length < 6) {
      return {
        success: false,
        error: "パスワードは6文字以上で入力してください",
      };
    }

    // サーバー側のSupabaseクライアントを取得
    const supabase = await createClient();

    // 現在のユーザーを取得（パスワードリセットトークンで認証されている必要がある）
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        error:
          "認証セッションが無効です。パスワードリセットメールのリンクから再度アクセスしてください。",
      };
    }

    // パスワードを更新
    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      console.error("Update password error:", error);
      return { success: false, error: error.message };
    }

    // 成功時はページを再検証
    revalidatePath("/", "layout");

    return {
      success: true,
      message: "パスワードが正常に更新されました。",
    };
  } catch (error) {
    console.error("Update password error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "予期しないエラーが発生しました",
    };
  }
}
