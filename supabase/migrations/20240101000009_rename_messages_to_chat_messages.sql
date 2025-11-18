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

