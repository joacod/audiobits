import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { brandColors } from "./brand-colors";

test("brand colors match the Live Signal custom properties in globals.css", () => {
  const css = readFileSync(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );
  const start = css.indexOf("  :root {");
  expect(start).toBeGreaterThanOrEqual(0);
  const block = css.slice(start, css.indexOf("\n  }", start));
  for (const [name, value] of Object.entries(brandColors)) {
    const match = block.match(new RegExp(`--${name}:\\s*([^;]+);`));
    expect(match?.[1]?.trim().toLowerCase(), `--${name}`).toBe(value);
  }
});
