import { convertToModelMessages, streamText} from "ai";
import type { ModelMessage, UIMessage } from "ai";
import { createClient } from "@/lib/supabase/server";

function isUIMessageList(messages: unknown): messages is UIMessage[] {
  return (
    Array.isArray(messages) &&
    messages.length > 0 &&
    typeof messages[0] === "object" &&
    messages[0] !== null &&
    "parts" in messages[0] &&
    Array.isArray((messages[0] as UIMessage).parts)
  );
}

function flattenModelContent(content: ModelMessage["content"]): string {
  if (typeof content === "string") return content;

  if (!Array.isArray(content)) return "";

  return content
    .map((part: { type?: string; text?: string }) =>
      part?.type === "text" && typeof part.text === "string"
        ? part.text
        : ""
    )
    .join("");
}

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

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({
          error: "認証が必要です。ログインしてください。",
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

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
        }
      }
    } catch (error) {
      console.warn("Failed to fetch learning level:", error);
    }

    const raw = (await req.json()) as {
      messages?: unknown;
      conversationId?: string;
      id?: string;
    };

    const conversationId = raw.conversationId ?? raw.id;
    const messagesRaw = raw.messages;

    console.log(
      "Messages received:",
      Array.isArray(messagesRaw) ? messagesRaw.length : 0
    );

    if (
      !messagesRaw ||
      !Array.isArray(messagesRaw) ||
      messagesRaw.length === 0
    ) {
      return new Response(
        JSON.stringify({
          error: "メッセージが不正です。",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    let modelMessages: ModelMessage[];

    try {
      modelMessages = isUIMessageList(messagesRaw)
        ? convertToModelMessages(messagesRaw)
        : (messagesRaw as { role: string; content?: string }[]).map(
            (m) =>
              ({
                role: m.role as ModelMessage["role"],
                content: m.content ?? "",
              }) as ModelMessage
          );
    } catch (e) {
      console.error("Convert messages failed:", e);

      return new Response(
        JSON.stringify({
          error: "メッセージ形式が不正です。",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const userMessages = modelMessages.filter((m) => m.role === "user");

    const lastUserModel = userMessages[userMessages.length - 1];

    const lastUserText = lastUserModel
      ? flattenModelContent(lastUserModel.content).trim()
      : "";

    if (!lastUserText) {
      return new Response(
        JSON.stringify({
          error: "ユーザーメッセージが見つかりません。",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const aiProvider = process.env.AI_PROVIDER || "openai";

    const apiKey =
      aiProvider === "google"
        ? process.env.GOOGLE_GENERATIVE_AI_API_KEY
        : process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "APIキーが設定されていません。",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const modelName =
      process.env.AI_MODEL ||
      (aiProvider === "google"
        ? "gemini-1.5-flash"
        : "gpt-4o-mini");

    let model;

    if (aiProvider === "google") {
      const createGoogle = await getGoogleProvider();

      if (!createGoogle) {
        return new Response(
          JSON.stringify({
            error: "@ai-sdk/google がインストールされていません。",
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      }

      const google = createGoogle({
        apiKey,
      });

      model = google(modelName);
    } else {
      const createOpenAI = await getOpenAIProvider();

      if (!createOpenAI) {
        return new Response(
          JSON.stringify({
            error: "@ai-sdk/openai がインストールされていません。",
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      }

      const openai = createOpenAI({
        apiKey,
      });

      model = openai(modelName);
    }

    let levelGuidance = "";

    switch (learningLevel) {
      case "beginner":
        levelGuidance = `
- Use simple and short English sentences
- Use beginner-friendly vocabulary
`;
        break;

      case "advanced":
        levelGuidance = `
- Use sophisticated English expressions
- Include business and formal English
`;
        break;

      case "standard":
      default:
        levelGuidance = `
- Use natural conversational English
- Use intermediate-level expressions
`;
        break;
    }

    const systemPrompt = `
You are an English learning assistant.

${levelGuidance}

Provide exactly 3 English expressions.

Format:

1. English sentence (Japanese translation)
2. English sentence (Japanese translation)
3. English sentence (Japanese translation)

Do not include explanations.
`;

    const contextMessages = modelMessages.slice(-5);

    const finalMessages: ModelMessage[] = [
      ...contextMessages,
      {
        role: "user",
        content: `How can I express "${lastUserText}" in English? Provide exactly 3 numbered examples.`,
      },
    ];

    console.log(
      "Starting generateText with",
      finalMessages.length,
      "messages"
    );
    
    const result = streamText({
      model,
      system: systemPrompt,
      messages: finalMessages,
      temperature: 0.7,
    });
    
    return result.toUIMessageStreamResponse();
    
    return new Response(
      JSON.stringify({
        messages: [
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: result.text,
          },
        ],
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
      } catch (error) {
        console.error("Chat API error:", error);
    
        return new Response(
          JSON.stringify({
            error:
              error instanceof Error
                ? error.message
                : "予期しないエラーが発生しました",
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