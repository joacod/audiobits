"use client";

import { useEffect, useRef } from "react";
import { drawWaveform, drawIdle } from "../lib/waveform-painter";
import type { AudioEngine } from "audiobits";

/** A caller-owned tap: frame timing displays output, never schedules audio. */
export function OutputScope({
  engine,
  active,
}: {
  engine: AudioEngine | null;
  active: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const surface = canvas.current;
    const paint = surface?.getContext("2d");
    if (!surface || !paint) return;
    const color = getComputedStyle(surface).color;
    const clear = () => {
      paint.clearRect(0, 0, surface.width, surface.height);
      paint.strokeStyle = color;
      paint.fillStyle = color;
      drawIdle(paint, surface.width, surface.height);
      surface.dataset.peak = "0";
    };
    clear();
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    if (!engine || !active || engine.state !== "running") return;
    const native = engine.native;
    const analyser = native.context.createAnalyser();
    analyser.fftSize = 1024;
    const detach = native.connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    let frame = 0;
    const draw = () => {
      if (document.hidden || motion.matches || engine.state !== "running") {
        clear();
        return;
      }
      analyser.getFloatTimeDomainData(samples);
      paint.clearRect(0, 0, surface.width, surface.height);
      paint.strokeStyle = color;
      const peak = drawWaveform(paint, surface.width, surface.height, samples);
      surface.dataset.peak = String(peak);
      frame = requestAnimationFrame(draw);
    };
    const restart = () => {
      cancelAnimationFrame(frame);
      draw();
    };
    motion.addEventListener("change", restart);
    draw();
    return () => {
      cancelAnimationFrame(frame);
      motion.removeEventListener("change", restart);
      detach();
      analyser.disconnect();
      clear();
    };
  }, [engine, active]);
  return (
    <figure className="output-scope">
      <figcaption>
        <span>Generated locally. Audio assets: 0 bytes.</span>
        <span>
          {active
            ? "Live output · display gain ×16"
            : "Play to see the generated signal"}
        </span>
      </figcaption>
      <canvas
        ref={canvas}
        width={900}
        height={128}
        role="img"
        aria-label="Live output waveform; animation pauses for reduced motion"
      />
    </figure>
  );
}
