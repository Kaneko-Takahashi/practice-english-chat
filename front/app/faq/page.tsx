"use client";

import { useState } from "react";
import Link from "next/link";

type FAQItem = {
  question: string;
  answer: string | React.ReactNode;
};

type FAQCategory = {
  id: string;
  title: string;
  icon: string;
  questions: FAQItem[];
};

const faqData: FAQCategory[] = [
  {
    id: "basics",
    title: "基本的な使い方",
    icon: "📚",
    questions: [
      {
        question: "Lingo Leapとは何ですか？",
        answer:
          "Lingo LeapはAIとの対話を通じて英語を学習できるWebアプリケーションです。AIがあなたの学びたい内容に応じた英語表現を提案し、音声再生やブックマーク機能で効果的な学習をサポートします。",
      },
      {
        question: "どのように学習を始めればいいですか？",
        answer:
          "ログイン後、チャット画面で学びたい内容を日本語で入力してください。例えば「レストランで注文する」と入力すると、AIが3つの英語表現を提案します。",
      },
      {
        question: "AIチャットの使い方を教えてください",
        answer: (
          <ol className="list-decimal list-inside space-y-1">
            <li>チャット画面の入力欄に学びたいシチュエーションを入力</li>
            <li>AIが3つの異なる英語表現を提案</li>
            <li>音声アイコンで発音を確認</li>
            <li>気に入った表現はブックマークで保存</li>
          </ol>
        ),
      },
      {
        question: "音声再生機能はどう使いますか？",
        answer:
          "各英語表現の横にある音声アイコン（🔊）をクリックすると、ネイティブスピーカーの発音が再生されます。再生速度や声の種類は設定画面で変更できます。",
      },
      {
        question: "ブックマーク機能の使い方は？",
        answer:
          "各英語表現のブックマークアイコン（🔖）をクリックすると保存されます。保存した表現は「ブックマーク一覧」ページで後から確認・復習できます。",
      },
    ],
  },
  {
    id: "learning",
    title: "学習機能について",
    icon: "🎯",
    questions: [
      {
        question:
          "学習レベル（やさしい/ふつう/チャレンジ）はどう選べばいいですか？",
        answer: (
          <div className="space-y-2">
            <p>
              <strong className="text-indigo-600 dark:text-indigo-400">
                やさしい
              </strong>
              : 英語初心者向け。基本的な単語と簡単な文法
            </p>
            <p>
              <strong className="text-indigo-600 dark:text-indigo-400">
                ふつう
              </strong>
              : 日常会話レベル。一般的な表現
            </p>
            <p>
              <strong className="text-indigo-600 dark:text-indigo-400">
                チャレンジ
              </strong>
              : ビジネスやフォーマルな場面。洗練された表現
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              設定ページで変更できます。まずは「ふつう」から始めて、自分に合ったレベルを見つけてください。
            </p>
          </div>
        ),
      },
      {
        question: "学習履歴はどこで確認できますか？",
        answer:
          "サイドバーの「学習履歴」をクリックすると、あなたの学習活動をグラフで確認できます。チャット送信回数、音声再生回数、ブックマーク件数などが可視化されます。",
      },
      {
        question: "クイズ／ゲーム機能の遊び方は？",
        answer: (
          <ol className="list-decimal list-inside space-y-1">
            <li>サイドバーから「クイズ／ゲーム」をクリック</li>
            <li>難易度を選択（その場で一時的に変更可能）</li>
            <li>「ゲームを開始」ボタンをクリック</li>
            <li>シャッフルされた単語を正しい順番に並び替え</li>
            <li>各問題30秒以内に回答</li>
          </ol>
        ),
      },
      {
        question: "音声の速度や声の種類は変更できますか？",
        answer: (
          <div className="space-y-2">
            <p>はい、設定ページの「音声設定」で以下を変更できます：</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                読み上げ速度：ゆっくり（0.7倍速）/ ふつう（1.0倍速）/
                はやい（1.3倍速）
              </li>
              <li>声のタイプ：デフォルト / 女性1 / 男性1</li>
            </ul>
          </div>
        ),
      },
    ],
  },
  {
    id: "settings",
    title: "設定について",
    icon: "⚙️",
    questions: [
      {
        question: "設定はどこから変更できますか？",
        answer:
          "サイドバーの「設定」をクリックすると、学習レベル、音声、テーマ、学習履歴の記録設定を変更できます。",
      },
      {
        question: "ダークモードに切り替えるには？",
        answer:
          "設定ページの「テーマ」セクションで「ダーク」を選択し、「保存」ボタンをクリックしてください。",
      },
      {
        question: "学習履歴の記録を無効にするには？",
        answer:
          "設定ページの「学習履歴の記録設定」で「学習活動を記録する」のチェックを外して保存してください。無効にしても過去のデータは閲覧できます。",
      },
      {
        question: "パスワードを変更したい",
        answer:
          "マイページ（プロフィール画面）のパスワード変更フォームから変更できます。セキュリティのため、現在のパスワードの入力が必要です。",
      },
    ],
  },
  {
    id: "auth",
    title: "アカウント・認証",
    icon: "🔐",
    questions: [
      {
        question: "アカウントの作成方法は？",
        answer:
          "トップページの「新規登録」ボタンから、メールアドレスとパスワードを入力して登録できます。",
      },
      {
        question: "Googleアカウントでログインできますか？",
        answer:
          "はい、ログイン画面の「Googleでログイン」ボタンからGoogleアカウントでログイン・新規登録が可能です。",
      },
      {
        question: "パスワードを忘れた場合は？",
        answer:
          "ログイン画面の「パスワードを忘れた方」リンクから、登録済みメールアドレスにパスワードリセットリンクを送信できます。",
      },
      {
        question: "アカウントを削除したい",
        answer:
          "現在、アカウント削除機能は準備中です。削除をご希望の場合は、運営チームまでお問い合わせください。",
      },
    ],
  },
  {
    id: "privacy",
    title: "データ・プライバシー",
    icon: "💾",
    questions: [
      {
        question: "学習データは保存されますか？",
        answer:
          "はい、ブックマークした表現やチャット履歴はデータベースに保存されます。学習活動のログは設定で記録を有効にしている場合のみ保存されます。",
      },
      {
        question: "学習履歴の記録は何に使われますか？",
        answer:
          "あなた自身の学習進捗を可視化するために使用されます。「学習履歴」ページでグラフとして確認でき、モチベーション向上に役立ちます。",
      },
      {
        question: "他のユーザーに自分のデータは見られますか？",
        answer:
          "いいえ。データベースのRow Level Security（RLS）により、あなたのデータはあなた自身しかアクセスできません。",
      },
      {
        question: "データを削除できますか？",
        answer:
          "ブックマークは「ブックマーク一覧」ページから個別に削除できます。学習ログの一括削除機能は今後追加予定です。",
      },
    ],
  },
  {
    id: "troubleshooting",
    title: "トラブルシューティング",
    icon: "🔧",
    questions: [
      {
        question: "音声が再生されない",
        answer: (
          <ol className="list-decimal list-inside space-y-1">
            <li>設定ページで「読み上げを有効にする」がONになっているか確認</li>
            <li>ブラウザの音量設定を確認</li>
            <li>
              ブラウザがWeb Speech
              APIに対応しているか確認（Chrome、Safari、Edge推奨）
            </li>
            <li>ページを再読み込みしてみてください</li>
          </ol>
        ),
      },
      {
        question: "ブックマークが保存されない",
        answer: (
          <ol className="list-decimal list-inside space-y-1">
            <li>ログインしているか確認してください</li>
            <li>
              メッセージがストリーミング中（表示中）の場合は、完全に表示されるまで待ってください
            </li>
            <li>
              ブラウザを再読み込みしても解決しない場合は、しばらく時間をおいて再試行してください
            </li>
          </ol>
        ),
      },
      {
        question: "AIの応答が遅い／表示されない",
        answer: (
          <ol className="list-decimal list-inside space-y-1">
            <li>インターネット接続を確認してください</li>
            <li>ブラウザを再読み込みしてください</li>
            <li>
              一時的なサーバー混雑の可能性があります。しばらく時間をおいて再試行してください
            </li>
          </ol>
        ),
      },
      {
        question: "ログインできない",
        answer: (
          <ol className="list-decimal list-inside space-y-1">
            <li>メールアドレスとパスワードが正しいか確認</li>
            <li>
              パスワードを忘れた場合は「パスワードを忘れた方」リンクからリセット
            </li>
            <li>Cookieがブロックされていないか確認</li>
          </ol>
        ),
      },
      {
        question: "クイズの問題が生成されない",
        answer: (
          <ol className="list-decimal list-inside space-y-1">
            <li>ログインしているか確認</li>
            <li>インターネット接続を確認</li>
            <li>ブラウザを再読み込みして再試行</li>
            <li>問題が解決しない場合は、別のブラウザで試してみてください</li>
          </ol>
        ),
      },
    ],
  },
];

function FAQAccordion({ category }: { category: FAQCategory }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="mb-8">
      <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-100">
        <span className="text-2xl">{category.icon}</span>
        {category.title}
      </h3>
      <div className="space-y-3">
        {category.questions.map((item, index) => (
          <div
            key={index}
            className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800"
          >
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full px-5 py-4 text-left flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              aria-expanded={openIndex === index}
            >
              <span className="font-medium text-slate-900 dark:text-slate-100 pr-4">
                {item.question}
              </span>
              <span
                className={`text-slate-500 dark:text-slate-400 transition-transform ${
                  openIndex === index ? "rotate-180" : ""
                }`}
              >
                ▼
              </span>
            </button>
            {openIndex === index && (
              <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                <div className="text-slate-700 dark:text-slate-300">
                  {typeof item.answer === "string" ? (
                    <p>{item.answer}</p>
                  ) : (
                    item.answer
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
            FAQ・サポート
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Lingo Leapの使い方とヘルプ
          </p>
        </div>

        {/* よくある質問 */}
        <section className="mb-12">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
              📋 よくある質問（FAQ）
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              カテゴリ別によくある質問と回答をまとめました。質問をクリックすると回答が表示されます。
            </p>
          </div>
          {faqData.map((category) => (
            <FAQAccordion key={category.id} category={category} />
          ))}
        </section>

        {/* 使い方ガイド */}
        <section className="mb-12 bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6 sm:p-8 border border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">
            📖 使い方ガイド
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-3">
                はじめてのチャット
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-slate-700 dark:text-slate-300">
                <li>ログイン後、チャット画面が表示されます</li>
                <li>
                  学びたい内容を入力（例：「レストランで注文する」「道を尋ねる」）
                </li>
                <li>AIが3つの英語表現を提案します</li>
                <li>音声アイコン（🔊）で発音を確認できます</li>
                <li>
                  気に入った表現はブックマークアイコン（🔖）をクリックして保存しましょう
                </li>
              </ol>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-3">
                効果的な学習方法
              </h3>
              <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
                <li>
                  <strong>毎日少しずつ</strong>: 毎日5分でも続けることが大切です
                </li>
                <li>
                  <strong>音声を活用</strong>:
                  音声機能を使って発音を何度も確認しましょう
                </li>
                <li>
                  <strong>ブックマークで復習</strong>:
                  ブックマークした表現を定期的に復習しましょう
                </li>
                <li>
                  <strong>ゲームで定着</strong>:
                  クイズ／ゲームで楽しく復習できます
                </li>
                <li>
                  <strong>進捗を確認</strong>:
                  学習履歴ページで進捗を確認してモチベーションアップ
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* 機能一覧 */}
        <section className="mb-12 bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6 sm:p-8 border border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">
            🛠️ 主な機能
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="pb-3 pr-4 font-semibold text-slate-800 dark:text-slate-100">
                    機能
                  </th>
                  <th className="pb-3 pr-4 font-semibold text-slate-800 dark:text-slate-100">
                    説明
                  </th>
                  <th className="pb-3 font-semibold text-slate-800 dark:text-slate-100">
                    ページ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                <tr>
                  <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-100">
                    AIチャット
                  </td>
                  <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">
                    AIとの対話で英語表現を学習
                  </td>
                  <td className="py-3">
                    <Link
                      href="/"
                      className="text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      /
                    </Link>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-100">
                    ブックマーク
                  </td>
                  <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">
                    お気に入りの表現を保存・管理
                  </td>
                  <td className="py-3">
                    <Link
                      href="/bookmarks"
                      className="text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      /bookmarks
                    </Link>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-100">
                    音声再生
                  </td>
                  <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">
                    ネイティブ発音を確認
                  </td>
                  <td className="py-3 text-slate-600 dark:text-slate-400">
                    チャット画面
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-100">
                    クイズ／ゲーム
                  </td>
                  <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">
                    英語並び替えゲーム（10問）
                  </td>
                  <td className="py-3">
                    <Link
                      href="/quiz"
                      className="text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      /quiz
                    </Link>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-100">
                    学習履歴
                  </td>
                  <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">
                    進捗をグラフで可視化
                  </td>
                  <td className="py-3">
                    <Link
                      href="/history"
                      className="text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      /history
                    </Link>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-100">
                    設定
                  </td>
                  <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">
                    レベル・音声・テーマをカスタマイズ
                  </td>
                  <td className="py-3">
                    <Link
                      href="/settings"
                      className="text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      /settings
                    </Link>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-100">
                    マイページ
                  </td>
                  <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">
                    プロフィール・パスワード変更
                  </td>
                  <td className="py-3">
                    <Link
                      href="/profile"
                      className="text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      /profile
                    </Link>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 更新履歴 */}
        <section className="mb-12 bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6 sm:p-8 border border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">
            🎉 更新履歴・新機能
          </h2>
          <div className="text-slate-600 dark:text-slate-400">
            <p className="mb-4 font-medium">最近の更新</p>
            <p className="text-sm italic">（運用時に追記予定）</p>
          </div>
        </section>

        {/* 動作環境 */}
        <section className="mb-12 bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6 sm:p-8 border border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">
            💻 動作環境
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-3">
                推奨ブラウザ
              </h3>
              <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                <li>Google Chrome（最新版）</li>
                <li>Safari（最新版）</li>
                <li>Microsoft Edge（最新版）</li>
                <li>Firefox（最新版）</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-3">
                対応デバイス
              </h3>
              <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                <li>デスクトップPC（Windows, Mac, Linux）</li>
                <li>タブレット（iPad, Android）</li>
                <li>スマートフォン（iOS, Android）</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-3">
                音声機能の利用について
              </h3>
              <p className="text-slate-700 dark:text-slate-300 mb-2">
                ブラウザの音声合成機能（Web Speech API）を使用しています。
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                <li>一部のブラウザでは音声の種類が制限される場合があります</li>
                <li>
                  最良の音声体験のため、Chrome または Safari の使用を推奨します
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* 用語集 */}
        <section className="mb-12 bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6 sm:p-8 border border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">
            📚 用語集
          </h2>

          <dl className="space-y-4">
            <div>
              <dt className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                学習レベル
              </dt>
              <dd className="text-slate-700 dark:text-slate-300 pl-4">
                やさしい/ふつう/チャレンジの3段階。AIが提案する英語表現の難易度を調整します。
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                TTS
              </dt>
              <dd className="text-slate-700 dark:text-slate-300 pl-4">
                Text-to-Speech（音声合成）機能。英語テキストを音声で読み上げる機能。
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                ブックマーク
              </dt>
              <dd className="text-slate-700 dark:text-slate-300 pl-4">
                お気に入りの英語表現を保存する機能。
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                RLS
              </dt>
              <dd className="text-slate-700 dark:text-slate-300 pl-4">
                Row Level
                Security（行レベルセキュリティ）。データベースのセキュリティ機能で、各ユーザーは自分のデータのみにアクセス可能。
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                ストリーミング
              </dt>
              <dd className="text-slate-700 dark:text-slate-300 pl-4">
                AIの応答がリアルタイムで文字が流れるように表示される機能。
              </dd>
            </div>
          </dl>
        </section>

        {/* ホームに戻る */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
          >
            ← ホームに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
