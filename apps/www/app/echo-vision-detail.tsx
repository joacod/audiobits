"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { takeExperienceAudio } from "../lib/experience-audio";
import { visionSurfaces } from "../lib/echo-vision";
import { mountEchoVisionStage, type VisionView } from "./echo-vision-stage";
import "./echo-vision.css";

export function EchoVisionDetail() {
  const surface = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [view, setView] = useState<VisionView>({
    state: "quiet",
    entered: false,
    hint: "Aim and click. Let the echoes draw the room.",
  });
  const [error, setError] = useState("");
  useEffect(() => {
    if (!surface.current || !canvas.current) return;
    const element = surface.current,
      target = canvas.current;
    const prepared = takeExperienceAudio("echo-vision", element);
    let stage: ReturnType<typeof mountEchoVisionStage> | undefined;
    const frame = requestAnimationFrame(() => {
      try {
        stage = mountEchoVisionStage(
          element,
          target,
          {
            view: setView,
            error(cause) {
              setError(
                `${cause instanceof Error ? cause.message : String(cause)}. Click again to retry audio.`,
              );
            },
            clearError() {
              setError("");
            },
          },
          prepared,
        );
      } catch (cause) {
        setError(
          `${cause instanceof Error ? cause.message : String(cause)}. Reload to reconnect the room.`,
        );
        void prepared?.dispose().catch(console.error);
      }
    });
    return () => {
      cancelAnimationFrame(frame);
      if (stage) void stage.dispose().catch(console.error);
      else void prepared?.dispose().catch(console.error);
    };
  }, []);
  return (
    <>
      <div
        ref={surface}
        className="echo-vision-stage catalog-gesture-stage audio-gesture-surface"
        role="group"
        aria-label="Echo Vision stage"
        aria-describedby="echo-vision-help"
        tabIndex={0}
      >
        <canvas ref={canvas} aria-hidden="true" />
        <div className="echo-vision-header">
          <span>Echo vision</span>
          <button
            type="button"
            aria-label="Stop echoes"
            hidden={view.state === "quiet"}
          >
            Stop echoes
          </button>
        </div>
        {!view.entered ? (
          <div className="echo-vision-invitation" aria-hidden="true">
            <h2>See with sound.</h2>
            <p>
              Aim and click to send a pulse.
              <br />
              The echoes reveal what is here.
            </p>
            <span>One pulse. Then listen.</span>
          </div>
        ) : null}
        <div className="echo-vision-reticle" aria-hidden="true" />
        {visionSurfaces.map((value) => (
          <span
            key={value.id}
            className="echo-vision-label"
            data-echo-surface={value.id}
            data-material={value.material}
            aria-hidden="true"
          >
            {value.label}
          </span>
        ))}
        <div className="echo-vision-caption">
          <p role="status">{view.hint}</p>
          <span>Click to pulse · Headphones for direction</span>
        </div>
      </div>
      <div className="echo-vision-help">
        <p id="echo-vision-help">
          Move to aim, then click to send one pulse. On touch, tap or drag and
          release. Nearby surfaces answer first. Wood knocks dry, metal rings,
          glass shimmers. Each echo briefly reveals its surface, then the room
          fades back into darkness. There is no background sound or automatic
          scan. Enter or Space emits; arrows aim; Escape stops.
        </p>
        <p>
          Powered by <Link href="/catalog/echo-probe">Echo Probe</Link>. The 3D
          room supplies reflection data to its existing sound controller.
        </p>
        {error ? <p role="alert">{error}</p> : null}
      </div>
    </>
  );
}
