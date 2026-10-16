import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { brandColors } from "../lib/brand-colors";
import { SocialWaveformMark } from "../icons/social-waveform";

// Social composition inspired by the README hero, drawn independently in code.
// ImageResponse cannot read CSS custom properties; brandColors mirrors the
// `.foundation` tokens and a unit test keeps them in sync.
const VOID = brandColors.void;
const INK = brandColors.ink;

const HEADLINE = ["SOUND", "THAT", "REACTS."];
const DESCRIPTOR = "procedural sound effects for the web";

export const alt = `audiobits: SOUND THAT REACTS. ${DESCRIPTOR}. Bold white lettering and a blue-to-purple-to-pink waveform on a near-black background.`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const fonts = join(process.cwd(), "node_modules/@fontsource");

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
      <SocialWaveformMark />
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
