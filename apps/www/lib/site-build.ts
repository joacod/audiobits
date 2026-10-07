import { readFileSync } from "node:fs";
import { join } from "node:path";
import { documentationChannel } from "./documentation-channel";

// Package metadata only; runtime behavior comes through public exports.
const manifest = JSON.parse(
  readFileSync(
    join(process.cwd(), "../../packages/audiobits/package.json"),
    "utf8",
  ),
) as { name: string; version: string; private: boolean };
export const siteBuild = documentationChannel(manifest, {
  channel: process.env.AUDIOBITS_DOCS_CHANNEL,
  releasedVersion: process.env.AUDIOBITS_RELEASED_VERSION,
  source: process.env.AUDIOBITS_DOCS_SOURCE,
});
export function rawExampleSource() {
  return readFileSync(join(process.cwd(), "lib/raw-example.ts"), "utf8");
}
