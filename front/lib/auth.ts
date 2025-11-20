import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * 認証が必要なページで使用するヘルパー関数
 * 未認証の場合はログインページにリダイレクト
 */
export async function requireAuth() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return { user, supabase }
}

/**
 * 認証済みユーザー情報を取得（リダイレクトなし）
 */
export async function getAuthUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
}

