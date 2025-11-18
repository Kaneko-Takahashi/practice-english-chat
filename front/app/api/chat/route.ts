import { streamText } from "ai";
import { createClient } from "@/lib/supabase/server";

// プロバイダーの動的インポート（関数内で実行）
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

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    console.log("Chat API: Request received");
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "認証が必要です。ログインしてください。" }),
        { status: 401 }
      );
    }

    // ユーザーの学習レベルを取得
    let learningLevel: "beginner" | "standard" | "advanced" = "standard";
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("learning_level")
        .eq("user_id", user.id)
        .single();

      if (!profileError && profileData) {
        const level = (profileData as any).learning_level;
        if (
          level === "beginner" ||
          level === "standard" ||
          level === "advanced"
        ) {
          learningLevel = level;
          console.log("Chat API: User learning level:", learningLevel);
        }
      }
    } catch (error) {
      console.warn(
        "Chat API: Failed to fetch learning level, using default:",
        error
      );
    }

    const { messages, conversationId } = await req.json();
    console.log(
      "Chat API: Messages received:",
      messages?.length,
      "Conversation ID:",
      conversationId
    );

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "メッセージが不正です。" }), {
        status: 400,
      });
    }

    // useChatフックから送信されるメッセージ形式を処理
    // messagesは { id, role, content } の形式
    const formattedMessages = messages.map((m: any) => ({
      role: m.role,
      content: m.content,
    }));

    // 最新のユーザーメッセージを取得
    const lastUserMessage = formattedMessages
      .filter((m: any) => m.role === "user")
      .pop();

    if (!lastUserMessage || !lastUserMessage.content) {
      return new Response(
        JSON.stringify({ error: "ユーザーメッセージが見つかりません。" }),
        { status: 400 }
      );
    }

    // AIプロバイダーの設定（環境変数から取得）
    const aiProvider = process.env.AI_PROVIDER || "openai";
    const apiKey =
      aiProvider === "google"
        ? process.env.GOOGLE_GENERATIVE_AI_API_KEY
        : process.env.OPENAI_API_KEY;

    console.log("Chat API: Provider:", aiProvider, "API Key exists:", !!apiKey);

    if (!apiKey) {
      const keyName =
        aiProvider === "google"
          ? "GOOGLE_GENERATIVE_AI_API_KEY"
          : "OPENAI_API_KEY";

      console.error(`Chat API: ${keyName} is not set`);

      return new Response(
        JSON.stringify({
          error: `AI APIキーが設定されていません。`,
          details: `.env.localファイルに${keyName}を設定してください。`,
          help: "詳細はfront/ENV_SETUP.mdを参照してください。",
          provider: aiProvider,
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
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
        return new Response(
          JSON.stringify({
            error: "@ai-sdk/google パッケージがインストールされていません。",
          }),
          { status: 500 }
        );
      }
      const google = createGoogle({ apiKey });
      model = google(modelName);
    } else {
      const createOpenAI = await getOpenAIProvider();
      if (!createOpenAI) {
        return new Response(
          JSON.stringify({
            error: "@ai-sdk/openai パッケージがインストールされていません。",
          }),
          { status: 500 }
        );
      }
      const openai = createOpenAI({ apiKey });
      model = openai(modelName);
    }

    // 学習レベルに応じた指示を構築
    let levelGuidance = "";
    switch (learningLevel) {
      case "beginner":
        levelGuidance = `
LEARNING LEVEL: Beginner (やさしい)
- Use simple, common words and short sentences
- Avoid complex grammar structures
- Focus on basic, everyday expressions
- Use vocabulary that beginners would know (CEFR A1-A2 level)`;
        break;
      case "advanced":
        levelGuidance = `
LEARNING LEVEL: Advanced (チャレンジ)
- Use sophisticated vocabulary and complex sentence structures
- Include idiomatic expressions and phrasal verbs
- Provide formal and business English options
- Challenge the learner with advanced expressions (CEFR C1-C2 level)`;
        break;
      case "standard":
      default:
        levelGuidance = `
LEARNING LEVEL: Standard (ふつう)
- Use natural, everyday conversational English
- Balance between simple and moderate complexity
- Include common expressions used by native speakers
- Appropriate for intermediate learners (CEFR B1-B2 level)`;
        break;
    }

    // プロンプトを構築（3つの英語表現と日本語訳を生成するように指示）
    const systemPrompt = `You are an English learning assistant. When a user asks how to express something in English, provide exactly 3 different ways to say it.
${levelGuidance}

Each response should be:
1. Natural and commonly used in everyday conversation
2. Appropriate for different contexts or formality levels
3. Clear and easy to understand
4. Matched to the learner's level as specified above

IMPORTANT: Format your response as exactly 3 separate entries, each on a new line. Each entry should include:
- English expression
- Japanese translation in parentheses

Format as:
1. [English expression] ([Japanese translation])
2. [English expression] ([Japanese translation])
3. [English expression] ([Japanese translation])

Example:
1. Can you tell me how to get to the station? (駅までの行き方を教えてもらえますか？)
2. Could you please give me directions to the station? (駅までの道順を教えていただけますか？)
3. How do I get to the train station? (駅にはどうやって行けばいいですか？)

Do not include explanations, just the three numbered expressions with Japanese translations.`;

    // ストリーミング応答を生成
    // 会話の履歴を使用して、より自然な応答を生成
    // 最新のユーザーメッセージが既に含まれている場合は、そのまま使用
    const contextMessages = formattedMessages.slice(-5); // 直近5メッセージを使用（コンテキスト保持）
    const lastMessageInContext = contextMessages[contextMessages.length - 1];

    // 最新のメッセージがユーザーメッセージで、内容が一致する場合はそのまま使用
    const finalMessages =
      lastMessageInContext?.role === "user" &&
      lastMessageInContext?.content === lastUserMessage.content
        ? contextMessages
        : [
            ...contextMessages.filter(
              (m: any) =>
                m.role !== "user" || m.content !== lastUserMessage.content
            ),
            {
              role: "user" as const,
              content: `How can I express "${lastUserMessage.content}" in English? Provide exactly 3 different ways, numbered 1, 2, and 3.`,
            },
          ];

    console.log(
      "Chat API: Starting streamText with",
      finalMessages.length,
      "messages"
    );

    const result = await streamText({
      model,
      system: systemPrompt,
      messages: finalMessages,
      temperature: 0.7,
    });

    console.log("Chat API: StreamText result obtained");

    // useChatフック用のストリーミングレスポンスを返す
    return result.toTextStreamResponse({
      headers: {
        "X-Conversation-Id": conversationId || "",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack"
    );
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "予期しないエラーが発生しました",
        details: error instanceof Error ? error.stack : String(error),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
