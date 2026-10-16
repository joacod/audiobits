export function BladePreviewMark() {
  return (
    <svg className="catalog-blade-mark" viewBox="0 0 300 200">
      <path
        d="M110 162 L192 30"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path d="M95 188 L110 162" stroke="var(--mute)" strokeWidth="10" />
      <path
        d="M205 105 l12 -7 12 7 v14 l-12 7 -12 -7z"
        fill="none"
        stroke="var(--mute)"
      />
    </svg>
  );
}
