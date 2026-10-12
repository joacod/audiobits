// AudioBits showcase colour values for contexts that cannot read CSS custom
// properties (next/og cards). brand-colors.test.ts keeps these equal to the
// `.foundation` tokens in app/globals.css.
export const brandColors = {
  void: "#050507",
  ink: "#f2f2f2",
  mute: "#8a8a92",
  graphite: "#1b1c1e",
  "graphite-edge": "#34363a",
  "signal-low": "#2a6cff",
  "signal-mid": "#b44cff",
  "signal-high": "#ff2e88",
} as const;
