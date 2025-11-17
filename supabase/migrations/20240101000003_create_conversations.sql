-- conversations テーブル（チャット単位）
CREATE TABLE IF NOT EXISTS public.conversations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations (user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_deleted_at ON public.conversations (deleted_at);

-- updated_at 自動更新トリガー
DROP TRIGGER IF EXISTS trg_conversations_updated_at ON public.conversations;
CREATE TRIGGER trg_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- RLS の有効化
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- 自分の会話を参照可能
DROP POLICY IF EXISTS "Read own conversations" ON public.conversations;
CREATE POLICY "Read own conversations"
ON public.conversations FOR SELECT
USING (user_id = auth.uid());

-- 自分の会話を変更可能（INSERT, UPDATE, DELETE）
DROP POLICY IF EXISTS "Modify own conversations" ON public.conversations;
CREATE POLICY "Modify own conversations"
ON public.conversations FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

