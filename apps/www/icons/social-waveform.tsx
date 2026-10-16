import { brandColors } from "../lib/brand-colors";

const SIGNAL = [
  brandColors["signal-low"],
  brandColors["signal-mid"],
  brandColors["signal-high"],
] as const;

// A stylized signal grows in amplitude and frequency from left to right.
const waveform = Array.from({ length: 221 }, (_, index) => {
  const progress = index / 220;
  const amplitude = 8 + 172 * progress;
  const phase = 2 * Math.PI * (1.4 * progress + 3.4 * progress ** 2);
  const y = 200 - Math.sin(phase) * amplitude;
  return `${index === 0 ? "M" : "L"}${index * 3} ${y.toFixed(1)}`;
}).join(" ");

export function SocialWaveformMark() {
  return (
    <svg
      width="660"
      height="400"
      viewBox="0 0 660 400"
      style={{ position: "absolute", right: 0, top: 166 }}
    >
      <defs>
        <linearGradient id="signal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={SIGNAL[0]} />
          <stop offset="0.6" stopColor={SIGNAL[1]} />
          <stop offset="1" stopColor={SIGNAL[2]} />
        </linearGradient>
      </defs>
      <path
        d={waveform}
        fill="none"
        stroke="url(#signal)"
        strokeWidth="26"
        strokeOpacity="0.18"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={waveform}
        fill="none"
        stroke="url(#signal)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
