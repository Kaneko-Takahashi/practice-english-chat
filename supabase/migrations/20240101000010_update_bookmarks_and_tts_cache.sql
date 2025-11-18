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

