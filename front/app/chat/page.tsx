"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import Link from "next/link";
import { MessageBubble } from "@/components/Chat/MessageBubble";
import {
  createConversation,
  saveMessage,
  getMessages,
  type ChatMessage,
} from "@/app/actions/chat";
import { logStudyEvent } from "@/app/actions/analytics";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/supabase";

type StreamMessage = {
  id?: string;
  role: "user" | "assistant" | "system";
  content?: string;
};

function textFromUIMessage(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

function chatRowToUIMessage(msg: ChatMessage): UIMessage {
  return {
    id: msg.id,
    role: msg.role,
    parts: [{ type: "text", text: msg.content }],
  };
}

export default function ChatPage() {
  const [dbMessages, setDbMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const streamMessagesRef = useRef<any[]>([]);
  const setMessagesRef = useRef<any>(null);

  // ★ 修正1: handleAssistantFinish を ref 経由で呼ぶ（依存配列から外すため）
  const handleAssistantFinishRef = useRef<(rawContent: string) => Promise<void>>(
    async () => {}
  );

  // ★ 修正2: 直前の status を記録し「ready への遷移」のみ検知する
  const prevStatusRef = useRef<string>("idle");

  const fetchProfile = useCallback(async () => {
    setProfileError(null);
    setIsProfileLoading(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setProfile(null);
        setProfileError("ログインしてプロフィールを表示してください");
        return;
      }

      const { data, error: profileFetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profileFetchError) {
        throw profileFetchError;
      }

      setProfile(data as Profile);
    } catch (error) {
      console.error("Fetch profile error:", error);
      setProfileError(
        error instanceof Error
          ? error.message
          : "プロフィールの取得に失敗しました"
      );
      setProfile(null);
    } finally {
      setIsProfileLoading(false);
    }
  }, []);

  const handleAssistantFinish = useCallback(
    async (rawContent: string) => {
      console.log("onFinish called:", rawContent);
      if (!conversationId) return;

      const currentStreamMessages = streamMessagesRef.current || [];
      const setStreamMessagesFn = setMessagesRef.current;

      try {
        const content = rawContent.trim();

        let assistantResponses: Array<{ english: string; japanese: string }> = [];

        const numberedPattern = /^\d+\.\s*(.+?)[\r\n\s]*[（(]([^()（）]+)[)）]\s*$/gm;
        const numberedMatches = Array.from(content.matchAll(numberedPattern));

        console.log("Parsing AI response. Content:", content);
        console.log("Numbered matches found:", numberedMatches.length);

        if (numberedMatches.length >= 3) {
          assistantResponses = numberedMatches.slice(0, 3).map((match) => ({
            english: match[1].trim(),
            japanese: match[2].trim(),
          }));
        } else if (numberedMatches.length > 0) {
          assistantResponses = numberedMatches.map((match) => ({
            english: match[1].trim(),
            japanese: match[2].trim(),
          }));
        } else {
          const fallbackPattern = /^\d+\.\s*(.+)$/gm;
          const fallbackMatches = Array.from(content.matchAll(fallbackPattern));

          if (fallbackMatches.length >= 3) {
            assistantResponses = fallbackMatches.slice(0, 3).map((match) => {
              const text = match[1].trim();
              const japaneseMatch = text.match(/[（(]([^()（）]+)[)）]/);
              const japanese = japaneseMatch ? japaneseMatch[1].trim() : "";
              const english = text.replace(/[（(][^()（）]+[)）]/g, "").trim();
              return { english, japanese };
            });
          } else if (fallbackMatches.length > 0) {
            assistantResponses = fallbackMatches.map((match) => {
              const text = match[1].trim();
              const japaneseMatch = text.match(/[（(]([^()（）]+)[)）]/);
              const japanese = japaneseMatch ? japaneseMatch[1].trim() : "";
              const english = text.replace(/[（(][^()（）]+[)）]/g, "").trim();
              return { english, japanese };
            });
          } else {
            const lines = content.split(/\n+/).filter((line) => line.trim());
            const responses: Array<{ english: string; japanese: string }> = [];

            for (let i = 0; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;

              const cleaned = line.replace(/^\d+\.\s*/, "").trim();
              if (!cleaned) continue;

              let fullLine = cleaned;
              if (i + 1 < lines.length && lines[i + 1].trim().match(/^[（(]/)) {
                fullLine = cleaned + " " + lines[i + 1].trim();
                i++;
              }

              const japaneseMatch = fullLine.match(/[（(]([^()（）]+)[)）]/);
              const japanese = japaneseMatch ? japaneseMatch[1].trim() : "";
              const english = fullLine.replace(/[（(][^()（）]+[)）]/g, "").trim();

              if (english) {
                responses.push({ english, japanese });
              }
            }

            console.log("Parsed responses:", responses);

            if (responses.length >= 3) {
              assistantResponses = responses.slice(0, 3);
            } else if (responses.length > 0) {
              assistantResponses = responses;
            } else {
              console.warn("Could not parse AI response, using raw content");
              assistantResponses = [{ english: content, japanese: "" }];
            }
          }
        }

        while (assistantResponses.length < 3 && assistantResponses.length > 0) {
          assistantResponses.push(assistantResponses[assistantResponses.length - 1]);
        }

        assistantResponses = assistantResponses.slice(0, 3);

        const userMessages = currentStreamMessages.filter((m) => m.role === "user");
        const lastUserMessage = userMessages[userMessages.length - 1];
        if (!lastUserMessage) return;

        const currentSequenceNum = dbMessages.length + 1;
        let userMessageId: string | undefined;

        const existingUserMessage = dbMessages.find(
          (m) => m.role === "user" && m.content === lastUserMessage.content
        );
        if (existingUserMessage) {
          userMessageId = existingUserMessage.id;
        } else {
          const userMessageResult = await saveMessage(
            conversationId,
            "user",
            lastUserMessage.content,
            currentSequenceNum
          );
          if (userMessageResult.success) {
            userMessageId = userMessageResult.messageId;
          }
        }

        const messageSetId = crypto.randomUUID();
        const assistantMessages: ChatMessage[] = [];

        for (let i = 0; i < Math.min(assistantResponses.length, 3); i++) {
          const sequenceNum = currentSequenceNum + 1 + i;
          const combinedContent = assistantResponses[i].japanese
            ? `${assistantResponses[i].english}\n(${assistantResponses[i].japanese})`
            : assistantResponses[i].english;

          const result = await saveMessage(
            conversationId,
            "assistant",
            combinedContent,
            sequenceNum,
            userMessageId,
            messageSetId,
            i + 1
          );

          if (result.success) {
            assistantMessages.push({
              id: result.messageId,
              role: "assistant",
              content: combinedContent,
              createdAt: new Date(),
              messageSetId,
              bubbleIndex: i + 1,
            });
          }
        }

        const messagesResult = await getMessages(conversationId);
        if (messagesResult.success) {
          setDbMessages(messagesResult.messages);
          if (setStreamMessagesFn && typeof setStreamMessagesFn === "function") {
            setStreamMessagesFn(messagesResult.messages.map(chatRowToUIMessage));
          }
        } else {
          setDbMessages((prev) => {
            const updated = [...prev];
            if (!existingUserMessage && userMessageId) {
              updated.push({
                id: userMessageId,
                role: "user",
                content: lastUserMessage.content,
                createdAt: new Date(),
              });
            }
            return [...updated, ...assistantMessages];
          });
        }
      } catch (error) {
        console.error("Save message error:", error);
      }
    },
    [conversationId, dbMessages, setDbMessages]
  );

  // ★ 毎レンダーで ref を最新の関数に同期
  handleAssistantFinishRef.current = handleAssistantFinish;

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const chatTransport = useMemo(
    () => new DefaultChatTransport({
      api: "/api/chat",
      credentials: "include",
      body: () => ({ conversationId }),
    }),
    [conversationId]
  );
  
  const { messages: uiMessages, sendMessage, setMessages, status } = useChat({
    transport: chatTransport,
    id: conversationId ?? undefined,
  });

  // ★ 修正: status が「streaming/submitted → ready」に遷移した瞬間だけ1回だけ呼ぶ
  //         handleAssistantFinish を依存配列に含めないことでループを断ち切る
  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = status;

    console.log("status changed:", prevStatus, "->", status);

    // ready への遷移でなければスキップ
    if (status !== "ready") return;
    // すでに ready だった場合もスキップ（uiMessages 変化による再実行を防ぐ）
    if (prevStatus === "ready") return;

    const lastMsg = uiMessages[uiMessages.length - 1];
    if (!lastMsg) return;
    if (lastMsg.role !== "assistant") return;

    const text = textFromUIMessage(lastMsg).trim();
    if (!text) return;

    // ref 経由で呼ぶ（handleAssistantFinish を依存配列に入れなくてよい）
    handleAssistantFinishRef.current(text);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, uiMessages]);

  const streamMessages: StreamMessage[] = useMemo(
    () => {
      console.log("uiMessages:", uiMessages);
      return uiMessages.map((m) => ({
        id: m.id,
        role: m.role,
        content: textFromUIMessage(m),
      }));
    },
    [uiMessages]
  );

  const isBusy = status === "submitted" || status === "streaming";
  const setStreamMessages = setMessages;

  useEffect(() => {
    streamMessagesRef.current = streamMessages;
    setMessagesRef.current = setStreamMessages;
  }, [streamMessages, setStreamMessages]);

  useEffect(() => {
    const initializeChat = async () => {
      try {
        const result = await createConversation();
        if (result.success) {
          setConversationId(result.conversationId);
          setDbMessages([]);

          if (typeof setStreamMessages === "function") {
            setStreamMessages([]);
          }

          const messagesResult = await getMessages(result.conversationId);
          if (messagesResult.success) {
            setDbMessages(messagesResult.messages);
            setStreamMessages(messagesResult.messages.map(chatRowToUIMessage));
          }
        } else {
          alert(`エラー: ${result.error}`);
        }
      } catch (error) {
        console.error("Initialize chat error:", error);
        alert("チャットの初期化に失敗しました");
      } finally {
        setIsInitializing(false);
      }
    };

    initializeChat();
  }, [setStreamMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [streamMessages, dbMessages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedValue = inputValue.trim();
    if (!trimmedValue || isBusy || isInitializing) return;

    let currentConversationId = conversationId;
    if (!currentConversationId) {
      try {
        const result = await createConversation();
        if (result.success) {
          currentConversationId = result.conversationId;
          setConversationId(result.conversationId);
          setDbMessages([]);
          if (typeof setStreamMessages === "function") {
            setStreamMessages([]);
          }
        } else {
          alert(`エラー: ${result.error}`);
          return;
        }
      } catch (error) {
        console.error("Create conversation error:", error);
        alert("会話の作成に失敗しました");
        return;
      }
    }

    try {
      await sendMessage({
        text: trimmedValue,
      });
    
      setInputValue("");
    
      try {
        await logStudyEvent("chat_send", {
          conversation_id: currentConversationId,
          message_length: trimmedValue.length,
        });
      } catch (logError) {
        console.error("Failed to log study event:", logError);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      alert("メッセージの送信に失敗しました");
    }
  };
  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          </div>
          <p className="text-slate-600 dark:text-slate-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="flex-1 overflow-y-auto px-4 pt-8 pb-6">
        {dbMessages.length === 0 && streamMessages.length === 0 ? (
          <div className="flex items-start justify-center">
            <div className="w-full max-w-4xl mx-auto">
              <div className="max-w-3xl mx-auto text-center">
                <div className="mb-6 mt-4">
                  <h1 className="mb-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-4xl font-bold text-transparent dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400">
                    英語学習を始めましょう！
                  </h1>
                  <p className="text-lg text-slate-600 dark:text-slate-400">
                    AIが発音やフレーズをやさしくサポートします 🗣️
                  </p>
                </div>

                <div className="mb-6 rounded-2xl bg-white/80 p-6 shadow-lg backdrop-blur-sm dark:bg-slate-800/80">
                  <h2 className="mb-4 text-left text-xl font-bold text-slate-800 dark:text-slate-100">
                    💡 使い方はとても簡単！
                  </h2>
                  <div className="space-y-2 text-left text-sm text-slate-600 dark:text-slate-400 mb-6">
                    <p>
                      <strong>1️⃣ 入力</strong>:
                      下の入力欄に、英語で言いたいことを<strong>日本語</strong>で入力してください。
                    </p>
                    <p>
                      <strong>2️⃣ AI応答</strong>: AIが<strong>3つの異なる英語表現</strong>を提案します。
                    </p>
                    <p>
                      <strong>🔊 音声再生</strong>: 各英語表現の横にある<strong>スピーカーボタン</strong>をクリックすると、ネイティブの発音が聞けます！
                    </p>
                  </div>

                  <div className="mt-6 space-y-4 border-t border-slate-200 pt-6 dark:border-slate-700">
                    <p className="text-center text-sm text-slate-600 dark:text-slate-400">
                      💡 より詳しい設定や使い方はこちら
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-4">
                      <Link
                        href="/settings"
                        className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-indigo-600 shadow-sm transition-all hover:bg-indigo-50 hover:shadow-md dark:bg-slate-700 dark:text-indigo-400 dark:hover:bg-slate-600"
                      >
                        ⚙️ 詳細設定はこちら
                      </Link>
                      <Link
                        href="/faq"
                        className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-purple-600 shadow-sm transition-all hover:bg-purple-50 hover:shadow-md dark:bg-slate-700 dark:text-purple-400 dark:hover:bg-slate-600"
                      >
                        ❓ FAQとサポートページはこちら
                      </Link>
                    </div>
                    <p className="mt-4 text-center text-sm font-medium text-slate-700 dark:text-slate-300">
                      🎮 また、ゲームにもチャレンジしてみてね！
                    </p>
                    <div className="flex justify-center">
                      <Link
                        href="/quiz"
                        className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:scale-105 hover:shadow-lg dark:from-indigo-500 dark:to-purple-500"
                      >
                        🎯 クイズ／ゲームをプレイ
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="mb-4 text-lg font-semibold text-slate-700 dark:text-slate-300">
                    📝 試してみましょう！こんな場面で使えます
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="group cursor-pointer rounded-xl bg-[#F5F7FF] p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#E4E9FF] hover:shadow-md dark:bg-[#F5F7FF]/10 dark:hover:bg-[#E4E9FF]/20">
                      <div className="mb-2 text-3xl">🍽️</div>
                      <h4 className="mb-2 font-semibold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400">
                        レストランでの注文
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        「おすすめの料理は何ですか？」
                      </p>
                    </div>

                    <div className="group cursor-pointer rounded-xl bg-[#F5F7FF] p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#E4E9FF] hover:shadow-md dark:bg-[#F5F7FF]/10 dark:hover:bg-[#E4E9FF]/20">
                      <div className="mb-2 text-3xl">👥</div>
                      <h4 className="mb-2 font-semibold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400">
                        会議で使えるフレーズ
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        「その件について意見をお聞かせください」
                      </p>
                    </div>

                    <div className="group cursor-pointer rounded-xl bg-[#F5F7FF] p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#E4E9FF] hover:shadow-md dark:bg-[#F5F7FF]/10 dark:hover:bg-[#E4E9FF]/20">
                      <div className="mb-2 text-3xl">👋</div>
                      <h4 className="mb-2 font-semibold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400">
                        自己紹介
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        「趣味は読書と旅行です」
                      </p>
                    </div>

                    <div className="group cursor-pointer rounded-xl bg-[#F5F7FF] p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#E4E9FF] hover:shadow-md dark:bg-[#F5F7FF]/10 dark:hover:bg-[#E4E9FF]/20">
                      <div className="mb-2 text-3xl">✈️</div>
                      <h4 className="mb-2 font-semibold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400">
                        旅行での会話
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        「駅までの行き方を教えてください」
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="mb-2 animate-bounce text-3xl">👇</div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">
                    さあ、下の入力欄に入力して始めましょう！
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl space-y-6 pt-12 px-4">
            {dbMessages.map((message) => {
              if (message.role === "assistant" && message.messageSetId) {
                const messageGroup = dbMessages.filter(
                  (m) =>
                    m.messageSetId === message.messageSetId &&
                    m.role === "assistant"
                );

                if (message.id === messageGroup[0]?.id) {
                  return (
                    <div key={message.messageSetId} className="space-y-3">
                      {messageGroup
                        .sort(
                          (a: ChatMessage, b: ChatMessage) =>
                            (a.bubbleIndex || 0) - (b.bubbleIndex || 0)
                        )
                        .map((msg: ChatMessage) => (
                          <MessageBubble
                            key={msg.id}
                            id={msg.id}
                            role={msg.role}
                            content={msg.content}
                            isBookmarked={msg.isBookmarked}
                            displayName={
                              msg.role === "user"
                                ? profile?.display_name
                                : undefined
                            }
                          />
                        ))}
                    </div>
                  );
                }
                return null;
              }

              return (
                <MessageBubble
                  key={message.id}
                  id={message.id}
                  role={message.role}
                  content={message.content}
                  isBookmarked={message.isBookmarked}
                  displayName={
                    message.role === "user" ? profile?.display_name : undefined
                  }
                />
              );
            })}

            {streamMessages
              .filter((msg: StreamMessage) => {
                if (
                  !isBusy &&
                  typeof msg.id === "string" &&
                  msg.id.startsWith("streaming-")
                ) {
                  return false;
                }
                return !dbMessages.some(
                  (dbMsg: ChatMessage) => dbMsg.id === msg.id
                );
              })
              .map((message: StreamMessage) => {
                if (message.role === "assistant") {
                  const content = message.content || "";

                  const numberedPattern = /^\d+\.\s*(.+?)\s*\((.+?)\)\s*$/gm;
                  const numberedMatches = Array.from(
                    content.matchAll(numberedPattern)
                  );

                  let responses: Array<{ english: string; japanese: string }> = [];

                  if (numberedMatches.length >= 3) {
                    responses = numberedMatches.slice(0, 3).map((match: any) => ({
                      english: match[1].trim(),
                      japanese: match[2].trim(),
                    }));
                  } else {
                    const lines: string[] = content
                      .split(/\n+/)
                      .filter((line: string) => line.trim().length > 0);
                    responses = lines.slice(0, 3).map((line: string) => {
                      const cleaned = line.replace(/^\d+\.\s*/, "").trim();
                      const japaneseMatch = cleaned.match(/\((.+?)\)/);
                      const japanese = japaneseMatch ? japaneseMatch[1].trim() : "";
                      const english = cleaned.replace(/\(.+?\)/g, "").trim();
                      return { english, japanese };
                    });
                  }

                  while (responses.length < 3 && responses.length > 0) {
                    responses.push(responses[responses.length - 1]);
                  }

                  responses = responses.slice(0, 3);

                  return (
                    <div
                      key={message.id || `streaming-${message.role}`}
                      className="space-y-3"
                    >
                      {responses.map((response, index) => {
                        const combinedContent = response.japanese
                          ? `${response.english}\n(${response.japanese})`
                          : response.english;

                        return (
                          <MessageBubble
                            key={`streaming-${index}`}
                            id={`streaming-${message.id || "temp"}-${index}`}
                            role="assistant"
                            content={combinedContent}
                            isBookmarked={false}
                          />
                        );
                      })}
                    </div>
                  );
                }

                if (message.role === "user") {
                  return (
                    <MessageBubble
                      key={message.id || `streaming-${message.role}`}
                      id={message.id || `streaming-${message.role}`}
                      role={message.role}
                      content={message.content ?? ""}
                      isBookmarked={false}
                      displayName={profile?.display_name}
                    />
                  );
                }

                return null;
              })}
          </div>
        )}
        {isBusy && (
          <div className="mx-auto max-w-4xl">
            <div className="flex justify-start">
              <div className="rounded-2xl bg-white px-4 py-3 shadow-md dark:bg-slate-800">
                <div className="flex gap-1">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400"></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0.2s]"></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0.4s]"></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-slate-200 bg-white/80 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/80">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              placeholder="学びたい内容を入力してください..."
              className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400"
              disabled={isBusy || isInitializing}
            />
            <button
              type="submit"
              disabled={isBusy || isInitializing || !inputValue.trim()}
              className="rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 px-6 py-3 font-semibold text-white shadow-lg shadow-indigo-500/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-indigo-500/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 dark:from-indigo-500 dark:via-purple-500 dark:to-indigo-500"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}