import { SoundMark } from "./catalog-marks";

export function ExperienceMark({
  kind,
}: {
  kind: "charge" | "thruster" | "blade" | "pulse" | "rift" | "riff";
}) {
  if (kind === "rift")
    return (
      <svg className="experience-mark" viewBox="0 0 64 64" aria-hidden="true">
        <path
          d="M33 4 L28 18 L36 30 L27 44 L32 60 L37 44 L30 31 L38 18 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    );
  if (kind === "riff")
    return (
      <svg className="experience-mark" viewBox="0 0 64 64" aria-hidden="true">
        <path
          d="M26 6 L10 58 M32 6 L32 58 M38 6 L54 58 M8 46 L56 46"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <rect x="27" y="20" width="10" height="4" fill="currentColor" />
        <rect x="16" y="34" width="10" height="4" fill="currentColor" />
      </svg>
    );
  if (kind === "blade")
    return (
      <svg className="experience-mark" viewBox="0 0 64 64" aria-hidden="true">
        <path
          d="M23 44 L47 7"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M14 58 L23 44 M16 41 L29 49"
          stroke="currentColor"
          strokeWidth="4"
        />
      </svg>
    );
  if (kind === "pulse")
    return <SoundMark family="pulse" index={3} className="experience-mark" />;
  if (kind === "charge") {
    return (
      <svg className="experience-mark" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="5" fill="currentColor" />
        <circle
          cx="32"
          cy="32"
          r="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <circle
          cx="32"
          cy="32"
          r="24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    );
  }
  return (
    <svg className="experience-mark" viewBox="0 0 64 64" aria-hidden="true">
      <path
        d="M6 24c12-8 28-8 52 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M6 32c14-6 30 8 52 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M6 40c12 8 32 8 52-2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
