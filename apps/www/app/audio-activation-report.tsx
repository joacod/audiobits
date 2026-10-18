"use client";

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
  if (!error && !report) return null;
  return (
    <div
      className={`audio-activation-report ${className}`}
      role={error ? "alert" : undefined}
    >
      {error ? <p>{error}</p> : null}
      {report ? (
        <label>
          Last audio activation report. Select the text to copy.
          <textarea
            aria-label="Audio activation report"
            readOnly
            rows={8}
            value={report}
            spellCheck={false}
            onFocus={(event) => event.currentTarget.select()}
          />
        </label>
      ) : null}
    </div>
  );
}
