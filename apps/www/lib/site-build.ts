import { readFileSync } from "node:fs";
import { join } from "node:path";
import { experienceExample } from "./experience-example";

// Package metadata only; runtime behavior comes through public exports.
const manifest = JSON.parse(
  readFileSync(
    join(process.cwd(), "../../packages/audiobits/package.json"),
    "utf8",
  ),
) as { name: string; version: string; private: boolean };
export const siteBuild = { version: manifest.version };
export function experienceUsage(slug: string) {
  return experienceExample(
    slug,
    readFileSync(
      join(process.cwd(), "../../catalog/experiences", slug, "README.md"),
      "utf8",
    ),
  );
}
