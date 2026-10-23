import { performance } from "node:perf_hooks";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, rmSync } from "node:fs";

const evidencePath = "node_modules/.cache/audiobits-release/evidence.json";
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const sourceCommit = git("rev-parse", "HEAD");
const dirtySource = Boolean(git("status", "--porcelain"));
// An interrupted/failed gate cannot leave earlier publication evidence usable.
rmSync(evidencePath, { force: true });
for (const command of [
  "verify:package",
  "prepare:runtime:prepared",
  "test:runtime:prepared",
  "test:package:prepared",
]) {
  const started = performance.now();
  const child = spawnSync("pnpm", [command], { stdio: "inherit" });
  console.log(
    `Publication phase ${command}: ${((performance.now() - started) / 1000).toFixed(1)}s`,
  );
  if (child.error) throw child.error;
  if (child.status !== 0) {
    rmSync(evidencePath, { force: true });
    process.exit(child.status ?? 1);
  }
}
const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
assert.equal(
  git("rev-parse", "HEAD"),
  sourceCommit,
  "Source changed during publication verification",
);
assert.equal(evidence.sourceCommit, sourceCommit);
evidence.dirtySource ||= dirtySource || Boolean(git("status", "--porcelain"));
evidence.publicationGate = "package-v1";
writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + "\n");
