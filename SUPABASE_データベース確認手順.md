# Supabase データベース確認手順

## 1. Supabase ダッシュボードにアクセス

1. [Supabase Dashboard](https://app.supabase.com/) にログイン
2. プロジェクトを選択

## 2. テーブルエディタで確認

### 2.1 テーブル一覧の確認

1. 左サイドバーから **「Table Editor」** をクリック
2. 以下のテーブルが存在するか確認：
   - `profiles` - ユーザープロファイル
   - `chat_groups` - チャットグループ（旧 `conversations`）
   - `chat_messages` - チャットメッセージ（旧 `messages`）
   - `bookmarks` - ブックマーク
   - `tts_cache` - 音声キャッシュ

### 2.2 各テーブルのデータ確認

各テーブルをクリックして、データが正しく移行されているか確認：

#### `profiles` テーブル

- `user_id` が `auth.users` の ID と一致しているか
- `conversations` に存在していた `user_id` に対応するレコードが作成されているか

#### `chat_groups` テーブル

- `profile_id` が `profiles.user_id` と一致しているか
- 旧 `conversations` テーブルのデータが正しく移行されているか

#### `chat_messages` テーブル

- `chat_group_id` が `chat_groups.id` と一致しているか
- 旧 `messages` テーブルのデータが正しく移行されているか

## 3. SQL エディタで確認

### 3.1 SQL エディタを開く

1. 左サイドバーから **「SQL Editor」** をクリック
2. **「New query」** をクリック

### 3.2 確認用クエリ

#### プロファイルとチャットグループの関係を確認

```sql
-- profiles と chat_groups の関係を確認
SELECT
  p.user_id,
  p.display_name,
  COUNT(cg.id) as chat_group_count
FROM public.profiles p
LEFT JOIN public.chat_groups cg ON cg.profile_id = p.user_id
GROUP BY p.user_id, p.display_name
ORDER BY chat_group_count DESC;
```

#### チャットグループとメッセージの関係を確認

```sql
-- chat_groups と chat_messages の関係を確認
SELECT
  cg.id as chat_group_id,
  cg.title,
  COUNT(cm.id) as message_count
FROM public.chat_groups cg
LEFT JOIN public.chat_messages cm ON cm.chat_group_id = cg.id
GROUP BY cg.id, cg.title
ORDER BY message_count DESC;
```

#### データ移行の整合性を確認

```sql
-- 旧テーブルと新テーブルのデータ数を比較
SELECT
  'conversations' as old_table,
  COUNT(*) as old_count
FROM public.conversations
UNION ALL
SELECT
  'chat_groups' as new_table,
  COUNT(*) as new_count
FROM public.chat_groups;
```

```sql
-- 旧テーブルと新テーブルのメッセージ数を比較
SELECT
  'messages' as old_table,
  COUNT(*) as old_count
FROM public.messages
UNION ALL
SELECT
  'chat_messages' as new_table,
  COUNT(*) as new_count
FROM public.chat_messages;
```

#### 外部キー制約の確認

```sql
-- chat_groups の profile_id が profiles に存在するか確認
SELECT
  cg.id,
  cg.profile_id,
  CASE
    WHEN p.user_id IS NULL THEN 'Missing profile'
    ELSE 'OK'
  END as status
FROM public.chat_groups cg
LEFT JOIN public.profiles p ON p.user_id = cg.profile_id
WHERE p.user_id IS NULL;
```

```sql
-- chat_messages の chat_group_id が chat_groups に存在するか確認
SELECT
  cm.id,
  cm.chat_group_id,
  CASE
    WHEN cg.id IS NULL THEN 'Missing chat_group'
    ELSE 'OK'
  END as status
FROM public.chat_messages cm
LEFT JOIN public.chat_groups cg ON cg.id = cm.chat_group_id
WHERE cg.id IS NULL;
```

## 4. マイグレーション履歴の確認

### 4.1 マイグレーション履歴を確認

1. 左サイドバーから **「Database」** → **「Migrations」** をクリック
2. 適用されたマイグレーションの一覧が表示されます
3. 以下のマイグレーションが適用されているか確認：
   - `20240101000008_rename_conversations_to_chat_groups.sql`
   - `20240101000009_rename_messages_to_chat_messages.sql`
   - `20240101000010_update_bookmarks_and_tts_cache.sql`

### 4.2 エラーの確認

マイグレーション履歴でエラーが表示されている場合は、エラーメッセージを確認して対処してください。

## 5. トラブルシューティング

### 5.1 マイグレーションを再実行する場合

エラーが発生した場合、以下の手順でマイグレーションを再実行できます：

1. **SQL Editor** を開く
2. 修正したマイグレーションファイルの内容をコピー
3. 新しいクエリとして実行

### 5.2 データの手動修正が必要な場合

外部キー制約違反が発生している場合、以下のクエリで不足しているデータを確認・作成できます：

```sql
-- profiles が存在しない user_id を確認
SELECT DISTINCT c.user_id
FROM public.conversations c
WHERE c.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = c.user_id
  );

-- 不足している profiles を手動で作成（必要に応じて）
INSERT INTO public.profiles (user_id, display_name, avatar_url, created_at, updated_at)
SELECT
  c.user_id,
  NULL as display_name,
  NULL as avatar_url,
  MIN(c.created_at) as created_at,
  now() as updated_at
FROM public.conversations c
WHERE c.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = c.user_id
  )
GROUP BY c.user_id
ON CONFLICT (user_id) DO NOTHING;
```

## 6. 確認チェックリスト

- [ ] `profiles` テーブルが存在し、データが正しく移行されている
- [ ] `chat_groups` テーブルが存在し、`conversations` のデータが正しく移行されている
- [ ] `chat_messages` テーブルが存在し、`messages` のデータが正しく移行されている
- [ ] 外部キー制約が正しく設定されている
- [ ] マイグレーション履歴にエラーがない
- [ ] データの整合性が保たれている（旧テーブルと新テーブルのデータ数が一致）
