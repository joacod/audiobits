"use client";

import { useEffect, useState } from "react";
import type { ThemedToken } from "shiki/core";
import type { CodeLanguage } from "../lib/highlight-code";
import { CodeBlock } from "./code-block";

export function LiveCodeBlock({
  code,
  lang = "typescript",
}: {
  code: string;
  lang?: CodeLanguage;
}) {
  const [highlighted, setHighlighted] = useState<{
    code: string;
    lang: CodeLanguage;
    tokens: ThemedToken[][];
  }>();

  useEffect(() => {
    let active = true;
    void import("../lib/highlight-code").then(async ({ highlightCode }) => {
      const tokens = await highlightCode(code, lang);
      if (active) setHighlighted({ code, lang, tokens });
    });
    return () => {
      active = false;
    };
  }, [code, lang]);

  return (
    <CodeBlock
      code={code}
      tokens={
        highlighted?.code === code && highlighted.lang === lang
          ? highlighted.tokens
          : undefined
      }
    />
  );
}
