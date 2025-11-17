-- ============================================================================
-- Lingo Leap シードデータ
-- ============================================================================
-- 
-- 使用方法:
-- 1. Supabase CLI: `supabase db reset` を実行すると自動的にシードが実行されます
-- 2. 手動実行: Supabase Dashboard の SQL Editor で実行
--
-- 注意事項:
-- - auth.users は Supabase が管理するため、直接 INSERT できません
-- - 実際のシード実行前に、テスト用ユーザーを auth.users に作成してください
-- - RLS が有効なため、適切なユーザーコンテキストで実行するか、
--   一時的に RLS を無効化してから実行してください
--
-- ============================================================================

-- 既存データのクリーンアップ（オプション）
-- TRUNCATE TABLE public.tts_cache CASCADE;
-- TRUNCATE TABLE public.bookmarks CASCADE;
-- TRUNCATE TABLE public.messages CASCADE;
-- TRUNCATE TABLE public.conversations CASCADE;
-- TRUNCATE TABLE public.profiles CASCADE;

-- ============================================================================
-- 1. テスト用ユーザーIDの設定
-- ============================================================================
-- 実際のシード実行時は、auth.users に作成したユーザーのIDをここに設定してください
-- 例: SELECT id FROM auth.users WHERE email = 'test@example.com' LIMIT 1;

-- テスト用の固定UUID（実際のユーザーIDに置き換えてください）
-- 以下のコマンドでUUIDを生成できます: SELECT gen_random_uuid();

DO $$
DECLARE
  -- テストユーザー1のID（実際のauth.usersのIDに置き換える）
  test_user_1_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  -- テストユーザー2のID（実際のauth.usersのIDに置き換える）
  test_user_2_id uuid := '00000000-0000-0000-0000-000000000002'::uuid;
  
  -- 会話ID
  conv_1_id uuid;
  conv_2_id uuid;
  conv_3_id uuid;
  
  -- メッセージID
  user_msg_1_id uuid;
  user_msg_2_id uuid;
  user_msg_3_id uuid;
  user_msg_4_id uuid;
  
  -- メッセージセットID（assistantの3バブル用）
  msg_set_1_id uuid := gen_random_uuid();
  msg_set_2_id uuid := gen_random_uuid();
  msg_set_3_id uuid := gen_random_uuid();
  msg_set_4_id uuid := gen_random_uuid();
  
  -- アシスタントメッセージID
  assistant_msg_1_1_id uuid;
  assistant_msg_1_2_id uuid;
  assistant_msg_1_3_id uuid;
  assistant_msg_2_1_id uuid;
  assistant_msg_2_2_id uuid;
  assistant_msg_2_3_id uuid;
  assistant_msg_3_1_id uuid;
  assistant_msg_3_2_id uuid;
  assistant_msg_3_3_id uuid;
  assistant_msg_4_1_id uuid;
  assistant_msg_4_2_id uuid;
  assistant_msg_4_3_id uuid;
BEGIN
  -- ============================================================================
  -- 2. profiles（ユーザープロファイル）
  -- ============================================================================
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES
    (test_user_1_id, 'Alice Johnson', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice')
  ON CONFLICT (user_id) DO UPDATE
    SET display_name = EXCLUDED.display_name,
        avatar_url = EXCLUDED.avatar_url;
  
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES
    (test_user_2_id, 'Bob Smith', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob')
  ON CONFLICT (user_id) DO UPDATE
    SET display_name = EXCLUDED.display_name,
        avatar_url = EXCLUDED.avatar_url;

  -- ============================================================================
  -- 3. conversations（会話）
  -- ============================================================================
  -- 会話1: 日常会話の練習
  INSERT INTO public.conversations (id, user_id, title, created_at)
  VALUES (
    gen_random_uuid(),
    test_user_1_id,
    'Daily Conversation Practice',
    now() - interval '3 days'
  )
  RETURNING id INTO conv_1_id;

  -- 会話2: ビジネス英語
  INSERT INTO public.conversations (id, user_id, title, created_at)
  VALUES (
    gen_random_uuid(),
    test_user_1_id,
    'Business English Discussion',
    now() - interval '2 days'
  )
  RETURNING id INTO conv_2_id;

  -- 会話3: 旅行会話
  INSERT INTO public.conversations (id, user_id, title, created_at)
  VALUES (
    gen_random_uuid(),
    test_user_2_id,
    'Travel Conversation',
    now() - interval '1 day'
  )
  RETURNING id INTO conv_3_id;

  -- ============================================================================
  -- 4. messages（メッセージ）
  -- ============================================================================
  
  -- 会話1のメッセージ
  -- User message 1
  INSERT INTO public.messages (
    id, conversation_id, role, content, sequence_num, language_code
  )
  VALUES (
    gen_random_uuid(),
    conv_1_id,
    'user',
    'Hi, how are you today?',
    1,
    'en'
  )
  RETURNING id INTO user_msg_1_id;

  -- Assistant response 1 (3 bubbles)
  INSERT INTO public.messages (
    id, conversation_id, role, content, sequence_num,
    response_to_message_id, message_set_id, bubble_index, language_code,
    metadata_json
  )
  VALUES
    (
      gen_random_uuid(),
      conv_1_id,
      'assistant',
      'Hello! I''m doing great, thank you for asking. How about you?',
      2,
      user_msg_1_id,
      msg_set_1_id,
      1,
      'en',
      '{"model": "gpt-4", "temperature": 0.7}'::jsonb
    ),
    (
      gen_random_uuid(),
      conv_1_id,
      'assistant',
      'I''m wonderful, thanks! How are things going with you today?',
      3,
      user_msg_1_id,
      msg_set_1_id,
      2,
      'en',
      '{"model": "gpt-4", "temperature": 0.7}'::jsonb
    ),
    (
      gen_random_uuid(),
      conv_1_id,
      'assistant',
      'I''m fantastic! How are you doing?',
      4,
      user_msg_1_id,
      msg_set_1_id,
      3,
      'en',
      '{"model": "gpt-4", "temperature": 0.7}'::jsonb
    )
  RETURNING id INTO assistant_msg_1_1_id, assistant_msg_1_2_id, assistant_msg_1_3_id;

  -- User message 2
  INSERT INTO public.messages (
    id, conversation_id, role, content, sequence_num, language_code
  )
  VALUES (
    gen_random_uuid(),
    conv_1_id,
    'user',
    'I''m good too! What did you do this weekend?',
    5,
    'en'
  )
  RETURNING id INTO user_msg_2_id;

  -- Assistant response 2 (3 bubbles)
  INSERT INTO public.messages (
    id, conversation_id, role, content, sequence_num,
    response_to_message_id, message_set_id, bubble_index, language_code,
    metadata_json
  )
  VALUES
    (
      gen_random_uuid(),
      conv_1_id,
      'assistant',
      'I had a relaxing weekend. I went hiking on Saturday and spent Sunday reading at home. What about you?',
      6,
      user_msg_2_id,
      msg_set_2_id,
      1,
      'en',
      '{"model": "gpt-4", "temperature": 0.7}'::jsonb
    ),
    (
      gen_random_uuid(),
      conv_1_id,
      'assistant',
      'I enjoyed a quiet weekend. On Saturday, I visited a local museum, and on Sunday, I caught up with some friends over coffee. How was your weekend?',
      7,
      user_msg_2_id,
      msg_set_2_id,
      2,
      'en',
      '{"model": "gpt-4", "temperature": 0.7}'::jsonb
    ),
    (
      gen_random_uuid(),
      conv_1_id,
      'assistant',
      'It was lovely! I went to the beach on Saturday and had a barbecue with family on Sunday. Did you do anything special?',
      8,
      user_msg_2_id,
      msg_set_2_id,
      3,
      'en',
      '{"model": "gpt-4", "temperature": 0.7}'::jsonb
    );

  -- 会話2のメッセージ
  -- User message 3
  INSERT INTO public.messages (
    id, conversation_id, role, content, sequence_num, language_code
  )
  VALUES (
    gen_random_uuid(),
    conv_2_id,
    'user',
    'I need to prepare for a job interview next week. Can you help me practice?',
    1,
    'en'
  )
  RETURNING id INTO user_msg_3_id;

  -- Assistant response 3 (3 bubbles)
  INSERT INTO public.messages (
    id, conversation_id, role, content, sequence_num,
    response_to_message_id, message_set_id, bubble_index, language_code,
    metadata_json
  )
  VALUES
    (
      gen_random_uuid(),
      conv_2_id,
      'assistant',
      'Absolutely! I''d be happy to help you practice. Let''s start with common interview questions. Can you tell me about yourself?',
      2,
      user_msg_3_id,
      msg_set_3_id,
      1,
      'en',
      '{"model": "gpt-4", "temperature": 0.7}'::jsonb
    ),
    (
      gen_random_uuid(),
      conv_2_id,
      'assistant',
      'Of course! Let''s practice together. First, could you introduce yourself briefly? This is a typical opening question in interviews.',
      3,
      user_msg_3_id,
      msg_set_3_id,
      2,
      'en',
      '{"model": "gpt-4", "temperature": 0.7}'::jsonb
    ),
    (
      gen_random_uuid(),
      conv_2_id,
      'assistant',
      'I''d love to help! Let''s begin with a self-introduction. Please tell me about your background and why you''re interested in this position.',
      4,
      user_msg_3_id,
      msg_set_3_id,
      3,
      'en',
      '{"model": "gpt-4", "temperature": 0.7}'::jsonb
    );

  -- 会話3のメッセージ
  -- User message 4
  INSERT INTO public.messages (
    id, conversation_id, role, content, sequence_num, language_code
  )
  VALUES (
    gen_random_uuid(),
    conv_3_id,
    'user',
    'I''m planning a trip to Japan. What should I know?',
    1,
    'en'
  )
  RETURNING id INTO user_msg_4_id;

  -- Assistant response 4 (3 bubbles)
  INSERT INTO public.messages (
    id, conversation_id, role, content, sequence_num,
    response_to_message_id, message_set_id, bubble_index, language_code,
    metadata_json
  )
  VALUES
    (
      gen_random_uuid(),
      conv_3_id,
      'assistant',
      'That sounds exciting! Japan is a wonderful destination. You should know that Japanese people value politeness and respect. Learning basic phrases like "arigatou gozaimasu" (thank you) will be appreciated.',
      2,
      user_msg_4_id,
      msg_set_4_id,
      1,
      'en',
      '{"model": "gpt-4", "temperature": 0.7}'::jsonb
    ),
    (
      gen_random_uuid(),
      conv_3_id,
      'assistant',
      'Great choice! Japan offers amazing experiences. Important tips: carry cash as many places don''t accept cards, learn to use chopsticks, and always remove your shoes when entering homes or certain restaurants.',
      3,
      user_msg_4_id,
      msg_set_4_id,
      2,
      'en',
      '{"model": "gpt-4", "temperature": 0.7}'::jsonb
    ),
    (
      gen_random_uuid(),
      conv_3_id,
      'assistant',
      'How exciting! Japan is beautiful. Key things to remember: the public transportation system is excellent, try the local cuisine like sushi and ramen, and be mindful of cultural customs like bowing when greeting people.',
      4,
      user_msg_4_id,
      msg_set_4_id,
      3,
      'en',
      '{"model": "gpt-4", "temperature": 0.7}'::jsonb
    )
  RETURNING id INTO assistant_msg_4_1_id, assistant_msg_4_2_id, assistant_msg_4_3_id;

  -- ============================================================================
  -- 5. bookmarks（ブックマーク）
  -- ============================================================================
  INSERT INTO public.bookmarks (id, user_id, message_id, note, created_at)
  VALUES
    (
      gen_random_uuid(),
      test_user_1_id,
      assistant_msg_1_1_id,
      'Useful greeting phrase',
      now() - interval '2 days'
    ),
    (
      gen_random_uuid(),
      test_user_1_id,
      assistant_msg_1_2_id,
      'Alternative way to ask how someone is',
      now() - interval '2 days'
    ),
    (
      gen_random_uuid(),
      test_user_2_id,
      assistant_msg_4_1_id,
      'Japan travel tips - politeness',
      now() - interval '1 day'
    ),
    (
      gen_random_uuid(),
      test_user_2_id,
      assistant_msg_4_2_id,
      'Japan travel tips - cash and customs',
      now() - interval '1 day'
    );

  -- ============================================================================
  -- 6. tts_cache（TTS音声キャッシュ）
  -- ============================================================================
  -- メッセージ1のTTSキャッシュ（GCP）
  INSERT INTO public.tts_cache (
    id, message_id, provider, voice, audio_mime_type,
    storage_key, hash_key, expires_at
  )
  VALUES
    (
      gen_random_uuid(),
      assistant_msg_1_1_id,
      'gcp',
      'en-US-Neural2-C',
      'audio/mpeg',
      'tts/gcp/en-US-Neural2-C/' || assistant_msg_1_1_id || '.mp3',
      md5(assistant_msg_1_1_id::text || 'gcp' || 'en-US-Neural2-C'),
      now() + interval '30 days'
    ),
    (
      gen_random_uuid(),
      assistant_msg_1_1_id,
      'azure',
      'en-US-AriaNeural',
      'audio/mpeg',
      'tts/azure/en-US-AriaNeural/' || assistant_msg_1_1_id || '.mp3',
      md5(assistant_msg_1_1_id::text || 'azure' || 'en-US-AriaNeural'),
      now() + interval '30 days'
    ),
    (
      gen_random_uuid(),
      assistant_msg_4_1_id,
      'gcp',
      'en-US-Neural2-C',
      'audio/mpeg',
      'tts/gcp/en-US-Neural2-C/' || assistant_msg_4_1_id || '.mp3',
      md5(assistant_msg_4_1_id::text || 'gcp' || 'en-US-Neural2-C'),
      now() + interval '30 days'
    );

END $$;

-- ============================================================================
-- シード完了メッセージ
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'シードデータの作成が完了しました。';
  RAISE NOTICE '注意: 実際のauth.usersにユーザーを作成し、上記のtest_user_1_idとtest_user_2_idを実際のIDに置き換えてください。';
END $$;

