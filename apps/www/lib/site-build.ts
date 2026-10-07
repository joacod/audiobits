import { readFileSync } from "node:fs";
import { join } from "node:path";

// Package metadata only; runtime behavior comes through public exports.
const manifest = JSON.parse(
  readFileSync(
    join(process.cwd(), "../../packages/audiobits/package.json"),
    "utf8",
  ),
) as { version: string; private: boolean };
export const siteBuild = {
  version: manifest.version,
  channel:
    manifest.private || manifest.version === "0.0.0"
      ? "Unreleased"
      : "Development",
  source: "Local workspace package",
};
export function rawExampleSource() {
  return readFileSync(join(process.cwd(), "lib/raw-example.ts"), "utf8");
}
