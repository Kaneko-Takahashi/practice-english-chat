-- message_role ENUM 型の作成
DO $$ BEGIN
  CREATE TYPE public.message_role AS ENUM ('user', 'assistant', 'system');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

