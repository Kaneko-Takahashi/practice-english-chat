This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Favicon の生成

最適化された favicon を生成するには、以下の手順を実行してください。

### 前提条件

- Python 3.x がインストールされていること
- Pillow (PIL) ライブラリがインストールされていること

```bash
# Pillow をインストール（必要な場合）
pip install Pillow
```

### 手順

1. ソース画像を配置
   - `front/public/icon-source.png` に元となる画像を配置してください
   - 画像は正方形推奨（円形のアイコンが中心にあることが前提）

2. スクリプトを実行
   ```bash
   cd front
   python tools/generate_favicon.py
   ```

3. 生成されるファイル
   - `front/public/favicon-16x16.png` (16x16)
   - `front/public/favicon-32x32.png` (32x32)
   - `front/public/icon.png` (512x512)
   - `front/public/apple-touch-icon.png` (180x180)
   - `front/public/favicon.ico` (16, 32, 48 を含む)

4. キャッシュバスターの更新
   - `front/app/layout.tsx` の `metadata.icons` 内の `?v=` パラメータを更新してください
   - 例: `?v=20251216_2` → `?v=20251216_3`

### 生成される favicon の特徴

- 中心基準で 1.2倍拡大してクローズアップ（円がキャンバスをほぼ埋める）
- 円形マスクを適用して円の外側を透明化（タブで□っぽく見えないように）
- 16/32/48px 用に最適化
