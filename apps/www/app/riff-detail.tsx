"use client";

import { useEffect, useRef, useState } from "react";
import { mountRiffStage } from "./riff-stage";
import { takeExperienceAudio } from "../lib/experience-audio";
import "./riff.css";

export function RiffReactorDetail() {
  const surface = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState("");
  const [hint, setHint] = useState("Tap the stage or press Enter to play.");
  useEffect(() => {
    if (!surface.current || !canvas.current) return;
    const prepared = takeExperienceAudio("riff-reactor", surface.current);
    const stage = mountRiffStage(
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
        className="riff-stage catalog-gesture-stage audio-gesture-surface"
        role="group"
        aria-label="Riff Reactor stage"
        aria-describedby="riff-help"
        tabIndex={0}
      >
        <canvas ref={canvas} className="riff-highway" aria-hidden="true" />
        <div className="riff-caption" aria-hidden="true">
          <span>{hint}</span>
          <span>Procedural audio · No samples</span>
        </div>
      </div>
      <div className="riff-help">
        <p id="riff-help">
          Reactor Core is an original 60-second synth-rock track. Hit each note
          as it crosses the line to play the lead: tap the left, middle or right
          third of the stage, or press A, S, D (also J, K, L or the arrow keys).
          A missed note leaves a gap in the melody while the band plays on.
          Streaks lift the band to harmony and then the full arrangement on the
          next bar; a miss drops it back. Enter plays, Escape stops.
        </p>
        {error ? <p role="alert">{error}</p> : null}
      </div>
    </>
  );
}
