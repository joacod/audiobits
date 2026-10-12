export type Rgb = readonly [number, number, number];

function parse(value: string, fallback: Rgb): Rgb {
  const hex = value.trim().replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return fallback;
  return [0, 2, 4].map(
    (start) => parseInt(hex.slice(start, start + 2), 16) / 255,
  ) as unknown as Rgb;
}

/** Reads the Live Signal colour tokens from CSS so painters never own a hex value. */
export function readSignalPalette(element: Element) {
  const style = getComputedStyle(element);
  const neutral: Rgb = [0.5, 0.5, 0.5];
  const read = (name: string) => parse(style.getPropertyValue(name), neutral);
  return {
    low: read("--signal-low"),
    mid: read("--signal-mid"),
    high: read("--signal-high"),
    rest: read("--mute"),
  };
}
