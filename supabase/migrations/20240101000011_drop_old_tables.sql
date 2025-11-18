-- 古いテーブルを削除（データ移行が完了した後）
-- 注意: このマイグレーションは、データ移行が正常に完了したことを確認してから実行してください

-- 1. 依存関係を確認してから古いテーブルを削除
DO $$
BEGIN
  -- messages テーブルを削除（chat_messages に移行済みの場合）
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
    -- 外部キー制約を削除
    ALTER TABLE public.bookmarks DROP CONSTRAINT IF EXISTS bookmarks_message_id_fkey;
    ALTER TABLE public.tts_cache DROP CONSTRAINT IF EXISTS tts_cache_message_id_fkey;
    
    -- messages テーブルを削除
    DROP TABLE IF EXISTS public.messages CASCADE;
  END IF;

  -- conversations テーブルを削除（chat_groups に移行済みの場合）
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversations') THEN
    -- conversations テーブルを削除
    DROP TABLE IF EXISTS public.conversations CASCADE;
  END IF;
END $$;

