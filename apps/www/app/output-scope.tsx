"use client";

import { useEffect, useRef } from "react";
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
      paint.lineWidth = 1.5;
      paint.beginPath();
      paint.moveTo(0, surface.height / 2);
      paint.lineTo(surface.width, surface.height / 2);
      paint.stroke();
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
      paint.lineWidth = 1.5;
      paint.beginPath();
      let peak = 0;
      for (let i = 0; i < samples.length; i++) {
        peak = Math.max(peak, Math.abs(samples[i]));
        const x = (i / (samples.length - 1)) * surface.width;
        // Display gain only: the native graph and audible level are unchanged.
        const y =
          (0.5 - Math.max(-1, Math.min(1, samples[i] * 16)) * 0.42) *
          surface.height;
        if (i === 0) paint.moveTo(x, y);
        else paint.lineTo(x, y);
      }
      paint.stroke();
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
