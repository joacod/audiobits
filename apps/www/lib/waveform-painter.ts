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
