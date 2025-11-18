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

