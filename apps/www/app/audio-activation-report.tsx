"use client";

import { useRef, useState } from "react";
import { CopyFeedbackLabel, useCopyFeedback } from "./copy-feedback";

/** Keep the last failure selectable even when releasing the hold resumes audio. */
export function AudioActivationReport({
  error,
  report,
  onRefresh,
  className = "",
}: {
  error: string;
  report: string;
  onRefresh?: () => void;
  className?: string;
}) {
  const [feedbackReport, setFeedbackReport] = useState("");
  const currentFeedback = feedbackReport === report;
  const field = useRef<HTMLTextAreaElement>(null);
  const { copy, status, ready, copying, copied } = useCopyFeedback();
  function copyReport() {
    setFeedbackReport(report);
    void copy(report, "Select the report text to copy.", () => {
      field.current?.focus();
      field.current?.select();
    });
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
          <button
            type="button"
            aria-label="Copy report"
            disabled={!ready || copying}
            onClick={copyReport}
          >
            <CopyFeedbackLabel
              label="Copy report"
              copied={copied && currentFeedback}
            />
          </button>
          {onRefresh ? (
            <button type="button" onClick={onRefresh}>
              Refresh report after retry
            </button>
          ) : null}
          <p
            className={copied || copying ? "sr-only" : undefined}
            role="status"
          >
            {currentFeedback ? status : ""}
          </p>
        </>
      ) : null}
    </div>
  );
}
