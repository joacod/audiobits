import { spawnSync } from "node:child_process";
import { chmodSync, existsSync } from "node:fs";

const existing = spawnSync("git", ["config", "--get", "core.hooksPath"], {
  encoding: "utf8",
});
if (existing.status !== 0 && existing.status !== 1)
  throw new Error(existing.stderr || "Cannot read Git hook configuration");
const path = existing.stdout.trim();
if (path && path !== ".githooks")
  throw new Error(
    `core.hooksPath is already ${path}; integrate the pre-commit check there instead.`,
  );
if (!path) {
  const hook = spawnSync(
    "git",
    ["rev-parse", "--git-path", "hooks/pre-commit"],
    { encoding: "utf8" },
  );
  if (hook.status !== 0)
    throw new Error(hook.stderr || "Cannot locate Git hooks");
  if (existsSync(hook.stdout.trim()))
    throw new Error(
      "An existing pre-commit hook is installed; integrate the staged check there instead.",
    );
}
chmodSync(".githooks/pre-commit", 0o755);
const result = spawnSync(
  "git",
  ["config", "--local", "core.hooksPath", ".githooks"],
  { stdio: "inherit" },
);
if (result.status !== 0) process.exit(result.status ?? 1);
console.log("Installed repository pre-commit hook.");
