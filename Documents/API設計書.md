Lingo Leap API 設計書

## 1. 概要

本書は「Lingo Leap」のフロントエンド(Next.js)から利用する API の設計を示します。要件定義書に基づき、AI 応答生成、ブックマーク管理、認証前提、音声再生(TTS は将来/任意)の API 仕様を定義します。実装は Next.js App Router の Route Handler を前提とします。

## 2. 前提・技術スタック

- フレームワーク: Next.js (App Router) + TypeScript
- 実行環境: Vercel (Edge/Node 適材適所)
- LLM 連携: Vercel AI SDK (provider は環境変数で切替)
- 認証/DB: Supabase (Auth + Postgres, RLS 運用)
- 音声: ブラウザ Audio 再生。TTS エンドポイントは任意(将来拡張)

## 3. ベース URL

- フロント/SSR からの呼び出し: 相対パス `/api/*`
- デプロイ時の絶対 URL 例: `https://{project}.vercel.app/api/*`

## 4. 認証と権限

- 認証: Supabase Auth のセッショントークンを利用（クライアント →Route Handler で検証）
- 権限: Supabase RLS により、ユーザー毎のデータ分離を保証
- 公開/非公開:
  - `/api/chat/*`: 認証必須ではない運用も可能だが、レート制御のため認証推奨
  - `/api/bookmarks/*`: 認証必須（ユーザー固有データ）

## 5. 環境変数

- `AI_PROVIDER_API_KEY`: LLM プロバイダの API キー
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- 任意: `TTS_PROVIDER_API_KEY` (将来拡張時)

## 6. 共通仕様

- リクエスト/レスポンス: JSON (UTF-8)
- タイムスタンプ: ISO8601 (UTC)
- エラー形式:
  ```json
  { "error": { "code": "string", "message": "string", "details": any }}
  ```
- ステータスコード: 2xx 成功、4xx クライアント、5xx サーバ
- レート制御: 1 ユーザー/匿名 IP につき適切に制限（例: 60 req/min）。429 時に`Retry-After`応答

## 7. データモデル(論理)

- Message (AI 応答表示用)
  - `id: string` (生成時の一意 ID)
  - `content: string` (英語表現/例文)
  - `explanation?: string` (短い日本語解説)
  - `partOfSpeech?: string` (品詞など任意)
  - `ttsUrl?: string` (TTS 音声 URL: 任意)
  - `createdAt: string` (ISO8601)
- Bookmark（Supabase: `bookmarks` テーブル、`messages` 参照）

  - `id: string` (UUID)
  - `userId: string`
  - `messageId: string` (参照: `messages.id`)
  - `note?: string`
  - `createdAt: string`

- StudyHistory (学習履歴)
  - `id: string` (UUID)
  - `userId: string`
  - `eventType: string` (例: `chat_generated` | `audio_played` | `bookmarked` | `unbookmarked` | `opened_bookmarks` など)
  - `text?: string` (関連テキストやキーフレーズ)
  - `metadata?: object` (任意: messageId、source、level など)
  - `createdAt: string`

## 8. エンドポイント

### 8.1 AI 応答生成

#### POST `/api/chat/generate`

- 説明: ユーザー入力(学びたい内容)から、英語メッセージを 3 件生成して返す
- 認証: 任意（推奨: 認証ありで高いレート上限を付与）
- リクエスト
  ```json
  {
    "prompt": "string",           // 学びたい内容（日本語/英語）
    "level?: "beginner|intermediate|advanced", // 任意: 難易度
    "language?: "en"               // 固定想定。将来多言語化
  }
  ```
- レスポンス 200
  ```json
  {
    "messages": [
      {
        "id": "string",
        "text": "string",
        "explanation": "string",
        "partOfSpeech": "string",
        "ttsUrl": "string",
        "createdAt": "2025-01-01T00:00:00Z"
      },
      {
        "id": "string",
        "text": "string",
        "explanation": "string",
        "partOfSpeech": "string",
        "ttsUrl": "string",
        "createdAt": "2025-01-01T00:00:00Z"
      },
      {
        "id": "string",
        "text": "string",
        "explanation": "string",
        "partOfSpeech": "string",
        "ttsUrl": "string",
        "createdAt": "2025-01-01T00:00:00Z"
      }
    ]
  }
  ```
- バリデーションエラー 400
  ```json
  { "error": { "code": "BAD_REQUEST", "message": "prompt is required" } }
  ```
- レート超過 429, サーバエラー 500 を返却
- 備考: Vercel AI SDK のストリーミング対応は将来 `/api/chat/stream` に分離可能

#### (任意) GET `/api/chat/stream`

- 説明: Server-Sent Events (text/event-stream)で逐次トークン送出
- 認証: 任意
- リクエスト: クエリ `?prompt=...`
- レスポンス: `text/event-stream`（イベント: `message`, 最後に`done`）

### 8.2 ブックマーク一覧取得

#### GET `/api/bookmarks`

- 説明: ログインユーザーのブックマーク一覧を返す（ページング対応）。メッセージ内容は `messages` を JOIN して返す。
- 認証: 必須
- クエリ
  - `limit?: number` (default 20, max 100)
  - `cursor?: string` (次ページカーソル)
- レスポンス 200
  ```json
  {
    "items": [
      {
        "bookmarkId": "uuid",
        "createdAt": "2025-01-01T00:00:00Z",
        "note": "string",
        "message": {
          "id": "uuid",
          "content": "string",
          "languageCode": "en",
          "createdAt": "2025-01-01T00:00:00Z"
        }
      }
    ],
    "nextCursor": "string|null"
  }
  ```
- 認証失敗 401, サーバエラー 500

### 8.3 ブックマーク作成

#### POST `/api/bookmarks`

- 説明: 表示中の英語メッセージ ID をブックマーク保存（`bookmarks.user_id + message_id` は一意）
- 認証: 必須
- リクエスト
  ```json
  {
    "messageId": "uuid",
    "note": "string"
  }
  ```
- レスポンス 201
  ```json
  {
    "bookmarkId": "uuid",
    "createdAt": "2025-01-01T00:00:00Z",
    "note": "string",
    "message": {
      "id": "uuid",
      "content": "string",
      "languageCode": "en",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  }
  ```
- バリデーションエラー 400, 認証失敗 401, サーバエラー 500

### 8.4 ブックマーク削除

#### DELETE `/api/bookmarks/:id`

- 説明: 指定ブックマークを削除（本人のみ）
- 認証: 必須
- パスパラメータ: `id` (UUID)
- レスポンス 204 (No Content)
- 認可失敗/対象なし 404, 認証失敗 401

### 8.5 (任意) ブックマーク更新

#### PATCH `/api/bookmarks/:id`

- 説明: メモなどの追記用（将来拡張）
- 認証: 必須
- リクエスト
  ```json
  { "note": "string" }
  ```
- レスポンス 200: 更新後オブジェクト

### 8.6 (任意) TTS 生成

#### POST `/api/tts`

- 説明: 入力テキストから TTS 音声を生成し一時 URL を返却（将来/任意）
- 認証: 任意
- リクエスト
  ```json
  { "text": "string", "voice?: "string" }
  ```
- レスポンス 200
  ```json
  { "audioUrl": "https://.../audio.mp3", "expiresAt": "2025-01-01T00:30:00Z" }
  ```

### 8.7 学習履歴一覧取得

#### GET `/api/history`

- 説明: ログインユーザーの学習履歴を新しい順で返す（ページング/フィルタ対応）
- 認証: 必須
- クエリ
  - `limit?: number` (default 20, max 100)
  - `cursor?: string` (次ページカーソル: createdAt+id など)
  - `eventType?: string` (絞り込み)
  - `from?: string` (ISO8601)
  - `to?: string` (ISO8601)
- レスポンス 200
  ```json
  {
    "items": [
      {
        "id": "uuid",
        "eventType": "chat_generated",
        "text": "make a reservation",
        "metadata": { "messageId": "msg_123", "source": "chat/generate" },
        "createdAt": "2025-01-01T00:00:00Z"
      }
    ],
    "nextCursor": "string|null"
  }
  ```

### 8.8 学習履歴登録

#### POST `/api/history`

- 説明: クライアントの学習操作（例: 音声再生、ブックマーク実行）を履歴として記録
- 認証: 必須
- リクエスト
  ```json
  {
    "eventType": "audio_played",
    "text": "reservation",
    "metadata": { "messageId": "msg_123" }
  }
  ```
- レスポンス 201
  ```json
  {
    "id": "uuid",
    "eventType": "audio_played",
    "text": "reservation",
    "metadata": { "messageId": "msg_123" },
    "createdAt": "2025-01-01T00:00:05Z"
  }
  ```
- バリデーション 400, 認証失敗 401

### 8.9 (任意) 学習履歴サマリ

#### GET `/api/history/stats`

- 説明: 日次/期間内のイベント集計を返す（チャート表示用）
- 認証: 必須
- クエリ
  - `from?: string` (ISO8601)
  - `to?: string` (ISO8601)
  - `bucket?: string` (例: `day`|`week`|`month`、default `day`)
- レスポンス 200
  ```json
  {
    "buckets": [
      {
        "date": "2025-01-01",
        "counts": { "chat_generated": 3, "audio_played": 5, "bookmarked": 2 }
      }
    ]
  }
  ```

### 8.10 学習履歴コホート/リテンション

#### GET `/api/history/cohorts`

- 説明: ユーザーの初回アクティブ日を基準にしたコホート別の継続率/活動量を返す
- 認証: 必須（管理 UI 想定。個人データではなく集計を返す）
- クエリ
  - `from?: string`, `to?: string`（コホート起点の期間）
  - `granularity?: string` (`week`|`month`, default `week`)
- レスポンス 200
  ```json
  {
    "cohorts": [
      {
        "cohort": "2025-W01",
        "size": 120,
        "retention": { "w1": 62, "w2": 48, "w3": 35 }
      }
    ]
  }
  ```

#### GET `/api/history/retention`

- 説明: 指定期間のリテンションカーブ（D1/D7/D14/W1/W4 等）を返す
- 認証: 必須（管理 UI 想定）
- クエリ: `from`, `to`, `buckets?: string[]`（例: `["D1","D7","D14"]`）
- レスポンス 200
  ```json
  { "retention": { "D1": 45.2, "D7": 28.9, "D14": 21.0 } }
  ```

## 9. ステータスコード方針

- 200 OK: 正常取得/更新
- 201 Created: 新規作成成功
- 204 No Content: 削除成功
- 400 Bad Request: バリデーション失敗
- 401 Unauthorized: 認証不足
- 403 Forbidden: 認可不足（通常は RLS で 404 相当を返す運用も可）
- 404 Not Found: 対象なし/存在秘匿
- 409 Conflict: 一意制約衝突など
- 429 Too Many Requests: レート制限
- 500 Internal Server Error: 予期せぬエラー

## 10. セキュリティ

- HTTPS 必須
- 認証トークンの検証（Supabase クライアント/サーバ SDK）
- RLS によるデータアクセス制御
- 入力バリデーションとサニタイズ（LLM プロンプト含む）
- 依存ライブラリの定期更新

## 11. 監視・ログ

- 重要イベント: chat 生成リクエスト、ブックマーク CRUD、学習履歴登録、429/5xx の発生
- 追跡 ID: `x-request-id` をログに関連付け
- 個人情報はマスキング

## 12. テーブル(例: Supabase Postgres)

```sql
-- bookmarks（messages を参照）
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_bookmarks_user_message UNIQUE (user_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON public.bookmarks (user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_message_id ON public.bookmarks (message_id);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own bookmarks"
  ON public.bookmarks FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Modify own bookmarks"
  ON public.bookmarks FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- study_history
create table if not exists public.study_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  text text null,
  metadata jsonb null,
  created_at timestamptz not null default now()
);

alter table public.study_history enable row level security;

create policy "Users can read own history"
  on public.study_history for select
  using (auth.uid() = user_id);

create policy "Users can insert own history"
  on public.study_history for insert
  with check (auth.uid() = user_id);

-- 可視化/統計用ビュー（例）
-- 1) 日次集計ビュー
create or replace view analytics.study_history_daily as
select
  user_id,
  date_trunc('day', created_at) as day,
  event_type,
  count(*) as cnt
from public.study_history
group by 1,2,3;

-- 2) コホート起点（初回活動画面）ビュー
create or replace view analytics.user_first_active as
select user_id, min(created_at) as first_active_at, date_trunc('week', min(created_at)) as first_active_week
from public.study_history
group by 1;

-- 3) 週次コホート×週次継続のクロス集計（例: マテビュー推奨）
-- materialized view は必要に応じて採用し、cron で更新
-- create materialized view analytics.weekly_cohort_retention as ...;
```

## 13. バリデーション仕様(抜粋)

- `prompt`: 1〜500 文字程度、制御文字除外
- `text`: 1〜300 文字程度
- `limit`: 1〜100、数値
- `id`: UUID 形式

## 14. エラーメッセージ例

- `BAD_REQUEST`: フィールド未入力/形式不正
- `UNAUTHORIZED`: ログインが必要です
- `NOT_FOUND`: 対象が見つかりません
- `RATE_LIMITED`: リクエストが多すぎます
- `PROVIDER_ERROR`: LLM/TTS プロバイダエラー
- `INTERNAL_ERROR`: サーバ内部エラー

## 15. 将来拡張

- ストリーミング応答 `/api/chat/stream` の常用化
- ブックマークタグ/並び替え/検索
- 学習履歴の可視化 UI（グラフ表示）、高度な統計/リテンション分析
- 多言語 UI/地域向け TTS 対応
