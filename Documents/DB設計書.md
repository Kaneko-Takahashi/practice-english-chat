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
- chat_groups: チャットグループ単位（1 プロファイルに複数）
- chat_messages: 発話（user / assistant / system）。アシスタントは同一ユーザー発話への応答を最大 3 バブルで返す。
- bookmarks: ブックマーク（ユーザー単位で chat_message を保存）
- tts_cache: TTS 音声キャッシュ（chat_message × voice × provider 単位）

3. ER 関係（テキスト表現）

- auth.users 1 — 1 profiles（同一 ID、profiles から参照）
- profiles 1 — n chat_groups
- chat_groups 1 — n chat_messages
- auth.users 1 — n bookmarks（bookmarks n — 1 chat_messages）
- chat_messages 1 — n tts_cache
- chat_messages（assistant）: `response_to_message_id` によりトリガーとなった user メッセージへ参照
- chat_messages（assistant の 3 バブル）: 同一応答セットを `message_set_id` でグルーピング

4. テーブル定義（詳細）

4.1 profiles（ユーザープロファイル）

```sql
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name         text,
  avatar_url           text,
  learning_level       text NOT NULL DEFAULT 'standard' CHECK (learning_level IN ('beginner', 'standard', 'advanced')),
  tts_enabled          boolean NOT NULL DEFAULT true,
  tts_speed            text NOT NULL DEFAULT 'normal' CHECK (tts_speed IN ('slow', 'normal', 'fast')),
  tts_voice            text,
  theme                text NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  font_size            text NOT NULL DEFAULT 'medium' CHECK (font_size IN ('small', 'medium', 'large')),
  allow_usage_analysis boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
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

**設定カラムの説明:**

- `learning_level`: ユーザーの英語学習レベル。`beginner`（やさしい）、`standard`（ふつう、デフォルト）、`advanced`（チャレンジ）の 3 段階。将来の AI 応答生成に反映される。
- `tts_enabled`: 音声読み上げ機能の有効/無効。デフォルトは`true`（有効）。
- `tts_speed`: 音声読み上げの速度。`slow`（ゆっくり）、`normal`（ふつう、デフォルト）、`fast`（はやい）の 3 段階。
- `tts_voice`: 音声の種類。`NULL`（デフォルト）、`female_1`（女性 1）、`male_1`（男性 1）など。Web Speech API の利用可能な声から選択。
- `theme`: カラーテーマ。`light`（ライト、デフォルト）、`dark`（ダーク）。Tailwind CSS のダークモードと連携。
- `font_size`: フォントサイズ。`small`（小さめ）、`medium`（ふつう、デフォルト）、`large`（大きめ）。CSS クラスで適用。
- `allow_usage_analysis`: 学習活動を記録して、学習履歴ページでグラフ表示することを許可するかどうか。デフォルトは`false`（無効）。記録を有効にすると、チャット送信、音声再生、ブックマーク操作が`study_logs`テーブルに記録され、学習履歴可視化ページで統計グラフとして表示されます。

  4.2 chat_groups（チャットグループ単位）

```sql
CREATE TABLE IF NOT EXISTS public.chat_groups (
  id              uuid PRIMARY KEY,
  profile_id      uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  title           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_chat_groups_profile_id ON public.chat_groups (profile_id);
CREATE INDEX IF NOT EXISTS idx_chat_groups_deleted_at ON public.chat_groups (deleted_at);

-- updated_at 自動更新トリガー
DROP TRIGGER IF EXISTS trg_chat_groups_updated_at ON public.chat_groups;
CREATE TRIGGER trg_chat_groups_updated_at
BEFORE UPDATE ON public.chat_groups
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- RLS（自分のチャットグループのみ参照・更新可能）
ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read own chat_groups" ON public.chat_groups;
CREATE POLICY "Read own chat_groups"
ON public.chat_groups FOR SELECT
USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Modify own chat_groups" ON public.chat_groups;
CREATE POLICY "Modify own chat_groups"
ON public.chat_groups FOR ALL
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());
```

4.3 chat_messages（発話）
要件:

- 役割: user / assistant / system
- 表示順: `sequence_num`（チャットグループ内で単調増加）
- アシスタントの 3 バブル: 同一 `message_set_id` でグループ化、1..3 を `bubble_index` で保持
- 応答元: `response_to_message_id`（user メッセージを参照）

```sql
CREATE TYPE message_role AS ENUM ('user', 'assistant', 'system');

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id                       uuid PRIMARY KEY,
  chat_group_id            uuid NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  role                     message_role NOT NULL,
  content                  text NOT NULL,
  sequence_num             integer NOT NULL,
  response_to_message_id   uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  message_set_id           uuid,       -- 同一応答セット識別子（assistant のみ想定）
  bubble_index             smallint,   -- 1..3（assistant のみ想定）
  language_code            varchar(8) DEFAULT 'en', -- ISO-639 + 地域を想定
  metadata_json            jsonb,      -- モデル名/プロンプト設定/スコア等の拡張
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  deleted_at               timestamptz,

  CONSTRAINT uq_chat_messages_seq_per_group UNIQUE (chat_group_id, sequence_num)
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_group_id ON public.chat_messages (chat_group_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_response_to ON public.chat_messages (response_to_message_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_set ON public.chat_messages (message_set_id, bubble_index);
CREATE INDEX IF NOT EXISTS idx_chat_messages_deleted_at ON public.chat_messages (deleted_at);

-- updated_at 自動更新トリガー
DROP TRIGGER IF EXISTS trg_chat_messages_updated_at ON public.chat_messages;
CREATE TRIGGER trg_chat_messages_updated_at
BEFORE UPDATE ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- RLS の有効化
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 自分のチャットグループのメッセージを参照可能
DROP POLICY IF EXISTS "Read own chat_messages" ON public.chat_messages;
CREATE POLICY "Read own chat_messages"
ON public.chat_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_groups
    WHERE chat_groups.id = chat_messages.chat_group_id
    AND chat_groups.profile_id = auth.uid()
    AND chat_groups.deleted_at IS NULL
  )
);

-- 自分のチャットグループのメッセージを変更可能（INSERT, UPDATE, DELETE）
DROP POLICY IF EXISTS "Modify own chat_messages" ON public.chat_messages;
CREATE POLICY "Modify own chat_messages"
ON public.chat_messages FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.chat_groups
    WHERE chat_groups.id = chat_messages.chat_group_id
    AND chat_groups.profile_id = auth.uid()
    AND chat_groups.deleted_at IS NULL
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_groups
    WHERE chat_groups.id = chat_messages.chat_group_id
    AND chat_groups.profile_id = auth.uid()
    AND chat_groups.deleted_at IS NULL
  )
);
```

備考:

- UI 要件により、アシスタントは 3 メッセージ（3 バブル）を個別に表示するため、`chat_messages` に 1 バブル=1 行で保持。
- 必要に応じて user メッセージと assistant 応答（最大 3 件）を `message_set_id` で束ねる。

  4.4 bookmarks（ブックマーク）

```sql
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id              uuid PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id      uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
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
CREATE TABLE IF NOT EXISTS public.tts_cache (
  id              uuid PRIMARY KEY,
  message_id      uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  provider        text NOT NULL,     -- 例: 'gcp', 'azure', 'aws'
  voice           text NOT NULL,     -- 例: 'en-US-Neural2-C'
  audio_mime_type text NOT NULL,     -- 例: 'audio/mpeg'
  storage_key     text NOT NULL,     -- オブジェクトストレージのキー/URL
  hash_key        text NOT NULL,     -- 去重用（message_id + provider + voice などのハッシュ）
  expires_at      timestamptz,       -- 期限（任意）
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_tts_cache_hash UNIQUE (hash_key)
);

CREATE INDEX IF NOT EXISTS idx_tts_cache_message_id ON public.tts_cache (message_id);
CREATE INDEX IF NOT EXISTS idx_tts_cache_provider_voice ON public.tts_cache (provider, voice);
```

4.6 study_logs（学習ログ）
要件:

- ユーザーの学習活動（チャット送信、音声再生、ブックマーク追加/削除、クイズプレイ）を記録
- 記録設定で許可されている場合のみログを記録
- 学習履歴可視化ページで統計グラフとして表示するために使用

```sql
CREATE TABLE IF NOT EXISTS public.study_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('chat_send', 'audio_play', 'bookmark_add', 'bookmark_remove', 'quiz_play')),
  learning_level TEXT CHECK (learning_level IN ('beginner', 'standard', 'advanced')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- インデックスの作成（パフォーマンス向上）
CREATE INDEX idx_study_logs_user_id ON public.study_logs(user_id);
CREATE INDEX idx_study_logs_user_id_created_at ON public.study_logs(user_id, created_at DESC);
CREATE INDEX idx_study_logs_event_type ON public.study_logs(event_type);

-- RLSの有効化
ALTER TABLE public.study_logs ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: ユーザーは自分のログのみ閲覧可能
CREATE POLICY "Users can view their own study logs"
  ON public.study_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLSポリシー: ユーザーは自分のログのみ挿入可能
CREATE POLICY "Users can insert their own study logs"
  ON public.study_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLSポリシー: ユーザーは自分のログのみ削除可能
CREATE POLICY "Users can delete their own study logs"
  ON public.study_logs
  FOR DELETE
  USING (auth.uid() = user_id);
```

**カラムの説明:**

- `event_type`: イベントの種類。`chat_send`（チャット送信）、`audio_play`（音声再生）、`bookmark_add`（ブックマーク追加）、`bookmark_remove`（ブックマーク削除）、`quiz_play`（クイズプレイ）の 5 種類。
- `learning_level`: イベント発生時のユーザーの学習レベル。`profiles.learning_level`から取得。
  - **注意**: クイズプレイ時に一時的に難易度を変更した場合、この`learning_level`は一時的に選択された難易度を反映する（設定値とは異なる場合がある）。
- `metadata`: イベント固有の追加情報を JSON 形式で保存。
  - チャット: `{"conversation_id": "...", "message_length": 50}`
  - 音声: `{"message_id": "...", "audio_speed": "normal", "voice_type": "female_1", "text_length": 30}`
  - ブックマーク: `{"message_id": "..."}`
  - クイズ: `{"quiz_type": "sentence_scramble", "total_questions": 10, "correct_answers": 7, "score": 70, "total_time": 180}`
    - `quiz_type`: クイズの種類（現在は `sentence_scramble` のみ）
    - `total_questions`: 総問題数
    - `correct_answers`: 正解数
    - `score`: スコア（0-100 点）
    - `total_time`: 総プレイ時間（秒）
- `created_at`: ログの記録日時。統計集計の基準となる。

**クイズプレイ時の記録方法:**

1. スタート画面で難易度を選択（やさしい/ふつう/チャレンジ）
2. ゲームプレイ中、選択された難易度で問題が生成される
3. ゲーム終了時、`logStudyEvent("quiz_play", ...)` を実行
4. `learning_level` には選択された難易度が記録される（一時的に変更した場合も反映）
5. スコアは自動的に localStorage に保存され、次回のスタート画面で表示される

6. 非機能要件への配慮

- パフォーマンス: チャットグループ内順序は `(chat_group_id, sequence_num)` ユニークで取得高速化。`chat_messages` の主要検索列へインデックス付与。
- スケーラビリティ: 音声はバイナリを DB に保持せず `storage_key`（外部ストレージ）参照。CDN 併用想定。
- セキュリティ: `users.email` はユニーク。PII へのアクセスはアプリ層で制御。通信は TLS 必須。
- 信頼性: 主要テーブルに `deleted_at` を設けソフトデリート対応（復旧容易）。

6. 代表的ユースケース別クエリ
   6.1 チャットグループの最新 50 発話を取得（ソフトデリート除外）

```sql
SELECT *
FROM public.chat_messages
WHERE chat_group_id = $1
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
FROM public.bookmarks b
JOIN public.chat_messages m ON m.id = b.message_id
WHERE b.user_id = $1
ORDER BY b.created_at DESC;
```

6.3 指定メッセージの TTS 音声キャッシュを取得

```sql
SELECT *
FROM public.tts_cache
WHERE message_id = $1
  AND provider = $2
  AND voice = $3
ORDER BY created_at DESC
LIMIT 1;
```

7. マイグレーション順序（初期）

1) profiles（auth.users への参照前提で public スキーマに作成）
2) chat_groups（profile_id -> profiles.user_id）
3) message_role（ENUM）
4) chat_messages
5) bookmarks（user_id -> auth.users, message_id -> chat_messages）
6) tts_cache（message_id -> chat_messages）
7) profiles テーブルに設定カラムを追加（`learning_level`, `tts_enabled`, `tts_speed`, `tts_voice`, `theme`, `font_size`, `allow_usage_analysis`）
8) study_logs（user_id -> auth.users）- 学習活動の記録

8. 将来拡張のための余白

- レベル別パーソナライズ: `user_profiles`（CEFR/好み/目標）の詳細化
- クイズ機能: `quizzes`, `quiz_questions`, `quiz_answers`, `quiz_sessions`
- コミュニティ機能: `posts`, `comments`, `likes`
- 多言語対応: `messages.language_code` を活用し i18n を拡充
- AI による学習データ分析: `study_logs` の高度な解析とレコメンデーション

9. 命名規則（抜粋）

- テーブル: スネークケース複数形（例: `user_profiles`）
- 主キー: `id`（UUID）
- 外部キー: `<参照先>_id`
- 時刻: `created_at`, `updated_at`, `deleted_at`（timestamptz）
- ENUM: 小文字スネークケース／本設計では `message_role`

10. 注意事項

- ユーザー管理は Supabase の `auth.users` を利用し、アプリ側の拡張情報は `public.profiles` で管理。
- `profiles` と `chat_groups` は 1 対多の関係。1 つのプロファイルが複数のチャットグループを持つことができる。
- `chat_groups` と `chat_messages` は 1 対多の関係。1 つのチャットグループが複数のメッセージを持つことができる。
- 匿名利用を行う場合は `chat_groups.profile_id` を NULL 許容とし、別途 `device_id` 等でクライアント側管理 → ログイン後に紐付け移行を検討（RLS が複雑になるため、まずはログイン必須を推奨）。
- アシスタントの 3 バブルは `chat_messages` の 3 行で保持し、UI で個別表示。まとめて扱う場合は `message_set_id` でグルーピング。
- 音声ファイルは外部ストレージ管理。DB にはメタデータとキーのみを保持。
