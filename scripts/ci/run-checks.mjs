import { performance } from "node:perf_hooks";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
const scope = JSON.parse(process.env.CHECK_SCOPE);
const phase = process.argv[2];
assert.ok(["quality", "browser"].includes(phase));
assert.ok(
  [
    "docs",
    "artifact",
    "runtime",
    "catalog",
    "site",
    "skill",
    "baseline",
    "mixed",
    "main",
  ].includes(scope.kind),
);
const run = (args, env = {}) => {
  const started = performance.now();
  const child = spawnSync("pnpm", args, {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  console.log(
    `Phase ${args.join(" ")}: ${((performance.now() - started) / 1000).toFixed(1)}s`,
  );
  if (child.error) throw child.error;
  if (child.status !== 0) process.exit(child.status ?? 1);
};
if (phase === "quality") {
  if (["docs", "artifact"].includes(scope.kind)) run(["lint"]);
  else run(["verify:local"]);
} else {
  if (scope.package || scope.consumers || scope.site) run(["build:lib"]);
  if (scope.package) {
    run(["verify:package:prepared"]);
    run(["test:package:prepared"]);
  }
  if (scope.consumers) run(["test:consumers:prepared"]);
  if (scope.site) {
    run(["build:prepared"]);
    run(["test:site-output"]);
    run(["exec", "node", "scripts/build-audio-tests.mjs"]);
  }
  if (scope.extended) run(["test:browser:full:prepared"]);
  else if (scope.site) {
    run(["test:runtime:prepared"]);
    const selected = scope.browserFiles;
    assert.ok(
      selected.every((file) => /^tests\/browser\/[\w-]+\.spec\.ts$/.test(file)),
    );
    run(
      ["test:browser:site:prepared"],
      selected.length
        ? {
            AUDIOBITS_BROWSER_SUITE: "regression",
            AUDIOBITS_BROWSER_FILES: JSON.stringify(selected),
          }
        : {},
    );
  }
}
