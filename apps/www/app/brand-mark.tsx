// The approved audiobits mark (GUIDE v1.0). `small` is the 32 px and below
// variant: first bump dropped, thicker stroke. `tone="mono"` is the one-colour
// Ink stroke used as a non-live resting frame.
const paths = {
  full: {
    d: "M8 32 C14 32 15 26 20 26 S26 40 32 40 S38 14 44 14 S50 50 56 50",
    width: 6,
  },
  small: { d: "M9 36 C16 36 24 44 30 44 S39 11 45 11 S51 53 55 53", width: 8 },
} as const;

export function BrandMark({
  size,
  small = size <= 32,
  tone = "signal",
  frame = true,
  className,
}: {
  size: number;
  small?: boolean;
  tone?: "signal" | "mono";
  frame?: boolean;
  className?: string;
}) {
  const shape = small ? paths.small : paths.full;
  const gradient = `ab-mark-${small ? "small" : "full"}`;
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      {tone === "signal" ? (
        <defs>
          <linearGradient
            id={gradient}
            gradientUnits="userSpaceOnUse"
            x1="8"
            y1="0"
            x2="56"
            y2="0"
          >
            <stop offset="0" stopColor="var(--signal-low)" />
            <stop offset=".6" stopColor="var(--signal-mid)" />
            <stop offset="1" stopColor="var(--signal-high)" />
          </linearGradient>
        </defs>
      ) : null}
      {frame ? (
        <rect width="64" height="64" rx="14" fill="var(--void)" />
      ) : null}
      <path
        d={shape.d}
        fill="none"
        stroke={tone === "signal" ? `url(#${gradient})` : "currentColor"}
        strokeWidth={shape.width}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
