"use client";

import { CopyFeedbackLabel, useCopyFeedback } from "./copy-feedback";

export function LandingCommand({
  command,
  label,
}: {
  command: string;
  label: string;
}) {
  const { copy, status, ready, copying, copied } = useCopyFeedback();

  return (
    <div className="landing-command">
      <div className="landing-command-row">
        <pre>
          <code>{command}</code>
        </pre>
        <button
          type="button"
          aria-label={`Copy ${label} command`}
          disabled={!ready}
          aria-disabled={copying}
          onClick={() =>
            void copy(
              command,
              "Copy unavailable. Select and copy the command above.",
            )
          }
        >
          <CopyFeedbackLabel label="Copy" copied={copied} />
        </button>
      </div>
      <p className="landing-copy-status" role="status">
        <span className={copied || copying ? "sr-only" : undefined}>
          {status}
        </span>
      </p>
    </div>
  );
}
