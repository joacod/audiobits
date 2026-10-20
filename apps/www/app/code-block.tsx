import { Fragment } from "react";
import type { ThemedToken } from "shiki/core";

export function CodeBlock({
  code,
  tokens,
}: {
  code: string;
  tokens?: ThemedToken[][];
}) {
  return (
    <pre className="catalog-code">
      <code>
        {tokens
          ? tokens.map((line, index) => (
              <Fragment key={index}>
                {index > 0 ? "\n" : null}
                {line.map((token, column) => (
                  <span key={column} style={{ color: token.color }}>
                    {token.content}
                  </span>
                ))}
              </Fragment>
            ))
          : code}
      </code>
    </pre>
  );
}
