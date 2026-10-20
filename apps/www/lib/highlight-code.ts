import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import typescript from "@shikijs/langs/typescript";
import json from "@shikijs/langs/json";
import tokyoNight from "@shikijs/themes/tokyo-night";

export type CodeLanguage = "typescript" | "json";

const highlighter = createHighlighterCore({
  langs: [typescript, json],
  themes: [tokyoNight],
  engine: createJavaScriptRegexEngine(),
});

export async function highlightCode(code: string, lang: CodeLanguage) {
  return (await highlighter).codeToTokensBase(code, {
    lang,
    theme: "tokyo-night",
  });
}
