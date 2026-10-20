type SignalFamily =
  "pulse" | "harmonic" | "flow" | "charge" | "thruster" | "blade" | "rift";

/** Static sound cover art, never a measurement or a second audio renderer. */
export function SignalArtwork({ family }: { family: SignalFamily }) {
  const rings = family === "pulse" || family === "charge";
  return (
    <svg
      className={`signal-artwork signal-artwork-${family}`}
      viewBox="0 0 600 360"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {family === "rift"
        ? Array.from({ length: 14 }, (_, i) => {
            const spread = (i - 6.5) * (4 + i);
            return (
              <path
                key={i}
                d={`M${300 + spread * 0.2} 20 L${292 + spread} 110 L${312 + spread * 1.2} 180 L${288 + spread} 250 L${300 + spread * 0.2} 340`}
                opacity={0.2 + (1 - Math.abs(i - 6.5) / 6.5) * 0.8}
              />
            );
          })
        : rings
          ? Array.from({ length: 24 }, (_, i) => (
              <ellipse
                key={i}
                cx="300"
                cy="180"
                rx={30 + i * 9}
                ry={(family === "charge" ? 24 : 9) + i * 5.4}
                transform={`rotate(${family === "charge" ? -28 : -18} 300 180)`}
                opacity={0.25 + (i / 24) * 0.75}
              />
            ))
          : family === "blade"
            ? Array.from({ length: 18 }, (_, i) => (
                <path
                  key={i}
                  d={`M${110 + i * 8} 330 L${355 + i * 8} 30`}
                  opacity={0.15 + (i / 18) * 0.85}
                />
              ))
            : Array.from({ length: 28 }, (_, i) => {
                const y = 60 + i * 9;
                return (
                  <path
                    key={i}
                    d={
                      family === "harmonic"
                        ? `M-20 ${y} C110 ${y - 160}, 170 ${y + 170}, 300 ${y} S490 ${y - 160}, 620 ${y}`
                        : `M-20 ${y} C150 ${y + 190 - i * 5}, 320 ${y - 220 + i * 4}, 620 ${y - 30}`
                    }
                    opacity={0.25 + (i / 28) * 0.75}
                  />
                );
              })}
    </svg>
  );
}
