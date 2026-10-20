"use client";

import { useEffect, useRef, useState } from "react";
import { mountRiftStage } from "./rift-stage";
import { takeExperienceAudio } from "../lib/experience-audio";
import "./rift.css";

export function RiftDetail() {
  const surface = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState("");
  const [hint, setHint] = useState("Press and drag to tear the dark open.");
  useEffect(() => {
    if (!surface.current || !canvas.current) return;
    const prepared = takeExperienceAudio("the-rift", surface.current);
    const stage = mountRiftStage(
      surface.current,
      canvas.current,
      {
        hint: setHint,
        error(cause) {
          setError(
            `${cause instanceof Error ? cause.message : String(cause)}. Press again to retry.`,
          );
        },
        clearError() {
          setError("");
        },
      },
      prepared,
    );
    return () => {
      void stage.dispose().catch(console.error);
    };
  }, []);
  return (
    <>
      <div
        ref={surface}
        className="rift-stage catalog-gesture-stage audio-gesture-surface"
        role="group"
        aria-label="The Rift stage"
        aria-describedby="rift-help"
        tabIndex={0}
      >
        <canvas ref={canvas} aria-hidden="true" />
        <div className="rift-caption" aria-hidden="true">
          <span>{hint}</span>
          <span>Procedural audio · No samples</span>
        </div>
      </div>
      <div className="rift-help">
        <p id="rift-help">
          Press and drag to tear a fracture; release and it stays open and keeps
          evolving. Drag away from the tear to widen it, along it to stretch it,
          and move fast to destabilize it. Push through the tear to the other
          side and release to collapse it. Keyboard: Enter opens, arrows shape,
          Space jolts, Escape collapses.
        </p>
        {error ? <p role="alert">{error}</p> : null}
      </div>
    </>
  );
}
