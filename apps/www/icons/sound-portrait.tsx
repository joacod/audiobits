export function SoundPortrait({
  family,
}: {
  family: "pulse" | "harmonic" | "flow";
}) {
  return (
    <svg
      viewBox="0 0 180 90"
      aria-hidden="true"
      className={`preview-${family}`}
    >
      {family === "pulse"
        ? [12, 22, 32, 42].map((radius) => (
            <ellipse
              key={radius}
              cx="90"
              cy="45"
              rx={radius * 1.65}
              ry={radius}
            />
          ))
        : family === "harmonic"
          ? [24, 38, 52, 66].map((y) => (
              <path
                key={y}
                d={`M12 ${y} Q32 ${y - 8}, 52 ${y} T92 ${y} T132 ${y} T168 ${y}`}
              />
            ))
          : [0, 1, 2, 3, 4, 5].map((line) => (
              <path
                key={line}
                d={`M0 ${30 + line * 6} C45 ${-10 + line * 9}, 100 ${95 - line * 5}, 180 ${30 + line * 6}`}
              />
            ))}
    </svg>
  );
}
