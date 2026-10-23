import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
process.chdir(git("rev-parse", "--show-toplevel"));

try {
  // Git provides the refs actually being pushed, which can differ from HEAD.
  const updates = readFileSync(0, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => line.split(" "))
    .filter(([, object]) => !/^0+$/.test(object));
  if (updates.length === 0) process.exit(0);
  const head = git("rev-parse", "HEAD");
  for (const [ref, object] of updates) {
    if (git("rev-parse", "--verify", `${object}^{commit}`) !== head)
      throw new Error(
        `Check out ${ref} before pushing it so its contents are checked.`,
      );
  }
  const assertCheckout = () => {
    if (
      git("rev-parse", "HEAD") !== head ||
      git("status", "--porcelain", "--untracked-files=all")
    )
      throw new Error(
        "Push checks require a clean checkout of the commit being pushed. Commit or stash changes first.",
      );
  };
  assertCheckout();
  const result = spawnSync("pnpm", ["verify:push"], { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  // Builds can regenerate tracked files; do not validate different contents.
  assertCheckout();
} catch (error) {
  console.error(`Pre-push: ${error.message}`);
  process.exitCode = 1;
}
