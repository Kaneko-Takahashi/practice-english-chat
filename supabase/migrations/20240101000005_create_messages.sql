-- messages テーブル（発話）
CREATE TABLE IF NOT EXISTS public.messages (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id          uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role                     public.message_role NOT NULL,
  content                  text NOT NULL,
  sequence_num             integer NOT NULL,
  response_to_message_id   uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  message_set_id           uuid,       -- 同一応答セット識別子（assistant のみ想定）
  bubble_index             smallint,   -- 1..3（assistant のみ想定）
  language_code            varchar(8) DEFAULT 'en', -- ISO-639 + 地域を想定
  metadata_json            jsonb,      -- モデル名/プロンプト設定/スコア等の拡張
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  deleted_at               timestamptz,

  CONSTRAINT uq_messages_seq_per_conv UNIQUE (conversation_id, sequence_num)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_response_to ON public.messages (response_to_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_set ON public.messages (message_set_id, bubble_index);
CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON public.messages (deleted_at);

-- updated_at 自動更新トリガー
DROP TRIGGER IF EXISTS trg_messages_updated_at ON public.messages;
CREATE TRIGGER trg_messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- RLS の有効化
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 自分の会話のメッセージを参照可能
DROP POLICY IF EXISTS "Read own messages" ON public.messages;
CREATE POLICY "Read own messages"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations.user_id = auth.uid()
    AND conversations.deleted_at IS NULL
  )
);

-- 自分の会話のメッセージを変更可能（INSERT, UPDATE, DELETE）
DROP POLICY IF EXISTS "Modify own messages" ON public.messages;
CREATE POLICY "Modify own messages"
ON public.messages FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations.user_id = auth.uid()
    AND conversations.deleted_at IS NULL
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations.user_id = auth.uid()
    AND conversations.deleted_at IS NULL
  )
);

