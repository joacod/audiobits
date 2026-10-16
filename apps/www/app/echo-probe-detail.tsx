"use client";

import { useEffect, useRef, useState } from "react";
import { mountProbeStage } from "./echo-probe-stage";
import "./echo-probe.css";

export function EchoProbeDetail() {
  const surface = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState("");
  const [hint, setHint] = useState("Tap anywhere. Hear the space answer.");
  useEffect(() => {
    if (!surface.current || !canvas.current) return;
    const stage = mountProbeStage(surface.current, canvas.current, {
      hint: setHint,
      error(cause) {
        setError(
          `${cause instanceof Error ? cause.message : String(cause)}. Tap again to retry.`,
        );
      },
      clearError() {
        setError("");
      },
    });
    return () => {
      void stage.dispose().catch(console.error);
    };
  }, []);
  return (
    <>
      <div
        ref={surface}
        className="echo-probe-stage catalog-gesture-stage audio-gesture-surface"
        role="group"
        aria-label="Echo Probe stage"
        aria-describedby="echo-probe-help"
        tabIndex={0}
      >
        <canvas ref={canvas} aria-hidden="true" />
        <div className="echo-probe-caption" aria-hidden="true">
          <span>{hint}</span>
          <span>Pulse → surface → return</span>
        </div>
      </div>
      <div className="echo-probe-help">
        <p id="echo-probe-help">
          Tap different positions to change the returns. Wood knocks dry, metal
          rings long, glass shimmers. Headphones reveal direction. Enter emits
          at the center; Escape stops.
        </p>
        {error ? <p role="alert">{error}</p> : null}
      </div>
    </>
  );
}
