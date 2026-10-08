import { readFileSync } from "node:fs";
import { join } from "node:path";

// Package metadata only; runtime behavior comes through public exports.
const manifest = JSON.parse(
  readFileSync(
    join(process.cwd(), "../../packages/audiobits/package.json"),
    "utf8",
  ),
) as { name: string; version: string; private: boolean };
export const siteBuild = { version: manifest.version };
const rawSource = readFileSync(
  join(process.cwd(), "lib/raw-example.ts"),
  "utf8",
);
export function rawExampleSource() {
  return rawSource;
}
