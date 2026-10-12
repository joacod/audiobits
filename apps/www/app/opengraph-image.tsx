import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Social card per the approved asset set (assets/social, brand guide v1.0).
// ImageResponse cannot read CSS custom properties, so the card repeats the
// Void, Ink, Mute and signal values from the `.foundation` tokens.
const VOID = "#050507";
const INK = "#f2f2f2";
const MUTE = "#8a8a92";
const SIGNAL = ["#2a6cff", "#b44cff", "#ff2e88"] as const;

// PLACEHOLDER copy pending Positioning/Voice. Replace with the real line.
const TAGLINE = "sound driven by state, for the web";

export const alt = `audiobits wordmark with the waveform mark and the line: ${TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const fonts = join(process.cwd(), "node_modules/@fontsource");

function gradient(id: string) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor={SIGNAL[0]} />
        <stop offset="0.6" stopColor={SIGNAL[1]} />
        <stop offset="1" stopColor={SIGNAL[2]} />
      </linearGradient>
    </defs>
  );
}

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
        padding: "100px 84px 0",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
        <svg width="84" height="84" viewBox="0 0 64 64">
          {gradient("m")}
          <path
            d="M8 32 C14 32 15 26 20 26 S26 40 32 40 S38 14 44 14 S50 50 56 50"
            fill="none"
            stroke="url(#m)"
            strokeWidth="6"
            strokeLinecap="round"
          />
        </svg>
        <div
          style={{
            fontFamily: "Big Shoulders Display",
            fontSize: 150,
            lineHeight: 1,
          }}
        >
          audiobits
        </div>
      </div>
      <div
        style={{
          fontFamily: "Geist Mono",
          fontSize: 30,
          color: MUTE,
          marginTop: 48,
        }}
      >
        {TAGLINE}
      </div>
      <svg
        width="1200"
        height="240"
        viewBox="0 0 1200 240"
        style={{ position: "absolute", left: 0, bottom: 20 }}
      >
        {gradient("w")}
        <path
          d="M0 140 C120 140 180 120 260 128 S380 178 440 160 S560 50 660 54 S780 210 880 214 S1040 70 1200 70"
          fill="none"
          stroke="url(#w)"
          strokeWidth="7"
          strokeLinecap="round"
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
