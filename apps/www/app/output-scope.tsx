"use client";

import { useEffect, useRef } from "react";
import { drawWaveform, drawIdle, drawPortrait } from "../lib/waveform-painter";
import type { VisualFamily } from "../lib/waveform-painter";
import type { AudioEngine } from "audiobits";

/** A caller-owned tap: visual timing never schedules audio. */
export function OutputScope({
  engine,
  active,
  family,
}: {
  engine: AudioEngine | null;
  active: boolean;
  family?: VisualFamily;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const surface = canvas.current;
    const paint = surface?.getContext("2d");
    if (!surface || !paint) return;
    const color = getComputedStyle(surface).color;
    const samples = new Float32Array(1024);
    const clear = () => {
      paint.clearRect(0, 0, surface.width, surface.height);
      paint.strokeStyle = color;
      paint.fillStyle = color;
      if (family)
        drawPortrait(
          paint,
          surface.width,
          surface.height,
          new Float32Array(1024),
          family,
        );
      else drawIdle(paint, surface.width, surface.height);
      surface.dataset.peak = "0";
    };
    clear();
    if (!engine || !active || engine.state !== "running") return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let analyser: AnalyserNode;
    let detach: () => void;
    // Optional display failure must leave the already-running sound alone.
    try {
      const native = engine.native;
      analyser = native.context.createAnalyser();
      analyser.fftSize = 1024;
      detach = native.connect(analyser);
    } catch {
      surface.dataset.display = "unavailable";
      return;
    }
    let frame = 0;
    let visible = false;
    const draw = () => {
      if (
        !visible ||
        document.hidden ||
        motion.matches ||
        engine.state !== "running"
      ) {
        clear();
        return;
      }
      analyser.getFloatTimeDomainData(samples);
      paint.clearRect(0, 0, surface.width, surface.height);
      paint.strokeStyle = color;
      const peak = family
        ? drawPortrait(paint, surface.width, surface.height, samples, family)
        : drawWaveform(paint, surface.width, surface.height, samples);
      surface.dataset.peak = String(peak);
      frame = requestAnimationFrame(draw);
    };
    const restart = () => {
      cancelAnimationFrame(frame);
      draw();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      restart();
    });
    observer.observe(surface);
    motion.addEventListener("change", restart);
    document.addEventListener("visibilitychange", restart);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      motion.removeEventListener("change", restart);
      document.removeEventListener("visibilitychange", restart);
      detach();
      analyser.disconnect();
      clear();
    };
  }, [engine, active, family]);
  return (
    <figure
      className={`output-scope ${family ? `sound-portrait portrait-${family}` : ""}`}
    >
      <canvas
        ref={canvas}
        width={900}
        height={family ? 360 : 128}
        role="img"
        aria-label={
          family
            ? `${family} sound portrait; driven by live output`
            : "Live output waveform; animation pauses for reduced motion"
        }
      />
      <figcaption>
        <span>
          {family
            ? "Generated locally · Audio assets: 0 bytes"
            : "Generated signal"}
        </span>
        <span>
          {active
            ? family
              ? "Responding to output"
              : "Live output · display gain ×16"
            : "Play to see the generated signal"}
        </span>
      </figcaption>
    </figure>
  );
}
