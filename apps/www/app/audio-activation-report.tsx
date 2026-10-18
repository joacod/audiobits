"use client";

import { useRef, useState } from "react";

/** Keep the last failure selectable even when releasing the hold resumes audio. */
export function AudioActivationReport({
  error,
  report,
  className = "",
}: {
  error: string;
  report: string;
  className?: string;
}) {
  const field = useRef<HTMLTextAreaElement>(null);
  const [feedback, setFeedback] = useState({ report: "", message: "" });
  async function copyReport() {
    try {
      await navigator.clipboard.writeText(report);
      setFeedback({ report, message: "Report copied." });
    } catch {
      field.current?.focus();
      field.current?.select();
      setFeedback({ report, message: "Select the report text to copy." });
    }
  }
  if (!error && !report) return null;
  return (
    <div
      className={`audio-activation-report ${className}`}
      role={error ? "alert" : undefined}
    >
      {error ? <p>{error}</p> : null}
      {report ? (
        <>
          <label>
            Last audio activation report. Select the text to copy.
            <textarea
              ref={field}
              aria-label="Audio activation report"
              readOnly
              rows={8}
              value={report}
              spellCheck={false}
              onFocus={(event) => event.currentTarget.select()}
            />
          </label>
          <button type="button" onClick={copyReport}>
            Copy report
          </button>
          {feedback.report === report && feedback.message ? (
            <p role="status">{feedback.message}</p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
