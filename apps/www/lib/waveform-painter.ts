// Adapted from audiocn LiveWaveform's static line and idle painters (MIT).
// https://github.com/audiocn/ui/blob/main/components/ui/live-waveform.tsx
// The frame source here is the existing AudioBits caller-owned analyser.
export function drawWaveform(
  paint: CanvasRenderingContext2D,
  width: number,
  height: number,
  samples: Float32Array,
): number {
  const middle = height / 2;
  paint.lineWidth = 1.5;
  paint.lineJoin = "round";
  paint.beginPath();
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    peak = Math.max(peak, Math.abs(samples[i]));
    const x = (i / (samples.length - 1)) * width;
    const value = Math.max(-1, Math.min(1, samples[i] * 16));
    const y = middle - value * (middle - paint.lineWidth);
    if (i === 0) paint.moveTo(x, y);
    else paint.lineTo(x, y);
  }
  paint.stroke();
  return peak;
}
export function drawIdle(
  paint: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  paint.globalAlpha = 0.35;
  for (let x = 0; x < width; x += 8) paint.fillRect(x, height / 2 - 0.5, 3, 1);
  paint.globalAlpha = 1;
}

export type VisualFamily = "pulse" | "harmonic" | "flow" | "threads";

/** Abstract sound portraits, not a calibrated scope. Displacement uses real output. */
export function drawPortrait(
  paint: CanvasRenderingContext2D,
  width: number,
  height: number,
  samples: Float32Array,
  family: VisualFamily,
): number {
  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  const energy = Math.min(1, peak * 16);
  paint.lineWidth = 1 + energy;
  if (family === "pulse") {
    for (let ring = 0; ring < 14; ring++) {
      const radius = height * (0.05 + ring * 0.027) + energy * (14 - ring) * 2;
      paint.globalAlpha = 0.2 + (14 - ring) / 20;
      paint.beginPath();
      paint.ellipse(
        width / 2,
        height / 2,
        radius * 1.7,
        radius,
        0,
        0,
        Math.PI * 2,
      );
      paint.stroke();
    }
  } else {
    const lines = family === "threads" ? 28 : family === "harmonic" ? 12 : 20;
    for (let line = 0; line < lines; line++) {
      paint.globalAlpha = 0.25 + (line / lines) * 0.6;
      paint.beginPath();
      for (let point = 0; point <= 120; point++) {
        const x = (point / 120) * width;
        const envelope = Math.sin((Math.PI * point) / 120);
        const sample = samples[Math.floor((point / 121) * samples.length)] ?? 0;
        const center =
          height / 2 + (line - lines / 2) * (family === "harmonic" ? 12 : 5);
        const shape = Math.sin(
          (point / 120) * Math.PI * (family === "flow" ? 2 : 3) + line * 0.13,
        );
        const y =
          center +
          envelope *
            (shape * height * 0.2 +
              Math.max(-1, Math.min(1, sample * 16)) * height * 0.16);
        if (point === 0) paint.moveTo(x, y);
        else paint.lineTo(x, y);
      }
      paint.stroke();
    }
  }
  paint.globalAlpha = 1;
  return peak;
}
