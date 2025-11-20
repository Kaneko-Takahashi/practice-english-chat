import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateText } from "ai";

// 問題データの型定義
export interface QuizQuestion {
  id: string;
  japanese: string;
  english: string;
  shuffledWords: string[];
  correctOrder: string[];
}

// プロバイダーの動的インポート
async function getOpenAIProvider() {
  try {
    const openaiModule = await import("@ai-sdk/openai");
    return openaiModule.createOpenAI;
  } catch {
    console.warn("@ai-sdk/openai is not installed");
    return null;
  }
}

async function getGoogleProvider() {
  try {
    const googleModule = await import("@ai-sdk/google");
    return googleModule.createGoogleGenerativeAI;
  } catch {
    console.warn("@ai-sdk/google is not installed");
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "認証が必要です" },
        { status: 401 }
      );
    }

    // リクエストボディを取得
    const body = await request.json();
    const {
      count = 10,
      level = "standard",
    }: { count?: number; level?: "beginner" | "standard" | "advanced" } = body;

    // ユーザーの学習レベルを取得（リクエストで指定されていない場合）
    let learningLevel = level;
    if (!level) {
      try {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("learning_level")
          .eq("user_id", user.id)
          .single();

        if (profileData) {
          learningLevel = (profileData as any).learning_level || "standard";
        }
      } catch (error) {
        console.warn("Failed to fetch user learning level:", error);
      }
    }

    // 学習レベルに応じたプロンプトを作成
    let levelGuidance = "";
    switch (learningLevel) {
      case "beginner":
        levelGuidance = `
- Use simple, common words (3-6 words per sentence)
- Basic sentence structures (Subject + Verb + Object)
- Present tense and simple past tense
- Everyday situations (greetings, shopping, directions)`;
        break;
      case "advanced":
        levelGuidance = `
- Use sophisticated vocabulary (8-12 words per sentence)
- Complex sentence structures (relative clauses, conditionals)
- Various tenses including perfect tenses
- Business, academic, or formal situations`;
        break;
      case "standard":
      default:
        levelGuidance = `
- Use natural, everyday vocabulary (5-9 words per sentence)
- Mix of simple and moderate sentence structures
- Common tenses (present, past, future)
- Daily life situations (travel, work, hobbies)`;
        break;
    }

    // プロンプトを作成
    const prompt = `You are an English learning quiz generator. Generate ${count} Japanese-to-English sentence scramble quiz questions.

LEARNING LEVEL: ${learningLevel}
${levelGuidance}

REQUIREMENTS:
1. Each question must have:
   - A Japanese sentence
   - The correct English translation
   - The sentence should be suitable for word scramble (not too short, not too long)

2. Variety:
   - Include different topics (daily life, travel, work, etc.)
   - Use different sentence patterns
   - Mix statement, question, and request forms

3. Output format (JSON array):
[
  {
    "japanese": "駅までの行き方を教えてもらえますか？",
    "english": "Can you tell me how to get to the station?"
  },
  ...
]

Generate ${count} questions now. Return ONLY the JSON array, no other text.`;

    // AIプロバイダーの設定
    const aiProvider = process.env.AI_PROVIDER || "openai";
    const apiKey =
      aiProvider === "google"
        ? process.env.GOOGLE_GENERATIVE_AI_API_KEY
        : process.env.OPENAI_API_KEY;

    if (!apiKey) {
      const keyName =
        aiProvider === "google"
          ? "GOOGLE_GENERATIVE_AI_API_KEY"
          : "OPENAI_API_KEY";
      return NextResponse.json(
        {
          success: false,
          error: `AI APIキーが設定されていません。.env.localファイルに${keyName}を設定してください。`,
        },
        { status: 500 }
      );
    }

    // プロバイダーに応じてモデルを選択
    let model;
    const modelName =
      process.env.AI_MODEL ||
      (aiProvider === "google" ? "gemini-1.5-flash" : "gpt-4o-mini");

    // プロバイダーを動的に読み込む
    if (aiProvider === "google") {
      const createGoogle = await getGoogleProvider();
      if (!createGoogle) {
        return NextResponse.json(
          {
            success: false,
            error: "@ai-sdk/google パッケージがインストールされていません。",
          },
          { status: 500 }
        );
      }
      const google = createGoogle({ apiKey });
      model = google(modelName);
    } else {
      const createOpenAI = await getOpenAIProvider();
      if (!createOpenAI) {
        return NextResponse.json(
          {
            success: false,
            error: "@ai-sdk/openai パッケージがインストールされていません。",
          },
          { status: 500 }
        );
      }
      const openai = createOpenAI({ apiKey });
      model = openai(modelName);
    }

    // AIで問題を生成
    const { text } = await generateText({
      model,
      prompt,
    });

    // JSONを抽出（コードブロックがある場合に対応）
    let jsonStr = text.trim();
    const jsonMatch =
      text.match(/```json\s*([\s\S]*?)\s*```/) ||
      text.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const rawQuestions = JSON.parse(jsonStr);

    // 問題データを整形（単語のシャッフル処理を追加）
    const questions: QuizQuestion[] = rawQuestions.map(
      (q: { japanese: string; english: string }, index: number) => {
        // 句読点を分離して単語に分割
        const words = q.english
          .replace(/([.,!?;:])/g, " $1") // 句読点の前にスペースを追加
          .split(/\s+/)
          .filter((w) => w.length > 0);

        // シャッフル用の配列を作成
        const shuffled = [...words].sort(() => Math.random() - 0.5);

        return {
          id: `q${index + 1}`,
          japanese: q.japanese,
          english: q.english,
          shuffledWords: shuffled,
          correctOrder: words,
        };
      }
    );

    console.log(
      `Generated ${questions.length} quiz questions for level: ${learningLevel}`
    );

    return NextResponse.json({
      success: true,
      questions,
      level: learningLevel,
    });
  } catch (error) {
    console.error("Quiz generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "問題の生成に失敗しました",
      },
      { status: 500 }
    );
  }
}
