// Adapted from audiocn LiveWaveform's static line and idle painters (MIT).
// https://github.com/audiocn/ui/blob/main/components/ui/live-waveform.tsx
// The frame source here is the existing AudioBits caller-owned analyser.
export function drawWaveform(
  paint: CanvasRenderingContext2D,
  width: number,
  height: number,
  samples: Float32Array,
  lineWidth = 1.5,
): number {
  const middle = height / 2;
  paint.lineWidth = lineWidth;
  paint.lineCap = "round";
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

export type VisualFamily = "pulse" | "harmonic" | "flow";

/** Family portraits. Displacement uses measured output, and silence stays a single paint. */
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
  paint.lineWidth = 1.25;
  paint.lineJoin = "round";
  paint.fillStyle = paint.strokeStyle;
  if (family === "pulse") drawPulse(paint, width, height, samples, energy);
  else if (family === "harmonic") drawHarmonic(paint, width, height, samples);
  else drawFlow(paint, width, height, samples);
  paint.globalAlpha = 1;
  return peak;
}

function drawPulse(
  paint: CanvasRenderingContext2D,
  width: number,
  height: number,
  samples: Float32Array,
  energy: number,
) {
  const centerX = width / 2;
  const centerY = height / 2;
  for (let ring = 0; ring < 6; ring++) {
    const sample = Math.abs(
      samples[Math.floor((ring / 6) * samples.length)] ?? 0,
    );
    const kick = Math.min(1, sample * 16);
    const radius = height * (0.08 + ring * 0.07) + kick * (18 - ring * 2);
    paint.globalAlpha = 0.22 + (6 - ring) * 0.1;
    paint.beginPath();
    paint.ellipse(
      centerX,
      centerY,
      radius * 1.55,
      radius * 0.72,
      0,
      0,
      Math.PI * 2,
    );
    paint.stroke();
  }
  paint.globalAlpha = 0.9;
  paint.beginPath();
  paint.arc(centerX, centerY, 3 + energy * 10, 0, Math.PI * 2);
  paint.fill();
}

function drawHarmonic(
  paint: CanvasRenderingContext2D,
  width: number,
  height: number,
  samples: Float32Array,
) {
  const partials = 8;
  const gap = width / (partials + 1);
  for (let index = 0; index < partials; index++) {
    const start = Math.floor((index * samples.length) / partials);
    const end = Math.floor(((index + 1) * samples.length) / partials);
    let power = 0;
    for (let sample = start; sample < end; sample++) {
      power = Math.max(power, Math.abs(samples[sample] ?? 0));
    }
    const amount = Math.min(1, power * 16);
    const rise = height * (0.08 + amount * 0.36);
    const x = gap * (index + 1);
    paint.globalAlpha = 0.35 + amount * 0.65;
    paint.beginPath();
    paint.moveTo(x, height / 2 - rise);
    paint.lineTo(x, height / 2 + rise * 0.45);
    paint.stroke();
  }
}

function drawFlow(
  paint: CanvasRenderingContext2D,
  width: number,
  height: number,
  samples: Float32Array,
) {
  const lines = 6;
  const points = 80;
  for (let line = 0; line < lines; line++) {
    paint.globalAlpha = 0.28 + (line / lines) * 0.55;
    paint.beginPath();
    for (let point = 0; point <= points; point++) {
      const x = (point / points) * width;
      const sample =
        samples[Math.floor((point / points) * (samples.length - 1))] ?? 0;
      const drift = Math.max(-1, Math.min(1, sample * 16));
      const bow = Math.sin((point / points) * Math.PI);
      const y =
        height * (0.18 + (line / (lines - 1)) * 0.64) +
        bow * drift * height * 0.16;
      if (point === 0) paint.moveTo(x, y);
      else paint.lineTo(x, y);
    }
    paint.stroke();
  }
}
