# Supabase連携セットアップガイド

## 1. パッケージのインストール

以下のコマンドでSupabase関連のパッケージをインストールしてください：

```bash
cd front
yarn install
```

または、既にインストール済みの場合は：

```bash
yarn add @supabase/supabase-js @supabase/ssr
```

## 2. Supabaseプロジェクトの作成

1. [Supabase](https://app.supabase.com/)にアクセスしてアカウントを作成（またはログイン）
2. 新しいプロジェクトを作成
3. プロジェクトの設定画面（Settings > API）から以下を取得：
   - Project URL
   - anon/public key

## 3. 環境変数の設定

`front/.env.local`ファイルを作成し、以下の内容を設定してください：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**注意**: `.env.local`ファイルは`.gitignore`に含まれているため、Gitにコミットされません。

## 4. データベーステーブルの作成

SupabaseのSQL Editorで、`Documents/DB設計書.md`に記載されているSQLを実行してください。

主なテーブル：
- `profiles` - ユーザープロファイル
- `conversations` - チャット会話
- `messages` - メッセージ
- `bookmarks` - ブックマーク
- `tts_cache` - TTS音声キャッシュ

## 5. 作成されたファイル

以下のファイルが作成されています：

- `lib/supabase/client.ts` - ブラウザ用Supabaseクライアント
- `lib/supabase/server.ts` - サーバー用Supabaseクライアント
- `lib/supabase/middleware.ts` - ミドルウェア用ヘルパー
- `lib/auth.ts` - 認証用ヘルパー関数
- `middleware.ts` - Next.jsミドルウェア（認証状態の管理）
- `types/supabase.ts` - TypeScript型定義

## 6. 使用方法

### クライアントコンポーネントでの使用

```typescript
'use client'
import { createClient } from '@/lib/supabase/client'

export default function MyComponent() {
  const supabase = createClient()
  
  // 認証状態の取得
  const { data: { user } } = await supabase.auth.getUser()
  
  // データの取得
  const { data } = await supabase
    .from('bookmarks')
    .select('*')
}
```

### サーバーコンポーネントでの使用

```typescript
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'

export default async function MyPage() {
  const { user, supabase } = await requireAuth()
  
  // 認証が必要な処理
  const { data } = await supabase
    .from('bookmarks')
    .select('*')
    .eq('user_id', user.id)
}
```

## 7. 次のステップ

1. 認証画面の実装（ログイン/サインアップ）
2. チャット画面でのメッセージ保存
3. ブックマーク機能の実装
4. RLS（Row Level Security）ポリシーの確認

## 参考リンク

- [Supabase公式ドキュメント](https://supabase.com/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase Next.js統合](https://supabase.com/docs/guides/auth/server-side/nextjs)

