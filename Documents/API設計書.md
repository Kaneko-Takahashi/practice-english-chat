Lingo Leap API 設計書

## 1. 概要

本書は「Lingo Leap」のフロントエンド(Next.js)から利用する API インターフェースの設計を示します。Supabase による DB 設計・認証・RLS を前提とし、AI 応答生成、学習履歴記録・可視化、ブックマーク機能、各種統計分析 API の詳細を記述します。

## 2. 基本方針・技術要件

- フレームワーク: Next.js (App Router) + TypeScript
- 認証/DB: Supabase (Auth + Postgres, 行レベルセキュリティ)
- LLM 連携: Vercel AI SDK/外部 API
- 集計/可視化: Supabase の view/materialized view を API で公開

## 3. ベース URL

- `/api/*` (Next.js Route Handlers 経由、SSR/クライアント両対応)

## 4. 認証・権限

- 認証: Supabase Auth の access token
- RLS: 各 API でユーザーごとにデータ分離

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

## 6. API エンドポイント一覧

### 6.1 AI 応答生成

- **POST `/api/chat/generate`**
  - input: `{ prompt: string, level?: string }`
  - out: `{ messages: [{ id, content, languageCode, createdAt }] }`
  - 備考: streaming は別途 `/api/chat/stream`

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
  - input: `{ note }` memo 更新のみ

### 6.3 学習履歴

- **POST `/api/history`**
  - input: `{ eventType: string, text?: string, metadata?: object }`
  - output: 登録内容
- **GET `/api/history`**
  - 概要: ユーザー自身の履歴。`eventType`,`from`,`to`等でフィルタ・ページング可
  - output: `items[{ id, eventType, text, metadata, createdAt }]`

### 6.4 ユーザー設定

- **GET `/api/settings`**（Server Action: `getSettings`）

  - 概要: ログインユーザーの設定値を取得
  - 認証: 必須（Supabase Auth）
  - output:
    ```json
    {
      "success": true,
      "settings": {
        "learning_level": "standard",
        "tts_enabled": true,
        "tts_speed": "normal",
        "tts_voice": null,
        "theme": "light",
        "font_size": "medium",
        "allow_usage_analysis": false
      }
    }
    ```
  - エラー時: `{ "success": false, "error": "..." }`

- **PATCH `/api/settings`**（Server Action: `updateSettings`）
  - 概要: ログインユーザーの設定値を更新
  - 認証: 必須（Supabase Auth）
  - input: 更新したい設定項目のみを部分更新可能
    ```json
    {
      "learning_level": "advanced",
      "tts_enabled": false,
      "tts_speed": "fast",
      "theme": "dark",
      "font_size": "large",
      "allow_usage_analysis": true
    }
    ```
  - output:
    ```json
    {
      "success": true,
      "message": "設定を更新しました"
    }
    ```
  - エラー時: `{ "success": false, "error": "..." }`
  - 備考:
    - 設定更新後は `revalidatePath` で関連ページを再検証
    - テーマとフォントサイズは即座に画面に反映される（`localStorage` と DOM クラス操作）
    - TTS 設定はチャット画面の音声再生に反映される
      - `tts_enabled`: `false` の場合、音声ボタンを非表示
      - `tts_speed`: 再生速度（`slow`: 0.7 倍速、`normal`: 1.0 倍速、`fast`: 1.3 倍速）
      - `tts_voice`: 声のタイプ（`null`: デフォルト、`female_1`: 女性 1、`male_1`: 男性 1）
    - 設定変更時は `settingsChanged` カスタムイベントを発火し、チャット画面のコンポーネントに通知

---

### 6.5 学習履歴統計・グラフ

- **GET `/api/history/stats`**
  - 概要: 集計チャート用の日次/週次イベント件数
  - query: `from, to, bucket=day|week|month`
  - output 例:
    ```json
    {
      "buckets": [
        {
          "date": "2025-01-01",
          "counts": { "chat_generated": 5, "audio_played": 12 }
        }
      ]
    }
    ```
- **GET `/api/history/cohorts`**
  - 概要: コホート分析(週次/月次での継続率, 活動数)
  - output 例:
    ```json
    {
      "cohorts": [
        {
          "cohort": "2025-W01",
          "size": 40,
          "retention": { "w1": 40, "w2": 26, "w3": 15 }
        }
      ]
    }
    ```
- **GET `/api/history/retention`**
  - 概要: D1/D7/W1 等のリテンション率
  - output 例:
    ```json
    { "retention": { "D1": 45.5, "D7": 28.3, "D14": 21.0 } }
    ```

### 6.5. 学習統計 API（実装済み）

- **Server Action: `logStudyEvent`**

  - 概要: 学習活動のログを記録
  - メソッド: Server Action（`@/app/actions/analytics.ts`）
  - パラメータ:
    - `eventType`: イベントタイプ（`'chat_send' | 'audio_play' | 'bookmark_add' | 'bookmark_remove'`）
    - `metadata`: イベント固有の追加情報（オプション）
  - レスポンス:
    ```typescript
    { success: boolean; error?: string }
    ```
  - 備考:
    - 記録設定（`allow_usage_analysis`）で有効にしている場合のみログを記録
    - 無効の場合も `success: true` を返す（エラーではない）
    - ログには `user_id`, `event_type`, `learning_level`, `metadata`, `created_at` が含まれる
    - 記録されたデータは学習履歴可視化ページでグラフ表示される

- **Server Action: `getStudyStatistics`**
  - 概要: 指定期間の学習統計データを取得
  - メソッド: Server Action（`@/app/actions/analytics.ts`）
  - パラメータ:
    - `days`: 集計期間（デフォルト: 30 日）
  - レスポンス:
    ```typescript
    {
      success: boolean;
      data?: {
        totalChatCount: number;
        totalAudioPlayCount: number;
        totalBookmarkCount: number;
        dailyStats: Array<{
          date: string;
          chatCount: number;
          audioPlayCount: number;
          bookmarkCount: number;
        }>;
        eventTypeCounts: {
          chat_send: number;
          audio_play: number;
          bookmark_add: number;
          bookmark_remove: number;
        };
      };
      error?: string;
    }
    ```
  - 備考:
    - 認証済みユーザーのログのみ取得（RLS により保護）
    - 日別統計、イベントタイプ別統計を提供
    - フロントエンドで Recharts を使用してグラフ化

### 6.6 クイズ／ゲーム API（実装済み）

- **POST `/api/quiz/generate`**
  - 概要: ユーザーの学習レベルに応じた英語並び替え問題を動的に生成
  - メソッド: POST（Next.js Route Handler）
  - パス: `/api/quiz/generate/route.ts`
  - 認証: 必須（Supabase Auth）
  - リクエストボディ:
    ```typescript
    {
      count?: number;        // 問題数（デフォルト: 10）
      level?: "beginner" | "standard" | "advanced"; // 学習レベル（省略時はユーザーの設定値を使用）
    }
    ```
  - レスポンス:
    ```typescript
    {
      success: boolean;
      questions?: Array<{
        id: string;                // 問題ID（例: "q1", "q2", ...）
        japanese: string;          // 日本語の意味
        english: string;           // 正解の英語文
        shuffledWords: string[];   // シャッフルされた単語配列
        correctOrder: string[];    // 正解の単語順序
      }>;
      level?: "beginner" | "standard" | "advanced"; // 適用された学習レベル
      error?: string;
    }
    ```
  - 問題生成ロジック:
    - **やさしい（beginner）**:
      - 3-6 語の基本的な単語
      - 単純な文法構造（S+V+O）
      - 現在形・過去形の基本時制
      - 日常会話（挨拶、買い物、道案内）
    - **ふつう（standard）**:
      - 5-9 語の自然な語彙
      - 基本～中程度の文法構造
      - 一般的な時制（現在・過去・未来）
      - 日常生活（旅行、仕事、趣味）
    - **チャレンジ（advanced）**:
      - 8-12 語の洗練された語彙
      - 複雑な文法構造（関係節、条件節）
      - 完了時制を含む多様な時制
      - ビジネス・フォーマルな状況
  - 技術実装:
    - **Vercel AI SDK**（`ai` パッケージ）の `generateText` を使用
    - AI プロバイダー: OpenAI または Google Generative AI（環境変数で選択）
      - OpenAI: `gpt-4o-mini`（デフォルト）
      - Google: `gemini-1.5-flash`（デフォルト）
    - プロンプトで学習レベルに応じた難易度調整
    - JSON フォーマットで 10 問を一括生成
    - 単語のシャッフルはサーバー側で実行（ランダムソート）
    - 環境変数:
      - `AI_PROVIDER`: "openai" | "google"（デフォルト: "openai"）
      - `OPENAI_API_KEY`: OpenAI API キー
      - `GOOGLE_GENERATIVE_AI_API_KEY`: Google Generative AI API キー
      - `AI_MODEL`: モデル名（省略時は上記デフォルト）
  - エラーハンドリング:
    - 認証エラー: `401 Unauthorized`
    - 問題生成失敗: `500 Internal Server Error` + エラーメッセージ
  - 備考:
    - 生成された問題は揮発的（DB 保存なし）
    - 同じリクエストでも毎回異なる問題が生成される
    - 学習レベルが指定されない場合、ユーザーの `profiles.learning_level` を自動取得
    - 学習ログへの記録は別途 `logStudyEvent("quiz_play", ...)` で実行

## 7. ステータス/エラー方針

- 200: 正常、201: 作成、204: 削除
- 400: バリデーション、401: 未認証、404: データ無し、409: 一意制約、429: レート過多、500: サーバ内部
- error 例: `{ "error": { "code": "BAD_REQUEST", "message": "..." } }`

## 8. セキュリティ

- Supabase Auth 必須 API: bookmarks, history, settings
- 行レベルセキュリティで他者データ不可
- 設定 API は自分のプロフィールのみ更新可能（RLS ポリシーで保護）
- HTTPS 必須

## 9. 付録: 可視化・統計 DB(SQL 抜粋）

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
