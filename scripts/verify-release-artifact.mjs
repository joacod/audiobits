import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const directory = "node_modules/.cache/audiobits-release";
const evidence = JSON.parse(
  readFileSync(join(directory, "evidence.json"), "utf8"),
);
const manifest = JSON.parse(
  readFileSync("packages/audiobits/package.json", "utf8"),
);
assert.equal(evidence.dirtySource, false, "Release source must be clean");
assert.equal(evidence.version, manifest.version, "Release version must match");
assert.equal(
  evidence.archive,
  `audiobits-${manifest.version}.tgz`,
  "Release archive must match the verified package",
);
const archive = join(directory, evidence.archive);
assert.ok(statSync(archive).isFile(), "Release archive must exist");
assert.equal(
  createHash("sha256").update(readFileSync(archive)).digest("hex"),
  evidence.sha256,
  "Release archive must match the verified digest",
);
console.log(`archive=${archive}`);
