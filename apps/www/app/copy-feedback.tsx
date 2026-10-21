"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const subscribeHydration = () => () => {};

export function useCopyFeedback() {
  const [status, setStatus] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ready = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  async function copy(text: string, failure: string, onError?: () => void) {
    if (timer.current !== null) clearTimeout(timer.current);
    setStatus("Copying…");
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Copied.");
      timer.current = setTimeout(() => setStatus(""), 2500);
    } catch {
      setStatus(failure);
      onError?.();
    }
  }

  return {
    copy,
    status,
    ready,
    copying: status === "Copying…",
    copied: status === "Copied.",
  };
}

export function CopyFeedbackLabel({
  label,
  copied,
}: {
  label: string;
  copied: boolean;
}) {
  return (
    <span className="copy-feedback-label" aria-hidden="true">
      <span style={{ visibility: copied ? "hidden" : "visible" }}>{label}</span>
      <span style={{ visibility: copied ? "visible" : "hidden" }}>
        ✓ Copied
      </span>
    </span>
  );
}
