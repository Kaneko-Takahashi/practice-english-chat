-- study_logs テーブルの event_type に quiz_play を追加

-- 既存の CHECK 制約を削除
ALTER TABLE public.study_logs
DROP CONSTRAINT IF EXISTS study_logs_event_type_check;

-- 新しい CHECK 制約を追加（quiz_play を含む）
ALTER TABLE public.study_logs
ADD CONSTRAINT study_logs_event_type_check
CHECK (event_type IN ('chat_send', 'audio_play', 'bookmark_add', 'bookmark_remove', 'quiz_play'));

-- 既存のデータに影響を与えないことを確認
COMMENT ON COLUMN public.study_logs.event_type IS 
'イベントの種類: chat_send（チャット送信）, audio_play（音声再生）, bookmark_add（ブックマーク追加）, bookmark_remove（ブックマーク削除）, quiz_play（クイズプレイ）';

