-- bookmarks テーブル（ブックマーク）
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id      uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  note            text, -- 任意メモ
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_bookmarks_user_message UNIQUE (user_id, message_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON public.bookmarks (user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_message_id ON public.bookmarks (message_id);

-- RLS の有効化
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- 自分のブックマークを参照可能
DROP POLICY IF EXISTS "Read own bookmarks" ON public.bookmarks;
CREATE POLICY "Read own bookmarks"
ON public.bookmarks FOR SELECT
USING (user_id = auth.uid());

-- 自分のブックマークを変更可能（INSERT, UPDATE, DELETE）
DROP POLICY IF EXISTS "Modify own bookmarks" ON public.bookmarks;
CREATE POLICY "Modify own bookmarks"
ON public.bookmarks FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

