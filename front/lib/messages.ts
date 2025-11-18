const JAPANESE_CHAR_PATTERN =
  /[\u3000-\u303f\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uff66-\uff9f]/;

export function splitEnglishAndJapanese(content: string): {
  english: string;
  japanese: string;
} {
  if (!content) {
    return { english: "", japanese: "" };
  }

  const trimmed = content.trim();

  // パターン1: 改行区切り形式（改行の後に括弧で囲まれた日本語がある場合）
  // 例: "English text\n(日本語訳)"
  const lines = trimmed.split(/\r?\n/).map((line) => line.trim());

  if (lines.length >= 2) {
    const lastLine = lines[lines.length - 1];

    // 最後の行が括弧で囲まれている場合（完全に括弧のみ）
    const fullParentheticalMatch = lastLine.match(/^[（(]([^()（）]+)[)）]$/);
    if (fullParentheticalMatch) {
      const japanese = fullParentheticalMatch[1].trim();
      const english = lines.slice(0, -1).join("\n").trim();
      return { english, japanese };
    }

    // 最後の行に括弧で囲まれた日本語が含まれている場合
    // 例: "English text (日本語訳)" または "English text\n(日本語訳)"
    const inlineParentheticalMatch = lastLine.match(/\(([^()（）]+)\)/);
    if (inlineParentheticalMatch) {
      const japanese = inlineParentheticalMatch[1].trim();
      const english = lastLine.replace(/\([^()（）]+\)/g, "").trim();
      const previousLines = lines.slice(0, -1).join("\n").trim();
      const fullEnglish = previousLines
        ? `${previousLines}\n${english}`
        : english;
      return { english: fullEnglish, japanese };
    }

    // 最後の行が日本語文字を含む場合（括弧なし）
    if (JAPANESE_CHAR_PATTERN.test(lastLine)) {
      const japanese = lastLine
        .replace(/^[（(]/, "")
        .replace(/[)）]$/, "")
        .trim();
      const english = lines.slice(0, -1).join("\n").trim();
      return { english, japanese };
    }
  }

  // パターン2: 同じ行に括弧で囲まれた日本語がある場合
  // 例: "English text (日本語訳)"
  const inlineMatch = trimmed.match(/^(.+?)\s*[（(]([^()（）]+)[)）]\s*$/);
  if (inlineMatch) {
    const english = inlineMatch[1].trim();
    const japanese = inlineMatch[2].trim();
    return { english, japanese };
  }

  // パターン3: 括弧に囲まれた日本語訳が末尾にある場合（改行なし、複数行の可能性）
  const endParentheticalMatch = trimmed.match(
    /(.+?)[\r\n]*[（(]([^()（）]+)[)）]\s*$/
  );
  if (endParentheticalMatch) {
    const english = endParentheticalMatch[1].trim();
    const japanese = endParentheticalMatch[2].trim();
    return { english, japanese };
  }

  return { english: trimmed, japanese: "" };
}
