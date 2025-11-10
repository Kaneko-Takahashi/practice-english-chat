import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const type = requestUrl.searchParams.get("type");

  // エラーがある場合はエラーページにリダイレクト
  if (error) {
    const errorMessage = errorDescription
      ? decodeURIComponent(errorDescription)
      : "認証エラーが発生しました";
    return NextResponse.redirect(
      new URL(
        `/auth/error?error=${error}&message=${encodeURIComponent(
          errorMessage
        )}`,
        requestUrl.origin
      )
    );
  }

  // 認証コードがある場合
  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
      code
    );

    if (exchangeError) {
      return NextResponse.redirect(
        new URL(
          `/auth/error?error=exchange_error&message=${encodeURIComponent(
            exchangeError.message
          )}`,
          requestUrl.origin
        )
      );
    }

    // パスワードリセットの場合は、パスワードリセット画面にリダイレクト
    if (type === "recovery") {
      return NextResponse.redirect(
        new URL("/auth/reset-password", requestUrl.origin)
      );
    }

    // その他の認証成功時はホームページにリダイレクト
    return NextResponse.redirect(new URL("/", requestUrl.origin));
  }

  // コードもエラーもない場合はホームページにリダイレクト
  return NextResponse.redirect(new URL("/", requestUrl.origin));
}
