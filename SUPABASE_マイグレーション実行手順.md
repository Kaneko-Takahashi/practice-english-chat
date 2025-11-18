# Supabase マイグレーション実行手順

## 重要：順番に実行してください

以下の 3 つのマイグレーションを**順番に**実行する必要があります。

---

## 手順 1: マイグレーション 1 を実行（chat_groups の作成）

1. Supabase ダッシュボードにログイン
2. 左サイドバーから **「SQL Editor」** をクリック
3. **「New query」** をクリック
4. 以下の SQL をコピー＆ペーストして実行：

```sql
-- conversations テーブルを chat_groups にリネームし、user_id を profile_id に変更
-- 既存のテーブルがある場合は、データを保持しながらリネーム

-- 1. 新しい chat_groups テーブルを作成
CREATE TABLE IF NOT EXISTS public.chat_groups (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  title           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

-- 2. 既存の conversations テーブルからデータを移行（存在する場合）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversations') THEN
    -- まず、conversations の user_id に対応する profiles レコードが存在しない場合は作成
    INSERT INTO public.profiles (user_id, display_name, avatar_url, created_at, updated_at)
    SELECT DISTINCT
      c.user_id,
      NULL as display_name,
      NULL as avatar_url,
      COALESCE(MIN(c.created_at), now()) as created_at,
      now() as updated_at
    FROM public.conversations c
    WHERE c.user_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.user_id = c.user_id
      )
    GROUP BY c.user_id
    ON CONFLICT (user_id) DO NOTHING;

    -- conversations のデータを chat_groups に移行
    -- profiles が存在する user_id のみを移行
    INSERT INTO public.chat_groups (id, profile_id, title, created_at, updated_at, deleted_at)
    SELECT
      c.id,
      c.user_id as profile_id,
      c.title,
      c.created_at,
      c.updated_at,
      c.deleted_at
    FROM public.conversations c
    WHERE c.user_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.user_id = c.user_id
      )
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- 3. インデックス
CREATE INDEX IF NOT EXISTS idx_chat_groups_profile_id ON public.chat_groups (profile_id);
CREATE INDEX IF NOT EXISTS idx_chat_groups_deleted_at ON public.chat_groups (deleted_at);

-- 4. updated_at 自動更新トリガー
DROP TRIGGER IF EXISTS trg_chat_groups_updated_at ON public.chat_groups;
CREATE TRIGGER trg_chat_groups_updated_at
BEFORE UPDATE ON public.chat_groups
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 5. RLS の有効化
ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;

-- 6. RLS ポリシー
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

5. **「Run」** ボタンをクリック（または `Ctrl+Enter`）
6. エラーがないことを確認

---

## 手順 2: マイグレーション 2 を実行（chat_messages の作成）

1. SQL Editor で **「New query」** をクリック（新しいクエリを作成）
2. 以下の SQL をコピー＆ペーストして実行：

```sql
-- messages テーブルを chat_messages にリネームし、conversation_id を chat_group_id に変更
-- 既存のテーブルがある場合は、データを保持しながらリネーム

-- 1. 新しい chat_messages テーブルを作成
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_group_id            uuid NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  role                     public.message_role NOT NULL,
  content                  text NOT NULL,
  sequence_num             integer NOT NULL,
  response_to_message_id   uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  message_set_id           uuid,
  bubble_index             smallint,
  language_code            varchar(8) DEFAULT 'en',
  metadata_json            jsonb,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  deleted_at               timestamptz,

  CONSTRAINT uq_chat_messages_seq_per_group UNIQUE (chat_group_id, sequence_num)
);

-- 2. 既存の messages テーブルからデータを移行（存在する場合）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
    -- messages のデータを chat_messages に移行
    -- conversation_id を chat_group_id にマッピング
    INSERT INTO public.chat_messages (
      id, chat_group_id, role, content, sequence_num,
      response_to_message_id, message_set_id, bubble_index,
      language_code, metadata_json, created_at, updated_at, deleted_at
    )
    SELECT
      m.id,
      m.conversation_id as chat_group_id,  -- conversation_id は chat_groups.id と同じID
      m.role,
      m.content,
      m.sequence_num,
      m.response_to_message_id,
      m.message_set_id,
      m.bubble_index,
      m.language_code,
      m.metadata_json,
      m.created_at,
      m.updated_at,
      m.deleted_at
    FROM public.messages m
    WHERE EXISTS (
      SELECT 1 FROM public.chat_groups cg WHERE cg.id = m.conversation_id
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- 3. インデックス
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_group_id ON public.chat_messages (chat_group_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_response_to ON public.chat_messages (response_to_message_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_set ON public.chat_messages (message_set_id, bubble_index);
CREATE INDEX IF NOT EXISTS idx_chat_messages_deleted_at ON public.chat_messages (deleted_at);

-- 4. updated_at 自動更新トリガー
DROP TRIGGER IF EXISTS trg_chat_messages_updated_at ON public.chat_messages;
CREATE TRIGGER trg_chat_messages_updated_at
BEFORE UPDATE ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 5. RLS の有効化
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 6. RLS ポリシー
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

3. **「Run」** ボタンをクリック
4. エラーがないことを確認

---

## 手順 3: マイグレーション 3 を実行（bookmarks と tts_cache の更新）

1. SQL Editor で **「New query」** をクリック
2. 以下の SQL をコピー＆ペーストして実行：

```sql
-- bookmarks と tts_cache テーブルの参照先を chat_messages に更新

-- 1. bookmarks テーブルの外部キー制約を更新
DO $$
BEGIN
  -- 既存の外部キー制約を削除（存在する場合）
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
    AND table_name = 'bookmarks'
    AND constraint_name LIKE '%message_id%'
  ) THEN
    ALTER TABLE public.bookmarks
    DROP CONSTRAINT IF EXISTS bookmarks_message_id_fkey;
  END IF;

  -- 新しい外部キー制約を追加（chat_messages を参照）
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_messages') THEN
    ALTER TABLE public.bookmarks
    ADD CONSTRAINT bookmarks_message_id_fkey
    FOREIGN KEY (message_id)
    REFERENCES public.chat_messages(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- 2. tts_cache テーブルの外部キー制約を更新
DO $$
BEGIN
  -- 既存の外部キー制約を削除（存在する場合）
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
    AND table_name = 'tts_cache'
    AND constraint_name LIKE '%message_id%'
  ) THEN
    ALTER TABLE public.tts_cache
    DROP CONSTRAINT IF EXISTS tts_cache_message_id_fkey;
  END IF;

  -- 新しい外部キー制約を追加（chat_messages を参照）
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_messages') THEN
    ALTER TABLE public.tts_cache
    ADD CONSTRAINT tts_cache_message_id_fkey
    FOREIGN KEY (message_id)
    REFERENCES public.chat_messages(id)
    ON DELETE CASCADE;
  END IF;
END $$;
```

3. **「Run」** ボタンをクリック
4. エラーがないことを確認

---

## 手順 4: 確認

1. 左サイドバーから **「Table Editor」** をクリック
2. 以下のテーブルが表示されていることを確認：
   - ✅ `chat_groups` （新規作成）
   - ✅ `chat_messages` （新規作成）
   - ✅ `profiles`
   - ✅ `bookmarks`
   - ✅ `tts_cache`
   - ⚠️ `conversations` （まだ残っている - 後で削除可能）
   - ⚠️ `messages` （まだ残っている - 後で削除可能）

---

## 手順 5（オプション）: 古いテーブルを削除

**注意**: データの移行が正常に完了したことを確認してから実行してください。

1. SQL Editor で **「New query」** をクリック
2. 以下の SQL を実行：

```sql
-- 古いテーブルを削除（データ移行が完了した後）
-- 注意: この操作は取り消せません

-- messages テーブルを削除（chat_messages に移行済みの場合）
DROP TABLE IF EXISTS public.messages CASCADE;

-- conversations テーブルを削除（chat_groups に移行済みの場合）
DROP TABLE IF EXISTS public.conversations CASCADE;
```

3. **「Run」** ボタンをクリック

---

## トラブルシューティング

### エラーが発生した場合

1. エラーメッセージを確認
2. 該当するマイグレーションを修正
3. 再度実行

### データが移行されていない場合

SQL Editor で以下のクエリを実行して確認：

```sql
-- chat_groups のデータ数を確認
SELECT COUNT(*) as chat_groups_count FROM public.chat_groups;

-- chat_messages のデータ数を確認
SELECT COUNT(*) as chat_messages_count FROM public.chat_messages;

-- 旧テーブルのデータ数と比較
SELECT
  'conversations' as table_name,
  COUNT(*) as count
FROM public.conversations
UNION ALL
SELECT
  'chat_groups' as table_name,
  COUNT(*) as count
FROM public.chat_groups;
```
