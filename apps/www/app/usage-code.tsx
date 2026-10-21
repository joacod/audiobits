"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { CopyFeedbackLabel, useCopyFeedback } from "./copy-feedback";
import { LiveCodeBlock } from "./live-code-block";

export function UsageCode({
  slug,
  code,
  disabled = false,
  children,
}: {
  slug: string;
  code: string;
  disabled?: boolean;
  children?: ReactNode;
}) {
  const { copy, status, ready, copying, copied } = useCopyFeedback();
  return (
    <div className="catalog-usage">
      <h3>Use this sound</h3>
      <p>
        Use in <code>src/integration.ts</code>. Call <code>play()</code> from a
        user gesture and handle activation errors. Connect updates to
        application state; stop on cancellation or hiding, and dispose on
        removal.
      </p>
      <button
        type="button"
        aria-label={`Copy ${slug} code`}
        disabled={!ready || disabled || copying}
        onClick={() =>
          void copy(
            code,
            "Clipboard unavailable. Select the displayed code and copy it manually.",
          )
        }
      >
        <CopyFeedbackLabel label="Copy usage" copied={copied} />
      </button>
      <p className={copied || copying ? "sr-only" : undefined} role="status">
        {status}
      </p>
      {children ?? <LiveCodeBlock code={code} />}
      <Link href="/docs/lifecycle">Production lifecycle</Link>
    </div>
  );
}
