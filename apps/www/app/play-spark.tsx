"use client";

import { useEffect, useRef } from "react";
import type { MouseEvent, ReactNode } from "react";

// Adapted from React Bits ClickSpark (David Haz). See licenses/react-bits.txt.
// Only runs for an intentional Play click; no idle animation loop.
export function PlaySpark({ children }: { children: ReactNode }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const frame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  function spark(event: MouseEvent<HTMLDivElement>) {
    const surface = canvas.current;
    const button =
      event.target instanceof Element ? event.target.closest("button") : null;
    if (
      !surface ||
      !button ||
      button.disabled ||
      document.hidden ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const paint = surface.getContext("2d");
    if (!paint) return;
    cancelAnimationFrame(frame.current);
    const rect = surface.getBoundingClientRect();
    surface.width = rect.width;
    surface.height = rect.height;
    const target = button.getBoundingClientRect();
    const x = event.detail
      ? event.clientX - rect.left
      : target.x + target.width / 2 - rect.left;
    const y = event.detail
      ? event.clientY - rect.top
      : target.y + target.height / 2 - rect.top;
    const start = performance.now();
    const draw = (now: number) => {
      paint.clearRect(0, 0, surface.width, surface.height);
      const progress = Math.min(1, (now - start) / 360);
      if (
        progress === 1 ||
        document.hidden ||
        matchMedia("(prefers-reduced-motion: reduce)").matches
      )
        return;
      const eased = progress * (2 - progress);
      paint.strokeStyle = getComputedStyle(surface).color;
      paint.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const angle = (2 * Math.PI * i) / 8;
        const distance = eased * 30;
        const length = 9 * (1 - eased);
        paint.beginPath();
        paint.moveTo(
          x + distance * Math.cos(angle),
          y + distance * Math.sin(angle),
        );
        paint.lineTo(
          x + (distance + length) * Math.cos(angle),
          y + (distance + length) * Math.sin(angle),
        );
        paint.stroke();
      }
      frame.current = requestAnimationFrame(draw);
    };
    frame.current = requestAnimationFrame(draw);
  }
  return (
    <div className="play-spark" onClick={spark}>
      <canvas ref={canvas} aria-hidden="true" />
      {children}
    </div>
  );
}
