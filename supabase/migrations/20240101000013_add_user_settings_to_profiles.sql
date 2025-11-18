-- profiles テーブルにユーザー設定カラムを追加
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS learning_level text NOT NULL DEFAULT 'standard' CHECK (learning_level IN ('beginner', 'standard', 'advanced')),
ADD COLUMN IF NOT EXISTS tts_enabled boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS tts_speed text NOT NULL DEFAULT 'normal' CHECK (tts_speed IN ('slow', 'normal', 'fast')),
ADD COLUMN IF NOT EXISTS tts_voice text,
ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
ADD COLUMN IF NOT EXISTS font_size text NOT NULL DEFAULT 'medium' CHECK (font_size IN ('small', 'medium', 'large')),
ADD COLUMN IF NOT EXISTS allow_usage_analysis boolean NOT NULL DEFAULT false;

-- 既存のレコードにデフォルト値を設定（念のため）
UPDATE public.profiles
SET 
  learning_level = COALESCE(learning_level, 'standard'),
  tts_enabled = COALESCE(tts_enabled, true),
  tts_speed = COALESCE(tts_speed, 'normal'),
  theme = COALESCE(theme, 'light'),
  font_size = COALESCE(font_size, 'medium'),
  allow_usage_analysis = COALESCE(allow_usage_analysis, false)
WHERE 
  learning_level IS NULL 
  OR tts_enabled IS NULL 
  OR tts_speed IS NULL 
  OR theme IS NULL 
  OR font_size IS NULL 
  OR allow_usage_analysis IS NULL;

