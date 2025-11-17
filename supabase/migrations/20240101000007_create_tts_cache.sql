-- tts_cache テーブル（音声キャッシュ）
CREATE TABLE IF NOT EXISTS public.tts_cache (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id      uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  provider        text NOT NULL,     -- 例: 'gcp', 'azure', 'aws'
  voice           text NOT NULL,     -- 例: 'en-US-Neural2-C'
  audio_mime_type text NOT NULL,     -- 例: 'audio/mpeg'
  storage_key     text NOT NULL,     -- オブジェクトストレージのキー/URL
  hash_key        text NOT NULL,     -- 重複排除用（message_id + provider + voice などのハッシュ）
  expires_at      timestamptz,       -- 期限（任意）
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_tts_cache_hash UNIQUE (hash_key)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_tts_cache_message_id ON public.tts_cache (message_id);
CREATE INDEX IF NOT EXISTS idx_tts_cache_provider_voice ON public.tts_cache (provider, voice);

