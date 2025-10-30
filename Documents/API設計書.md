Lingo Leap API設計書

## 1. 概要
本書は「Lingo Leap」のフロントエンド(Next.js)から利用するAPIインターフェースの設計を示します。SupabaseによるDB設計・認証・RLSを前提とし、AI応答生成、学習履歴記録・可視化、ブックマーク機能、各種統計分析APIの詳細を記述します。

## 2. 基本方針・技術要件
- フレームワーク: Next.js (App Router) + TypeScript
- 認証/DB: Supabase (Auth + Postgres, 行レベルセキュリティ)
- LLM連携: Vercel AI SDK/外部API
- 集計/可視化: Supabaseのview/materialized viewをAPIで公開

## 3. ベースURL
- `/api/*` (Next.js Route Handlers経由、SSR/クライアント両対応)

## 4. 認証・権限
- 認証: Supabase Authのaccess token
- RLS: 各APIでユーザーごとにデータ分離

## 5. データモデル（概要）
### Message（英語例文/発話）
- `id: uuid` (messages.id)
- `content: text`
- `language_code: varchar(8)`
- `created_at: timestamptz`

### Bookmark（ブックマーク）
- `id: uuid` (bookmarks.id)
- `user_id: uuid` (auth.users)
- `message_id: uuid` (messages.id)
- `note: text` (メモ, 任意)
- `created_at: timestamptz`

### StudyHistory（学習履歴）
- `id: uuid`
- `user_id: uuid`
- `event_type: text` (例: chat_generated, audio_played, bookmarked)
- `text: text` (対象テキスト、任意)
- `metadata: jsonb`（message_id, level など、任意）
- `created_at: timestamptz`


## 6. APIエンドポイント一覧

### 6.1 AI応答生成
- **POST `/api/chat/generate`**
  - input: `{ prompt: string, level?: string }`
  - out: `{ messages: [{ id, content, languageCode, createdAt }] }`
  - 備考: streamingは別途 `/api/chat/stream`

### 6.2 ブックマーク
- **GET `/api/bookmarks`**
  - 概要: ログインユーザーのブックマーク一覧を返す（ページング/ソート）
  - query: `limit, cursor, sort`
  - output:
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
- **POST `/api/bookmarks`**
  - input: `{ messageId: uuid, note?: string }`
  - output: 登録したブックマーク情報（上記構造）
- **DELETE `/api/bookmarks/:id`**
  - output: 204 No Content
- **PATCH `/api/bookmarks/:id`**
  - input: `{ note }` memo更新のみ


### 6.3 学習履歴
- **POST `/api/history`**
  - input: `{ eventType: string, text?: string, metadata?: object }`
  - output: 登録内容
- **GET `/api/history`**
  - 概要: ユーザー自身の履歴。`eventType`,`from`,`to`等でフィルタ・ページング可
  - output: `items[{ id, eventType, text, metadata, createdAt }]`

---
### 6.4 学習履歴統計・グラフ
- **GET `/api/history/stats`**
  - 概要: 集計チャート用の日次/週次イベント件数
  - query: `from, to, bucket=day|week|month`
  - output例:
    ```json
    {
      "buckets": [
        { "date": "2025-01-01", "counts": { "chat_generated": 5, "audio_played": 12 } }
      ]
    }
    ```
- **GET `/api/history/cohorts`**
  - 概要: コホート分析(週次/月次での継続率, 活動数)
  - output例:
    ```json
    {
      "cohorts": [
        { "cohort": "2025-W01", "size": 40, "retention": { "w1": 40, "w2": 26, "w3": 15 } }
      ]
    }
    ```
- **GET `/api/history/retention`**
  - 概要: D1/D7/W1等のリテンション率
  - output例:
    ```json
    { "retention": { "D1": 45.5, "D7": 28.3, "D14": 21.0 } }
    ```

## 7. ステータス/エラー方針
- 200: 正常、201: 作成、204: 削除
- 400: バリデーション、401: 未認証、404: データ無し、409: 一意制約、429: レート過多、500: サーバ内部
- error例: `{ "error": { "code": "BAD_REQUEST", "message": "..." } }`

## 8. セキュリティ
- Supabase Auth必須API: bookmarks, history
- 行レベルセキュリティで他者データ不可
- HTTPS必須

## 9. 付録: 可視化・統計DB(SQL抜粋）
```sql
-- 日次イベント件数ビュー
create or replace view analytics.study_history_daily as
select user_id, date_trunc('day', created_at) as day, event_type, count(*) as cnt
from public.study_history
group by 1,2,3;

-- 週次コホート起点例
create or replace view analytics.user_first_active as
select user_id, min(created_at) as first_active_at, date_trunc('week', min(created_at)) as first_active_week
from public.study_history
group by 1;
```
---
以上
