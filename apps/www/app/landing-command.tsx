"use client";

import { useState } from "react";

export function LandingCommand({
  command,
  label,
}: {
  command: string;
  label: string;
}) {
  const [status, setStatus] = useState("");

  async function copy() {
    setStatus("Copying…");
    try {
      await navigator.clipboard.writeText(command);
      setStatus("Copied.");
    } catch {
      setStatus("Copy unavailable. Select and copy the command above.");
    }
  }

  return (
    <div className="landing-command">
      <div className="landing-command-row">
        <pre>
          <code>{command}</code>
        </pre>
        <button
          type="button"
          aria-label={`Copy ${label} command`}
          disabled={status === "Copying…"}
          onClick={copy}
        >
          Copy
        </button>
      </div>
      <p className="landing-copy-status" role="status">
        {status}
      </p>
    </div>
  );
}
