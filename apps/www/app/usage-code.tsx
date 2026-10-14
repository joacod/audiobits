"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

const subscribeHydration = () => () => {};

export function UsageCode({
  slug,
  code,
  disabled = false,
}: {
  slug: string;
  code: string;
  disabled?: boolean;
}) {
  const [status, setStatus] = useState("");
  const ready = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  async function copy() {
    setStatus("Copying…");
    try {
      await navigator.clipboard.writeText(code);
      setStatus("Copied.");
    } catch {
      setStatus(
        "Clipboard unavailable. Select the displayed code and copy it manually.",
      );
    }
  }
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
        disabled={!ready || disabled || status === "Copying…"}
        onClick={() => void copy()}
      >
        Copy usage
      </button>
      <pre>
        <code>{code}</code>
      </pre>
      <p role="status">{status}</p>
      <Link href="/docs/lifecycle">Production lifecycle</Link>
    </div>
  );
}
