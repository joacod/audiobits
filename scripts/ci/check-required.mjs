import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
export function checkRequired(needs) {
  for (const job of new Set([
    "select-scope",
    "quality",
    "chromium-integration",
    ...Object.keys(needs),
  ])) {
    assert.equal(
      needs[job]?.result,
      "success",
      `${job} must succeed (got ${needs[job]?.result ?? "missing"})`,
    );
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url))
  checkRequired(JSON.parse(process.env.NEEDS_JSON));
