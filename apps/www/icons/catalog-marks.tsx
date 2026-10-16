export function SoundMark({
  family,
  index,
  className = "",
}: {
  family: "pulse" | "harmonic" | "flow";
  index: number;
  className?: string;
}) {
  const shift = index % 4;
  return (
    <svg
      className={`catalog-mark catalog-mark-${family} ${className}`.trim()}
      viewBox="0 0 64 64"
      aria-hidden="true"
    >
      {family === "pulse"
        ? [10, 18, 26].map((radius, ring) => (
            <ellipse
              key={radius}
              cx="32"
              cy="32"
              rx={radius * 1.15}
              ry={radius * 0.72}
              fill={ring === shift ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="1.5"
            />
          ))
        : family === "harmonic"
          ? [18, 28, 38, 48].map((y, line) => (
              <path
                key={y}
                d={`M6 ${y} Q18 ${y - 8 - shift}, 32 ${y} T58 ${y + (line === shift ? 3 : 0)}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            ))
          : [0, 1, 2, 3].map((line) => (
              <path
                key={line}
                d={`M0 ${16 + line * 12} C${18 + shift * 4} ${4 + line * 8}, ${40 - shift * 3} ${58 - line * 6}, 64 ${18 + line * 10}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            ))}
    </svg>
  );
}
