import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { brandColors } from "../lib/brand-colors";

// Social composition inspired by the README hero, drawn independently in code.
// ImageResponse cannot read CSS custom properties; brandColors mirrors the
// `.foundation` tokens and a unit test keeps them in sync.
const VOID = brandColors.void;
const INK = brandColors.ink;
const SIGNAL = [
  brandColors["signal-low"],
  brandColors["signal-mid"],
  brandColors["signal-high"],
] as const;

const HEADLINE = ["SOUND", "THAT", "REACTS."];
const DESCRIPTOR = "procedural sound effects for the web";

export const alt = `audiobits: SOUND THAT REACTS. ${DESCRIPTOR}. Bold white lettering and a blue-to-purple-to-pink waveform on a near-black background.`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const fonts = join(process.cwd(), "node_modules/@fontsource");

// A stylized signal grows in amplitude and frequency from left to right.
const waveform = Array.from({ length: 221 }, (_, index) => {
  const progress = index / 220;
  const amplitude = 8 + 172 * progress;
  const phase = 2 * Math.PI * (1.4 * progress + 3.4 * progress ** 2);
  const y = 200 - Math.sin(phase) * amplitude;
  return `${index === 0 ? "M" : "L"}${index * 3} ${y.toFixed(1)}`;
}).join(" ");

export default async function Image() {
  const [display, mono] = await Promise.all([
    readFile(
      join(
        fonts,
        "big-shoulders-display/files/big-shoulders-display-latin-800-normal.woff",
      ),
    ),
    readFile(join(fonts, "geist-mono/files/geist-mono-latin-400-normal.woff")),
  ]);
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: VOID,
        color: INK,
        padding: "44px 56px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontFamily: "Geist Mono",
        }}
      >
        <div style={{ fontSize: 26 }}>audiobits</div>
        <div
          style={{
            fontSize: 20,
            color: INK,
            opacity: 0.75,
          }}
        >
          {DESCRIPTOR}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          fontFamily: "Big Shoulders Display",
          fontWeight: 800,
          fontSize: 156,
          lineHeight: 0.9,
          letterSpacing: "-3px",
          marginTop: 70,
        }}
      >
        {HEADLINE.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
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
    </div>,
    {
      ...size,
      fonts: [
        { name: "Big Shoulders Display", data: display, weight: 800 },
        { name: "Geist Mono", data: mono, weight: 400 },
      ],
    },
  );
}
