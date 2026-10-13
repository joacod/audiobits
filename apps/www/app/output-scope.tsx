"use client";

import { useEffect, useRef } from "react";
import { drawWaveform, drawIdle, drawPortrait } from "../lib/waveform-painter";
import type { VisualFamily } from "../lib/waveform-painter";
import type { AudioEngine } from "audiobits";
import { BrandMark } from "../icons/brand-mark";

/** A caller-owned tap: visual timing never schedules audio. */
export function OutputScope({
  engine,
  active,
  family,
  measured = false,
  signal = false,
}: {
  engine: AudioEngine | null | (() => AudioEngine | null);
  active: boolean;
  family?: VisualFamily;
  measured?: boolean;
  /** AudioBits showcase hero band: resting mark until real samples arrive, gradient only while live. */
  signal?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const figure = useRef<HTMLElement>(null);
  useEffect(() => {
    const surface = canvas.current;
    const paint = surface?.getContext("2d");
    if (!surface || !paint) return;
    const style = getComputedStyle(surface);
    const color = style.color;
    let stroke: string | CanvasGradient = color;
    if (signal || family) {
      const ramp = paint.createLinearGradient(0, 0, surface.width, 0);
      ramp.addColorStop(0, style.getPropertyValue("--signal-low").trim());
      ramp.addColorStop(0.6, style.getPropertyValue("--signal-mid").trim());
      ramp.addColorStop(1, style.getPropertyValue("--signal-high").trim());
      stroke = ramp;
    }
    const setLive = (live: boolean) => {
      if (figure.current) figure.current.dataset.live = String(live);
    };
    const setLevel = (peak: number) => {
      figure.current?.style.setProperty(
        "--level",
        String(Math.min(1, peak * 8).toFixed(3)),
      );
    };
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
      else if (!signal) drawIdle(paint, surface.width, surface.height);
      surface.dataset.peak = "0";
      setLive(false);
      setLevel(0);
    };
    clear();
    const audio = typeof engine === "function" ? engine() : engine;
    if (!audio || !active || audio.state !== "running") return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let analyser: AnalyserNode;
    let detach: () => void;
    // Optional display failure must leave the already-running sound alone.
    try {
      const native = audio.native;
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
      if (!visible || document.hidden || audio.state !== "running") {
        clear();
        return;
      }
      if (motion.matches) {
        // Reduced motion: the waveform stays still; only the meter follows output.
        clear();
        if (measured) {
          analyser.getFloatTimeDomainData(samples);
          let level = 0;
          for (const sample of samples)
            level = Math.max(level, Math.abs(sample));
          setLevel(level);
          frame = requestAnimationFrame(draw);
        }
        return;
      }
      analyser.getFloatTimeDomainData(samples);
      paint.clearRect(0, 0, surface.width, surface.height);
      paint.strokeStyle = stroke;
      if (signal) setLive(true);
      const peak = family
        ? drawPortrait(paint, surface.width, surface.height, samples, family)
        : drawWaveform(
            paint,
            surface.width,
            surface.height,
            samples,
            signal ? 4 : undefined,
          );
      surface.dataset.peak = String(peak);
      setLevel(peak);
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
  }, [engine, active, family, signal, measured]);
  const label =
    measured && family
      ? `Measured ${family} output`
      : family
        ? `${family} sound portrait; driven by live output`
        : "Live output waveform; animation pauses for reduced motion";
  const idleCaption = signal
    ? "Waiting for sound"
    : measured
      ? "Play to measure this sound"
      : "Play to see the generated signal";
  const liveCaption = measured
    ? "Live signal"
    : family
      ? "Responding to output"
      : "Live output · display gain ×16";
  return (
    <figure
      ref={figure}
      data-live="false"
      className={`output-scope ${family ? `sound-portrait portrait-${family}` : ""}${signal ? " signal-scope" : ""}`}
    >
      {signal ? (
        <BrandMark
          className="signal-rest"
          size={64}
          small={false}
          tone="mono"
          frame={false}
        />
      ) : null}
      <canvas
        ref={canvas}
        width={900}
        height={family ? 360 : 128}
        role="img"
        aria-label={label}
      />
      <figcaption>
        <span>
          {measured
            ? "Measured output"
            : family
              ? "Generated locally · Audio assets: 0 bytes"
              : "Generated signal"}
        </span>
        <span>{active ? liveCaption : idleCaption}</span>
      </figcaption>
      {measured ? <span className="led-meter" aria-hidden="true" /> : null}
    </figure>
  );
}
