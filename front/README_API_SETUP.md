# 🚀 AI API キーの設定手順

チャット機能を使用するには、AI API キーの設定が必要です。

## 📋 セットアップ手順（OpenAI 推奨）

### 1. OpenAI API キーを取得

1. [OpenAI API Keys](https://platform.openai.com/api-keys)にアクセス
2. ログインまたは新規登録
3. "Create new secret key"をクリック
4. キーをコピー（この画面を閉じると二度と表示されません）

### 2. 環境変数ファイルを作成

`front`ディレクトリに`.env.local`ファイルを作成：

**Windows (PowerShell):**

```powershell
cd front
New-Item .env.local
```

**Mac/Linux:**

```bash
cd front
touch .env.local
```

### 3. 環境変数を設定

`.env.local`ファイルを開き、以下を追加：

```env
# Supabase設定（既存の値をそのまま使用）
NEXT_PUBLIC_SUPABASE_URL=your_existing_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_existing_key

# AI設定
AI_PROVIDER=openai
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxx
```

⚠️ **重要**: `OPENAI_API_KEY`の値を、手順 1 で取得した API キーに置き換えてください。

### 4. 開発サーバーを再起動

```bash
# サーバーを停止（Ctrl+C）
# 再起動
yarn dev
```

## ✅ 動作確認

1. http://localhost:3001/chat にアクセス
2. 入力欄に「おすすめの料理は何ですか？」と入力
3. AI が 3 つの英語表現を返せば成功！🎉

## 🔧 代替オプション: Google Gemini

OpenAI の代わりに Google Gemini を使用する場合：

### 1. Google AI API キーを取得

1. [Google AI Studio](https://makersuite.google.com/app/apikey)にアクセス
2. "Get API key"をクリック
3. API キーをコピー

### 2. 環境変数を設定

`.env.local`ファイル:

```env
AI_PROVIDER=google
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key_here
```

## ❌ トラブルシューティング

### エラー: "AI API キーが設定されていません"

- `.env.local`ファイルが`front`ディレクトリに存在するか確認
- ファイル内の環境変数が正しく設定されているか確認
- **開発サーバーを必ず再起動**

### エラー: "500 Internal Server Error"

1. API キーが有効か確認:

   - OpenAI: https://platform.openai.com/account/usage
   - Google: API キーの有効化を確認

2. ターミナルのログを確認:

   ```
   Chat API: Request received
   Chat API: Provider: openai API Key exists: true
   ```

3. API キーに十分なクレジットがあるか確認

### エラー: "append available: false"

これは内部の状態で、エラーの原因ではありません。フォールバック処理が正常に動作しています。

## 💰 料金について

### OpenAI

- **GPT-4o-mini** (デフォルト): 1,000 リクエストで約$0.15 ～$0.60
- 無料トライアルクレジット: $5（新規ユーザー）
- [料金詳細](https://openai.com/pricing)

### Google Gemini

- **Gemini 1.5 Flash** (デフォルト): 無料枠あり
- [料金詳細](https://ai.google.dev/pricing)

## 📚 関連ドキュメント

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Google AI Documentation](https://ai.google.dev/docs)

## 🆘 それでも解決しない場合

開発サーバーのターミナルログをコピーして、Issue を作成してください。
