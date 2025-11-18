# 環境変数の設定方法

## 必要な環境変数

チャット機能を使用するには、AI API キーを設定する必要があります。

## セットアップ手順

1. `.env.local.example`ファイルをコピーして`.env.local`を作成：

   ```bash
   cp .env.local.example .env.local
   ```

2. `.env.local`ファイルを開き、以下の値を設定：

### OpenAI を使用する場合（推奨）

```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...your_api_key_here
```

- [OpenAI API Keys](https://platform.openai.com/api-keys)で API キーを取得

### Google Gemini を使用する場合

```env
AI_PROVIDER=google
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
```

- [Google AI Studio](https://makersuite.google.com/app/apikey)で API キーを取得

## 設定後

1. 開発サーバーを再起動：

   ```bash
   yarn dev
   ```

2. ブラウザで http://localhost:3001/chat にアクセス

3. チャット入力欄に日本語で学びたい内容を入力

## トラブルシューティング

### "AI API キーが設定されていません" エラーが出る場合

- `.env.local`ファイルが存在するか確認
- ファイル内の環境変数が正しく設定されているか確認
- 開発サーバーを再起動

### "500 Internal Server Error" が出る場合

- API キーが有効か確認
- OpenAI の場合: https://platform.openai.com/account/usage で使用状況を確認
- Google Gemini の場合: API Key が有効化されているか確認

### コンソールでエラーを確認

開発サーバーのターミナルに詳細なエラーログが表示されます。

```bash
# ログを確認
Chat API: Request received
Chat API: Provider: openai API Key exists: true
```
