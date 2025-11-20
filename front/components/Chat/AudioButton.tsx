"use client";

import { useState, useEffect } from "react";
import { getSettings } from "@/app/actions/settings";
import { logStudyEvent } from "@/app/actions/analytics";
import type { UserSettings } from "@/app/actions/settings";

interface AudioButtonProps {
  text: string;
  messageId: string;
}

export function AudioButton({ text, messageId }: AudioButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentUtterance, setCurrentUtterance] =
    useState<SpeechSynthesisUtterance | null>(null);
  const [ttsSettings, setTtsSettings] = useState<{
    enabled: boolean;
    speed: "slow" | "normal" | "fast";
    voice: string | null;
  } | null>(null);

  // 設定を読み込む
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = await getSettings();
        console.log("AudioButton - Loading TTS settings from DB:", result);
        if (result.success) {
          const newTtsSettings = {
            enabled: result.settings.tts_enabled,
            speed: result.settings.tts_speed,
            voice: result.settings.tts_voice,
          };
          console.log("AudioButton - Setting TTS settings:", newTtsSettings);
          setTtsSettings(newTtsSettings);
        }
      } catch (error) {
        console.error("Failed to load TTS settings:", error);
        // デフォルト設定を使用
        setTtsSettings({
          enabled: true,
          speed: "normal",
          voice: null,
        });
      }
    };

    loadSettings();

    // カスタムイベントをリスンして、設定変更時に再読み込み
    const handleSettingsChanged = () => {
      console.log(
        "AudioButton - Settings changed event received, reloading..."
      );
      loadSettings();
    };

    window.addEventListener("settingsChanged", handleSettingsChanged);

    return () => {
      window.removeEventListener("settingsChanged", handleSettingsChanged);
    };
  }, []);

  const getSpeedRate = (speed: "slow" | "normal" | "fast"): number => {
    switch (speed) {
      case "slow":
        return 0.7;
      case "fast":
        return 1.3;
      case "normal":
      default:
        return 1.0;
    }
  };

  const handlePlay = async () => {
    // TTSが無効の場合は何もしない
    if (ttsSettings && !ttsSettings.enabled) {
      return;
    }

    // 既に再生中の場合は停止
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setCurrentUtterance(null);
      return;
    }

    try {
      // Web Speech APIを使用して音声を生成
      if ("speechSynthesis" in window) {
        // 既存の音声を停止
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-US";
        // 設定から速度を取得（設定がない場合はデフォルト値を使用）
        const speedToUse = ttsSettings?.speed || "normal";
        const rate = getSpeedRate(speedToUse);
        utterance.rate = rate;
        utterance.pitch = 1;
        utterance.volume = 1;

        // 声の種類を設定（可能な場合）
        if (ttsSettings?.voice && window.speechSynthesis) {
          const voices = window.speechSynthesis.getVoices();
          console.log(
            "AudioButton - Available voices:",
            voices.map((v) => ({ name: v.name, lang: v.lang }))
          );
          console.log(
            "AudioButton - Current tts_voice setting:",
            ttsSettings.voice
          );

          // voice設定値から性別を判定（female_1, male_1 など）
          const isFemale = ttsSettings.voice.toLowerCase().includes("female");
          const isMale = ttsSettings.voice.toLowerCase().includes("male");

          console.log("AudioButton - Voice gender:", { isFemale, isMale });

          let selectedVoice;

          if (isFemale) {
            // 女性の声を検索（優先順位: 1. Zira, 2. その他の女性の声）
            selectedVoice =
              voices.find(
                (v) =>
                  v.lang.startsWith("en") &&
                  (v.name.includes("Zira") || v.name.includes("Female"))
              ) ||
              voices.find(
                (v) =>
                  v.lang.startsWith("en") &&
                  !v.name.includes("David") &&
                  !v.name.includes("Male")
              );
          } else if (isMale) {
            // 男性の声を検索（優先順位: 1. David, 2. その他の男性の声）
            selectedVoice = voices.find(
              (v) =>
                v.lang.startsWith("en") &&
                (v.name.includes("David") || v.name.includes("Male"))
            );
          }

          if (selectedVoice) {
            utterance.voice = selectedVoice;
            console.log(
              "AudioButton - Selected voice:",
              selectedVoice.name,
              "for setting:",
              ttsSettings.voice
            );
          } else {
            console.warn(
              "AudioButton - No matching voice found for:",
              ttsSettings.voice,
              "Available:",
              voices.length
            );
          }
        } else {
          console.log(
            "AudioButton - TTS voice setting:",
            ttsSettings?.voice,
            "speechSynthesis available:",
            !!window.speechSynthesis
          );
        }

        utterance.onstart = () => {
          setIsPlaying(true);
          // 学習ログを記録（プライバシー設定で許可されている場合のみ）
          logStudyEvent("audio_play", {
            message_id: messageId,
            audio_speed: speedToUse,
            voice_type: ttsSettings?.voice || "default",
            text_length: text.length,
          }).catch((error) => {
            console.error("Failed to log audio play event:", error);
          });
        };
        utterance.onend = () => {
          setIsPlaying(false);
          setCurrentUtterance(null);
        };
        utterance.onerror = () => {
          setIsPlaying(false);
          setCurrentUtterance(null);
        };

        setCurrentUtterance(utterance);
        window.speechSynthesis.speak(utterance);
      } else {
        alert("このブラウザでは音声再生機能がサポートされていません");
      }
    } catch (error) {
      console.error("Audio playback error:", error);
      alert("音声再生中にエラーが発生しました");
    }
  };

  // TTSが無効の場合はボタンを表示しない
  if (ttsSettings && !ttsSettings.enabled) {
    return null;
  }

  return (
    <button
      onClick={handlePlay}
      className={`rounded p-1.5 transition-colors ${
        isPlaying
          ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300"
          : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
      }`}
      title={isPlaying ? "音声停止" : "音声再生"}
      aria-label={isPlaying ? "音声停止" : "音声再生"}
    >
      {isPlaying ? (
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
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
          />
        </svg>
      ) : (
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
            d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
          />
        </svg>
      )}
    </button>
  );
}
