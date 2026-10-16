import { expect, test } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

test("staged checks inspect the index and preserve partial edits, including spaced filenames", () => {
  const cwd = mkdtempSync(join(tmpdir(), "audiobits-hook-"));
  const git = (...args: string[]) => execFileSync("git", args, { cwd });
  const file = join(cwd, "a file.mjs");
  const check = () =>
    spawnSync(process.execPath, [resolve("scripts/check-staged.mjs")], {
      cwd,
      encoding: "utf8",
    });
  try {
    git("init", "--quiet");
    writeFileSync(
      join(cwd, "eslint.config.mjs"),
      'export default [{ rules: { "no-debugger": "error" } }];\n',
    );
    writeFileSync(file, "const value = 1;\n");
    git("add", "a file.mjs");
    writeFileSync(file, "const value=2\n");
    expect(check().status).toBe(0);
    expect(git("show", ":a file.mjs").toString()).toBe("const value = 1;\n");
    git("add", "a file.mjs");
    writeFileSync(file, "const value = 2;\n");
    expect(check().status).toBe(1);
    writeFileSync(file, "debugger;\n");
    git("add", "a file.mjs");
    expect(check().status).toBe(1);
    git("rm", "--cached", "a file.mjs");
    expect(check().status).toBe(0);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
