import { spawnSync } from "node:child_process";
import { chmodSync, existsSync } from "node:fs";

// Installs outside a Git checkout and CI must not change Git configuration.
if (process.argv.includes("--auto") && (process.env.CI || !existsSync(".git")))
  process.exit(0);

const hooks = ["pre-commit", "pre-push"];
const existing = spawnSync("git", ["config", "--get", "core.hooksPath"], {
  encoding: "utf8",
});
if (existing.status !== 0 && existing.status !== 1)
  throw new Error(existing.stderr || "Cannot read Git hook configuration");
const path = existing.stdout.trim();
if (path && path !== ".githooks")
  throw new Error(
    `core.hooksPath is already ${path}; integrate the repository pre-commit and pre-push hooks there instead.`,
  );
if (!path) {
  for (const name of hooks) {
    const hook = spawnSync(
      "git",
      ["rev-parse", "--git-path", `hooks/${name}`],
      { encoding: "utf8" },
    );
    if (hook.status !== 0)
      throw new Error(hook.stderr || "Cannot locate Git hooks");
    if (existsSync(hook.stdout.trim()))
      throw new Error(
        `An existing ${name} hook is installed; integrate the repository hooks there instead.`,
      );
  }
}
for (const name of hooks) chmodSync(`.githooks/${name}`, 0o755);
const result = spawnSync(
  "git",
  ["config", "--local", "core.hooksPath", ".githooks"],
  { stdio: "inherit" },
);
if (result.status !== 0) process.exit(result.status ?? 1);
console.log("Installed repository pre-commit and pre-push hooks.");
