DB 設計書（Lingo Leap）

1. 概要 / 前提

   - 対象: 英語学習チャット UI「Lingo Leap」
   - 主機能: チャット、AI 応答（同一プロンプトに対し 3 つの英語メッセージを提示）、音声再生（TTS）、ブックマーク管理
   - 想定 DB: PostgreSQL 15 以降
   - タイムスタンプ型: timestamptz（UTC）
   - 主キー: UUID（v4）
   - 文字コード: UTF-8
   - ユーザー管理は「仮」だが拡張しやすいように `users` を用意（匿名利用時は `user_id` を NULL 許容）

2. エンティティ一覧（高レベル）

- auth.users: Supabase が管理する認証ユーザー（変更不可、参照のみ）
- profiles: アプリ拡張用ユーザープロファイル（display_name, avatar_url 等）
- conversations: チャット単位（1 ユーザーに複数）
- messages: 発話（user / assistant / system）。アシスタントは同一ユーザー発話への応答を最大 3 バブルで返す。
- bookmarks: ブックマーク（ユーザー単位で message を保存）
- tts_cache: TTS 音声キャッシュ（message × voice × provider 単位）

3. ER 関係（テキスト表現）

- auth.users 1 — 1 profiles（同一 ID、profiles から参照）
- auth.users 1 — n conversations
- conversations 1 — n messages
- auth.users 1 — n bookmarks（bookmarks n — 1 messages）
- messages 1 — n tts_cache
- messages（assistant）: `response_to_message_id` によりトリガーとなった user メッセージへ参照
- messages（assistant の 3 バブル）: 同一応答セットを `message_set_id` でグルーピング

4. テーブル定義（詳細）

4.1 profiles（ユーザープロファイル）

```sql
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- 更新タイムスタンプ更新用トリガ（任意）
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- RLS（各自のプロフィールのみ参照・更新可能）
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by owner" ON public.profiles;
CREATE POLICY "Profiles are viewable by owner"
ON public.profiles FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

4.2 conversations（チャット単位）

```sql
CREATE TABLE IF NOT EXISTS public.conversations (
  id              uuid PRIMARY KEY,
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations (user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_deleted_at ON public.conversations (deleted_at);

-- RLS（自分の会話のみ参照・更新可能）
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read own conversations" ON public.conversations;
CREATE POLICY "Read own conversations"
ON public.conversations FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Modify own conversations" ON public.conversations;
CREATE POLICY "Modify own conversations"
ON public.conversations FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

4.3 messages（発話）
要件:

- 役割: user / assistant / system
- 表示順: `sequence_num`（会話内で単調増加）
- アシスタントの 3 バブル: 同一 `message_set_id` でグループ化、1..3 を `bubble_index` で保持
- 応答元: `response_to_message_id`（user メッセージを参照）

```sql
CREATE TYPE message_role AS ENUM ('user', 'assistant', 'system');

CREATE TABLE IF NOT EXISTS messages (
  id                       uuid PRIMARY KEY,
  conversation_id          uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role                     message_role NOT NULL,
  content                  text NOT NULL,
  sequence_num             integer NOT NULL,
  response_to_message_id   uuid REFERENCES messages(id) ON DELETE SET NULL,
  message_set_id           uuid,       -- 同一応答セット識別子（assistant のみ想定）
  bubble_index             smallint,   -- 1..3（assistant のみ想定）
  language_code            varchar(8) DEFAULT 'en', -- ISO-639 + 地域を想定
  metadata_json            jsonb,      -- モデル名/プロンプト設定/スコア等の拡張
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  deleted_at               timestamptz,

  CONSTRAINT uq_messages_seq_per_conv UNIQUE (conversation_id, sequence_num)
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_response_to ON messages (response_to_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_set ON messages (message_set_id, bubble_index);
CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON messages (deleted_at);
```

備考:

- UI 要件により、アシスタントは 3 メッセージ（3 バブル）を個別に表示するため、`messages` に 1 バブル=1 行で保持。
- 必要に応じて user メッセージと assistant 応答（最大 3 件）を `message_set_id` で束ねる。

  4.4 bookmarks（ブックマーク）

```sql
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id              uuid PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id      uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  note            text, -- 任意メモ
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_bookmarks_user_message UNIQUE (user_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON public.bookmarks (user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_message_id ON public.bookmarks (message_id);

-- RLS（自分のブックマークのみ参照・更新可能）
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read own bookmarks" ON public.bookmarks;
CREATE POLICY "Read own bookmarks"
ON public.bookmarks FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Modify own bookmarks" ON public.bookmarks;
CREATE POLICY "Modify own bookmarks"
ON public.bookmarks FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

4.5 tts_cache（音声キャッシュ）
要件:

- 1 メッセージ × 音声（voice）× プロバイダ（provider）ごとにキャッシュ
- 同一条件の重複生成防止のためユニークキーを付与

```sql
CREATE TABLE IF NOT EXISTS tts_cache (
  id              uuid PRIMARY KEY,
  message_id      uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  provider        text NOT NULL,     -- 例: 'gcp', 'azure', 'aws'
  voice           text NOT NULL,     -- 例: 'en-US-Neural2-C'
  audio_mime_type text NOT NULL,     -- 例: 'audio/mpeg'
  storage_key     text NOT NULL,     -- オブジェクトストレージのキー/URL
  hash_key        text NOT NULL,     -- 去重用（message_id + provider + voice などのハッシュ）
  expires_at      timestamptz,       -- 期限（任意）
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_tts_cache_hash UNIQUE (hash_key)
);

CREATE INDEX IF NOT EXISTS idx_tts_cache_message_id ON tts_cache (message_id);
CREATE INDEX IF NOT EXISTS idx_tts_cache_provider_voice ON tts_cache (provider, voice);
```

5. 非機能要件への配慮

- パフォーマンス: 会話内順序は `(conversation_id, sequence_num)` ユニークで取得高速化。`messages` の主要検索列へインデックス付与。
- スケーラビリティ: 音声はバイナリを DB に保持せず `storage_key`（外部ストレージ）参照。CDN 併用想定。
- セキュリティ: `users.email` はユニーク。PII へのアクセスはアプリ層で制御。通信は TLS 必須。
- 信頼性: 主要テーブルに `deleted_at` を設けソフトデリート対応（復旧容易）。

6. 代表的ユースケース別クエリ
   6.1 会話の最新 50 発話を取得（ソフトデリート除外）

```sql
SELECT *
FROM messages
WHERE conversation_id = $1
  AND deleted_at IS NULL
ORDER BY sequence_num DESC
LIMIT 50;
```

6.2 ユーザーのブックマーク一覧（最新順）

```sql
SELECT b.id AS bookmark_id,
       m.id AS message_id,
       m.content,
       m.language_code,
       b.created_at
FROM bookmarks b
JOIN messages m ON m.id = b.message_id
WHERE b.user_id = $1
ORDER BY b.created_at DESC;
```

6.3 指定メッセージの TTS 音声キャッシュを取得

```sql
SELECT *
FROM tts_cache
WHERE message_id = $1
  AND provider = $2
  AND voice = $3
ORDER BY created_at DESC
LIMIT 1;
```

7. マイグレーション順序（初期）

1) profiles（auth.users への参照前提で public スキーマに作成）
2) conversations（user_id -> auth.users）
3) message_role（ENUM）
4) messages
5) bookmarks（user_id -> auth.users）
6) tts_cache

8. 将来拡張のための余白

- 学習履歴可視化: `study_logs`（再生・復習回数、間隔、正答率など）
- レベル別パーソナライズ: `user_profiles`（CEFR/好み/目標）
- クイズ機能: `quizzes`, `quiz_questions`, `quiz_answers`, `quiz_sessions`
- コミュニティ機能: `posts`, `comments`, `likes`
- 多言語対応: `messages.language_code` を活用し i18n を拡充

9. 命名規則（抜粋）

- テーブル: スネークケース複数形（例: `user_profiles`）
- 主キー: `id`（UUID）
- 外部キー: `<参照先>_id`
- 時刻: `created_at`, `updated_at`, `deleted_at`（timestamptz）
- ENUM: 小文字スネークケース／本設計では `message_role`

10. 注意事項

- ユーザー管理は Supabase の `auth.users` を利用し、アプリ側の拡張情報は `public.profiles` で管理。
- 匿名利用を行う場合は `conversations.user_id` を NULL 許容とし、別途 `device_id` 等でクライアント側管理 → ログイン後に紐付け移行を検討（RLS が複雑になるため、まずはログイン必須を推奨）。
- アシスタントの 3 バブルは `messages` の 3 行で保持し、UI で個別表示。まとめて扱う場合は `message_set_id` でグルーピング。
- 音声ファイルは外部ストレージ管理。DB にはメタデータとキーのみを保持。
