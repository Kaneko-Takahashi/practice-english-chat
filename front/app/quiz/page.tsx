"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { logStudyEvent } from "@/app/actions/analytics";
import { getSettings } from "@/app/actions/settings";

interface QuizQuestion {
  id: string;
  japanese: string;
  english: string;
  shuffledWords: string[];
  correctOrder: string[];
}

interface QuizResult {
  questionId: string;
  japanese: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timeSpent: number;
}

interface LastScore {
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  date: string;
}

type GameState = "intro" | "loading" | "playing" | "finished";
type LearningLevel = "beginner" | "standard" | "advanced";

export default function QuizPage() {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState>("intro");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState<string[]>([]);
  const [availableWords, setAvailableWords] = useState<string[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [timeLeft, setTimeLeft] = useState(30);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [draggedWord, setDraggedWord] = useState<string | null>(null);
  const [draggedWordIndex, setDraggedWordIndex] = useState<number | null>(null);
  const [draggedFromAnswer, setDraggedFromAnswer] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userLearningLevel, setUserLearningLevel] =
    useState<LearningLevel>("standard");
  const [selectedLevel, setSelectedLevel] = useState<LearningLevel>("standard");
  const [lastScore, setLastScore] = useState<LastScore | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentQuestion = questions[currentQuestionIndex];
  const score = results.filter((r) => r.isCorrect).length;
  const totalQuestions = questions.length;

  // ユーザー設定と前回のスコアを読み込む
  useEffect(() => {
    const loadUserData = async () => {
      // ユーザーの学習レベルを取得
      const settingsResult = await getSettings();
      if (settingsResult.success) {
        const level = settingsResult.settings.learning_level as LearningLevel;
        setUserLearningLevel(level);
        setSelectedLevel(level);
      }

      // 前回のスコアを localStorage から取得
      if (typeof window !== "undefined") {
        const savedScore = localStorage.getItem("lastQuizScore");
        if (savedScore) {
          setLastScore(JSON.parse(savedScore));
        }
      }
    };

    loadUserData();
  }, []);

  // クリーンアップ: コンポーネントのアンマウント時にタイマーをクリア
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // 問題を読み込む
  const loadQuestions = async () => {
    setGameState("loading");
    try {
      const response = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 10, level: selectedLevel }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "問題の読み込みに失敗しました");
      }

      setQuestions(data.questions);
      setAvailableWords(data.questions[0]?.shuffledWords || []);
      setGameState("playing");
      setQuestionStartTime(Date.now());
    } catch (err) {
      console.error("Failed to load questions:", err);
      setError(
        err instanceof Error ? err.message : "問題の読み込みに失敗しました"
      );
      setGameState("intro");
    }
  };

  // タイマー
  useEffect(() => {
    if (gameState !== "playing" || showFeedback) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // タイムアップ
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, showFeedback, currentQuestionIndex]);

  // タイムアップ時の処理
  const handleTimeout = useCallback(() => {
    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);
    const result: QuizResult = {
      questionId: currentQuestion.id,
      japanese: currentQuestion.japanese,
      userAnswer: userAnswer.join(" "),
      correctAnswer: currentQuestion.english,
      isCorrect: false,
      timeSpent,
    };

    setResults((prev) => [...prev, result]);
    setIsCorrect(false);
    setShowFeedback(true);

    // 既存のタイマーをクリア
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 自動進行のタイマーを設定（10秒に延長）
    timeoutRef.current = setTimeout(() => {
      moveToNextQuestion();
    }, 10000);
  }, [currentQuestion, userAnswer, questionStartTime]);

  // 単語をクリックして回答エリアに追加
  const handleWordClick = (word: string) => {
    if (showFeedback) return;

    setUserAnswer((prev) => [...prev, word]);
    setAvailableWords((prev) =>
      prev.filter((w, i) => {
        // 同じ単語が複数ある場合、最初の1つだけ削除
        const firstIndex = prev.indexOf(word);
        return i !== firstIndex;
      })
    );
  };

  // 回答エリアから単語を削除
  const handleRemoveWord = (index: number) => {
    if (showFeedback) return;

    const word = userAnswer[index];
    setUserAnswer((prev) => prev.filter((_, i) => i !== index));
    setAvailableWords((prev) => [...prev, word]);
  };

  // ドラッグ開始（利用可能な単語リストから）
  const handleDragStart = (word: string) => {
    setDraggedWord(word);
    setDraggedFromAnswer(false);
    setDraggedWordIndex(null);
  };

  // ドラッグ開始（回答エリア内の単語から）
  const handleAnswerDragStart = (index: number) => {
    if (showFeedback) return;
    const word = userAnswer[index];
    setDraggedWord(word);
    setDraggedFromAnswer(true);
    setDraggedWordIndex(index);
  };

  // ドロップ（回答エリアに追加または並び替え）
  const handleDropToAnswer = (e: React.DragEvent, dropIndex?: number) => {
    e.preventDefault();
    if (!draggedWord || showFeedback) return;

    if (draggedFromAnswer && draggedWordIndex !== null) {
      // 回答エリア内での並び替え
      const newAnswer = [...userAnswer];
      const [removed] = newAnswer.splice(draggedWordIndex, 1);

      if (dropIndex !== undefined) {
        // 特定の位置に挿入
        const insertIndex =
          dropIndex > draggedWordIndex ? dropIndex - 1 : dropIndex;
        newAnswer.splice(insertIndex, 0, removed);
      } else {
        // 最後に追加
        newAnswer.push(removed);
      }

      setUserAnswer(newAnswer);
    } else {
      // 利用可能な単語リストから回答エリアに追加
      if (dropIndex !== undefined) {
        // 特定の位置に挿入
        const newAnswer = [...userAnswer];
        newAnswer.splice(dropIndex, 0, draggedWord);
        setUserAnswer(newAnswer);
        setAvailableWords((prev) =>
          prev.filter((w, i) => {
            const firstIndex = prev.indexOf(draggedWord);
            return i !== firstIndex;
          })
        );
      } else {
        // 最後に追加（既存の動作）
        handleWordClick(draggedWord);
      }
    }

    setDraggedWord(null);
    setDraggedWordIndex(null);
    setDraggedFromAnswer(false);
    setDragOverIndex(null);
  };

  // ドラッグオーバー
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // 回答エリア内の単語上でドラッグオーバー
  const handleAnswerDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(index);
  };

  // ドラッグリーブ（回答エリア内）
  const handleAnswerDragLeave = () => {
    setDragOverIndex(null);
  };

  // ドラッグ終了（キャンセル時など）
  const handleDragEnd = () => {
    // ドラッグがキャンセルされた場合、ステートをリセット
    if (draggedWord) {
      setDraggedWord(null);
      setDraggedWordIndex(null);
      setDraggedFromAnswer(false);
      setDragOverIndex(null);
    }
  };

  // 回答をチェック
  const handleSubmit = () => {
    if (userAnswer.length === 0 || showFeedback) return;

    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);
    const userAnswerStr = userAnswer.join(" ");
    const correctAnswerStr = currentQuestion.correctOrder.join(" ");
    const correct = userAnswerStr === correctAnswerStr;

    const result: QuizResult = {
      questionId: currentQuestion.id,
      japanese: currentQuestion.japanese,
      userAnswer: userAnswerStr,
      correctAnswer: currentQuestion.english,
      isCorrect: correct,
      timeSpent,
    };

    setResults((prev) => [...prev, result]);
    setIsCorrect(correct);
    setShowFeedback(true);

    // 正解/不正解の音声フィードバック（オプション）
    if (correct) {
      console.log("✅ 正解！");
    } else {
      console.log("❌ 不正解...");
    }

    // 既存のタイマーをクリア
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 自動進行のタイマーを設定（10秒に延長）
    timeoutRef.current = setTimeout(() => {
      moveToNextQuestion();
    }, 10000);
  };

  // 次の問題へ
  const moveToNextQuestion = () => {
    // タイマーをクリア
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // ドラッグステートをリセット
    setDraggedWord(null);
    setDraggedWordIndex(null);
    setDraggedFromAnswer(false);
    setDragOverIndex(null);

    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setUserAnswer([]);
      setAvailableWords(questions[nextIndex].shuffledWords);
      setTimeLeft(30);
      setQuestionStartTime(Date.now());
      setShowFeedback(false);
    } else {
      // ゲーム終了
      finishGame();
    }
  };

  // ゲーム終了
  const finishGame = async () => {
    setGameState("finished");

    const correctCount =
      results.filter((r) => r.isCorrect).length + (isCorrect ? 1 : 0);
    const totalTime = results.reduce((sum, r) => sum + r.timeSpent, 0);
    const finalScore = Math.round((correctCount / questions.length) * 100);

    // スコアを localStorage に保存
    if (typeof window !== "undefined") {
      const scoreData: LastScore = {
        score: finalScore,
        correctAnswers: correctCount,
        totalQuestions: questions.length,
        date: new Date().toISOString(),
      };
      localStorage.setItem("lastQuizScore", JSON.stringify(scoreData));
    }

    // 学習ログに記録
    try {
      await logStudyEvent("quiz_play", {
        quiz_type: "sentence_scramble",
        total_questions: questions.length,
        correct_answers: correctCount,
        score: finalScore,
        total_time: totalTime,
      });
    } catch (error) {
      console.error("Failed to log quiz event:", error);
    }
  };

  // やり直し
  const handleReset = () => {
    setUserAnswer([]);
    setAvailableWords(currentQuestion.shuffledWords);
    // ドラッグステートをリセット
    setDraggedWord(null);
    setDraggedWordIndex(null);
    setDraggedFromAnswer(false);
    setDragOverIndex(null);
  };

  // もう一度（フィードバック表示中に現在の問題を再挑戦）
  const handleRetry = () => {
    // タイマーをキャンセル
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // フィードバックを非表示
    setShowFeedback(false);
    // 回答をリセット
    setUserAnswer([]);
    // 利用可能な単語をリセット
    setAvailableWords(currentQuestion.shuffledWords);
    // タイマーをリセット
    setTimeLeft(30);
    // 開始時間をリセット
    setQuestionStartTime(Date.now());
    // ドラッグステートをリセット
    setDraggedWord(null);
    setDraggedWordIndex(null);
    setDraggedFromAnswer(false);
    setDragOverIndex(null);

    // 最後に追加した結果を削除（再挑戦なので）
    setResults((prev) => prev.slice(0, -1));
  };

  // スキップ
  const handleSkip = () => {
    if (showFeedback) return;

    const result: QuizResult = {
      questionId: currentQuestion.id,
      japanese: currentQuestion.japanese,
      userAnswer: "",
      correctAnswer: currentQuestion.english,
      isCorrect: false,
      timeSpent: 30 - timeLeft,
    };

    setResults((prev) => [...prev, result]);
    moveToNextQuestion();
  };

  // スタート画面
  if (gameState === "intro") {
    const getLevelLabel = (level: LearningLevel) => {
      switch (level) {
        case "beginner":
          return "やさしい";
        case "advanced":
          return "チャレンジ";
        default:
          return "ふつう";
      }
    };

    const getLevelDescription = (level: LearningLevel) => {
      switch (level) {
        case "beginner":
          return "基本的な単語と簡単な文法（3-6語）";
        case "advanced":
          return "洗練された表現と複雑な文法（8-12語）";
        default:
          return "自然な日常会話レベル（5-9語）";
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="mx-auto max-w-3xl">
          {/* ヘッダー */}
          <div className="mb-8 text-center">
            <div className="mb-4 text-6xl">🎮</div>
            <h1 className="mb-2 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-4xl font-bold text-transparent dark:from-indigo-400 dark:to-purple-400">
              英語並び替えゲーム
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              単語を正しい順番に並べて英文を完成させよう！
            </p>
          </div>

          {/* メインカード */}
          <div className="mb-6 rounded-2xl bg-white p-8 shadow-xl dark:bg-slate-800">
            {/* ゲームの説明 */}
            <div className="mb-8">
              <h2 className="mb-4 text-xl font-bold text-slate-800 dark:text-slate-100">
                📋 ゲームの説明
              </h2>
              <div className="space-y-2 text-slate-600 dark:text-slate-400">
                <div className="flex items-start gap-2">
                  <span className="mt-1 text-indigo-600 dark:text-indigo-400">
                    ✓
                  </span>
                  <span>10問の英語並び替え問題に挑戦</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-1 text-indigo-600 dark:text-indigo-400">
                    ✓
                  </span>
                  <span>各問題30秒の制限時間</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-1 text-indigo-600 dark:text-indigo-400">
                    ✓
                  </span>
                  <span>ドラッグ＆ドロップまたはクリックで並び替え</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-1 text-indigo-600 dark:text-indigo-400">
                    ✓
                  </span>
                  <span>学習レベルに応じた難易度調整</span>
                </div>
              </div>
            </div>

            {/* 前回のスコア */}
            {lastScore && (
              <div className="mb-8 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 p-4 dark:from-indigo-900/20 dark:to-purple-900/20">
                <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  📊 前回のスコア
                </h3>
                <div className="flex items-center gap-4">
                  <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                    {lastScore.score}点
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    {lastScore.correctAnswers}/{lastScore.totalQuestions}問正解
                    <span className="ml-2 text-xs">
                      ({new Date(lastScore.date).toLocaleDateString("ja-JP")})
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 難易度選択 */}
            <div className="mb-8">
              <h2 className="mb-4 text-xl font-bold text-slate-800 dark:text-slate-100">
                🎯 難易度を選択
              </h2>
              <div className="mb-2 text-sm text-slate-600 dark:text-slate-400">
                現在の設定:{" "}
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {getLevelLabel(userLearningLevel)}
                </span>
                <Link
                  href="/settings"
                  className="ml-2 text-indigo-600 underline hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  設定を変更
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {(["beginner", "standard", "advanced"] as LearningLevel[]).map(
                  (level) => (
                    <button
                      key={level}
                      onClick={() => setSelectedLevel(level)}
                      className={`rounded-xl border-2 p-4 text-left transition-all ${
                        selectedLevel === level
                          ? "border-indigo-600 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-900/30"
                          : "border-slate-200 hover:border-indigo-300 dark:border-slate-700 dark:hover:border-indigo-600"
                      }`}
                    >
                      <div
                        className={`mb-1 font-bold ${
                          selectedLevel === level
                            ? "text-indigo-600 dark:text-indigo-400"
                            : "text-slate-800 dark:text-slate-100"
                        }`}
                      >
                        {getLevelLabel(level)}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        {getLevelDescription(level)}
                      </div>
                    </button>
                  )
                )}
              </div>
            </div>

            {/* スタートボタン */}
            <button
              onClick={loadQuestions}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-4 text-lg font-bold text-white transition-all hover:from-indigo-700 hover:to-purple-700 hover:shadow-lg dark:from-indigo-500 dark:to-purple-500 dark:hover:from-indigo-600 dark:hover:to-purple-600"
            >
              🎮 ゲームを開始
            </button>
          </div>

          {/* ホームに戻るリンク */}
          <div className="text-center">
            <Link
              href="/"
              className="text-slate-600 underline hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              ← ホームに戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ローディング画面
  if (gameState === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600 dark:border-slate-600 dark:border-t-indigo-400"></div>
          <p className="text-lg text-slate-600 dark:text-slate-300">
            問題を準備中...
          </p>
        </div>
      </div>
    );
  }

  // エラー画面
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="rounded-2xl bg-white p-8 shadow-xl dark:bg-slate-800">
          <div className="mb-4 text-center text-5xl">😞</div>
          <h2 className="mb-2 text-xl font-bold text-slate-800 dark:text-slate-100">
            エラーが発生しました
          </h2>
          <p className="mb-6 text-slate-600 dark:text-slate-400">{error}</p>
          <Link
            href="/"
            className="block rounded-xl bg-indigo-600 px-6 py-3 text-center font-semibold text-white transition-all hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            ホームに戻る
          </Link>
        </div>
      </div>
    );
  }

  // 結果画面
  if (gameState === "finished") {
    const correctCount = results.filter((r) => r.isCorrect).length;
    const accuracy = Math.round((correctCount / totalQuestions) * 100);
    const totalTime = results.reduce((sum, r) => sum + r.timeSpent, 0);
    const avgTime = Math.round(totalTime / totalQuestions);
    const wrongAnswers = results.filter((r) => !r.isCorrect);

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="mx-auto max-w-3xl">
          {/* ヘッダー */}
          <div className="mb-6 text-center">
            <div className="mb-4 text-6xl">🎉</div>
            <h1 className="mb-2 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-4xl font-bold text-transparent dark:from-indigo-400 dark:to-purple-400">
              ゲーム終了！
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              お疲れ様でした！
            </p>
          </div>

          {/* スコアカード */}
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl bg-white p-4 text-center shadow-lg dark:bg-slate-800">
              <div className="mb-1 text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                {Math.round((correctCount / totalQuestions) * 100)}点
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                スコア
              </div>
            </div>
            <div className="rounded-xl bg-white p-4 text-center shadow-lg dark:bg-slate-800">
              <div className="mb-1 text-3xl font-bold text-green-600 dark:text-green-400">
                {correctCount}/{totalQuestions}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                正解数
              </div>
            </div>
            <div className="rounded-xl bg-white p-4 text-center shadow-lg dark:bg-slate-800">
              <div className="mb-1 text-3xl font-bold text-purple-600 dark:text-purple-400">
                {accuracy}%
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                正解率
              </div>
            </div>
            <div className="rounded-xl bg-white p-4 text-center shadow-lg dark:bg-slate-800">
              <div className="mb-1 text-3xl font-bold text-blue-600 dark:text-blue-400">
                {avgTime}秒
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                平均時間
              </div>
            </div>
          </div>

          {/* 間違えた問題 */}
          {wrongAnswers.length > 0 && (
            <div className="mb-6 rounded-xl bg-white p-6 shadow-lg dark:bg-slate-800">
              <h2 className="mb-4 text-xl font-bold text-slate-800 dark:text-slate-100">
                📝 間違えた問題
              </h2>
              <div className="space-y-4">
                {wrongAnswers.map((result, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-slate-200 p-4 dark:border-slate-700"
                  >
                    <div className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
                      {result.japanese}
                    </div>
                    <div className="mb-1 text-sm text-red-600 dark:text-red-400">
                      ❌ あなたの回答: {result.userAnswer || "(未回答)"}
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400">
                      ✅ 正解: {result.correctAnswer}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* アクションボタン */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition-all hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              もう一度プレイ
            </button>
            <Link
              href="/"
              className="flex-1 rounded-xl border-2 border-indigo-600 px-6 py-3 text-center font-semibold text-indigo-600 transition-all hover:bg-indigo-50 dark:border-indigo-400 dark:text-indigo-400 dark:hover:bg-slate-700"
            >
              ホームに戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ゲーム画面
  const progressPercentage =
    ((currentQuestionIndex + 1) / totalQuestions) * 100;
  const timePercentage = (timeLeft / 30) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 sm:p-6">
      <div className="mx-auto max-w-4xl">
        {/* ヘッダー */}
        <div className="mb-6 text-center">
          <h1 className="mb-2 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-3xl font-bold text-transparent dark:from-indigo-400 dark:to-purple-400 sm:text-4xl">
            🎮 英語並び替えゲーム
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            単語を正しい順番に並べて英文を完成させよう！
          </p>
        </div>

        {/* プログレスバー */}
        <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-300 dark:from-indigo-500 dark:to-purple-500"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>

        {/* 情報バー */}
        <div className="mb-6 flex items-center justify-between rounded-xl bg-white p-4 shadow-lg dark:bg-slate-800">
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="font-semibold text-slate-800 dark:text-slate-100">
                問題
              </span>{" "}
              <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                {currentQuestionIndex + 1}/{totalQuestions}
              </span>
            </div>
            <div className="h-6 w-px bg-slate-300 dark:bg-slate-600"></div>
            <div className="text-sm">
              <span className="font-semibold text-slate-800 dark:text-slate-100">
                スコア
              </span>{" "}
              <span className="text-lg font-bold text-green-600 dark:text-green-400">
                {score}/{currentQuestionIndex}
              </span>
            </div>
          </div>

          {/* タイマー */}
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-slate-600 dark:text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span
              className={`text-lg font-bold ${
                timeLeft <= 10
                  ? "text-red-600 dark:text-red-400"
                  : "text-slate-800 dark:text-slate-100"
              }`}
            >
              {timeLeft}秒
            </span>
          </div>
        </div>

        {/* タイマープログレスバー */}
        <div className="mb-6 h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className={`h-full transition-all duration-1000 ${
              timeLeft <= 10
                ? "bg-red-500 dark:bg-red-400"
                : "bg-green-500 dark:bg-green-400"
            }`}
            style={{ width: `${timePercentage}%` }}
          ></div>
        </div>

        {/* 問題カード */}
        <div className="mb-6 rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800 sm:p-8">
          {/* 日本語の意味 */}
          <div className="mb-6">
            <div className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
              日本語の意味
            </div>
            <div className="rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 p-4 text-center text-xl font-semibold text-slate-800 dark:from-indigo-900/30 dark:to-purple-900/30 dark:text-slate-100 sm:text-2xl">
              {currentQuestion.japanese}
            </div>
          </div>

          {/* 回答エリア */}
          <div className="mb-6">
            <div className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
              あなたの回答（クリックまたはドラッグ＆ドロップで並び替え可能）
            </div>
            <div
              onDrop={(e) => handleDropToAnswer(e)}
              onDragOver={handleDragOver}
              onDragLeave={handleAnswerDragLeave}
              className={`min-h-[80px] rounded-xl border-2 border-dashed p-4 transition-all ${
                userAnswer.length === 0
                  ? "border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-900/50"
                  : "border-indigo-300 bg-indigo-50/50 dark:border-indigo-600 dark:bg-indigo-900/20"
              }`}
            >
              {userAnswer.length === 0 ? (
                <div className="flex h-12 items-center justify-center text-slate-400 dark:text-slate-500">
                  ここに単語を並べてください
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {userAnswer.map((word, index) => (
                    <div
                      key={`answer-${index}`}
                      className="relative"
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDropToAnswer(e, index);
                      }}
                      onDragOver={(e) => handleAnswerDragOver(e, index)}
                      onDragLeave={handleAnswerDragLeave}
                    >
                      <button
                        draggable={!showFeedback}
                        onDragStart={() => handleAnswerDragStart(index)}
                        onDragEnd={handleDragEnd}
                        onClick={() => handleRemoveWord(index)}
                        disabled={showFeedback}
                        className={`rounded-lg px-4 py-2 font-semibold text-white transition-all ${
                          dragOverIndex === index
                            ? "bg-indigo-800 ring-2 ring-indigo-400 ring-offset-2 dark:bg-indigo-600"
                            : "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                        } ${
                          draggedWordIndex === index
                            ? "opacity-50 cursor-grabbing"
                            : "cursor-grab"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        title="ドラッグして並び替え、クリックで削除"
                      >
                        {word}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 利用可能な単語 */}
          <div className="mb-6">
            <div className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
              単語を選んでください
            </div>
            <div className="flex flex-wrap gap-2">
              {availableWords.map((word, index) => (
                <button
                  key={`word-${index}`}
                  draggable
                  onDragStart={() => handleDragStart(word)}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleWordClick(word)}
                  disabled={showFeedback}
                  className="cursor-move rounded-lg border-2 border-slate-300 bg-white px-4 py-2 font-semibold text-slate-800 transition-all hover:border-indigo-400 hover:bg-indigo-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:border-indigo-500 dark:hover:bg-slate-600"
                >
                  {word}
                </button>
              ))}
            </div>
          </div>

          {/* フィードバック */}
          {showFeedback && (
            <div
              className={`mb-4 rounded-xl p-4 ${
                isCorrect
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                  : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
              }`}
            >
              <div className="mb-2 text-lg font-bold">
                {isCorrect ? "✅ 正解！" : "❌ 不正解"}
              </div>
              {!isCorrect && (
                <div className="mb-3 text-sm">
                  正解:{" "}
                  <span className="font-semibold">
                    {currentQuestion.english}
                  </span>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleRetry}
                  className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
                >
                  🔄 もう一度
                </button>
                <button
                  onClick={moveToNextQuestion}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                >
                  次へ →
                </button>
              </div>
            </div>
          )}

          {/* アクションボタン */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={handleSubmit}
              disabled={userAnswer.length === 0 || showFeedback}
              className="flex-1 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition-all hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              回答する
            </button>
            <button
              onClick={handleReset}
              disabled={showFeedback}
              className="rounded-xl border-2 border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
            >
              やり直し
            </button>
            <button
              onClick={handleSkip}
              disabled={showFeedback}
              className="rounded-xl border-2 border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
            >
              スキップ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
