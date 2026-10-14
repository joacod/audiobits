"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

function isRecognizedChromium() {
  // Informational only: browser identification cannot establish support.
  try {
    const browser = navigator as Navigator & {
      userAgentData?: { brands?: { brand: string }[] };
    };
    const ua = browser.userAgent;
    // iOS browser branding does not identify a Chromium engine.
    if (/iPhone|iPad|iPod|CriOS|EdgiOS|FxiOS/i.test(ua)) return false;
    if (
      browser.userAgentData?.brands?.some(({ brand }) => brand === "Chromium")
    )
      return true;
    return /\b(?:Chrome|Chromium)\/\d/.test(ua);
  } catch {
    return false;
  }
}

export function BrowserNotice() {
  const recognized = useSyncExternalStore(
    subscribe,
    isRecognizedChromium,
    () => null,
  );

  return (
    <p className="browser-notice" data-visible={recognized === false}>
      AudioBits is currently tested in Chromium-based browsers. Other browsers
      are not yet verified.
    </p>
  );
}
