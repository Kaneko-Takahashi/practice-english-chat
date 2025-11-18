-- 学習ログテーブルの作成
CREATE TABLE IF NOT EXISTS public.study_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('chat_send', 'audio_play', 'bookmark_add', 'bookmark_remove')),
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

-- RLSポリシー: ユーザーは自分のログのみ削除可能（オプション）
CREATE POLICY "Users can delete their own study logs"
  ON public.study_logs
  FOR DELETE
  USING (auth.uid() = user_id);

-- コメント
COMMENT ON TABLE public.study_logs IS '学習履歴ログテーブル: ユーザーの学習活動を記録';
COMMENT ON COLUMN public.study_logs.event_type IS 'イベント種別: chat_send, audio_play, bookmark_add, bookmark_remove';
COMMENT ON COLUMN public.study_logs.learning_level IS 'イベント発生時の学習レベル';
COMMENT ON COLUMN public.study_logs.metadata IS '追加情報（JSON形式）: message_id, audio_speed, expression_text など';

