import { expect, test } from "vitest";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "audiobits-push-"));
  const cwd = join(directory, "checkout");
  const bin = join(directory, "bin");
  const record = join(directory, "commands.jsonl");
  mkdirSync(cwd);
  mkdirSync(bin);
  mkdirSync(join(cwd, "scripts"));
  cpSync(resolve(".githooks"), join(cwd, ".githooks"), { recursive: true });
  for (const file of ["check-push.mjs", "install-hooks.mjs"])
    cpSync(resolve("scripts", file), join(cwd, "scripts", file));
  const env = {
    ...process.env,
    CI: "",
    PATH: `${bin}:${process.env.PATH}`,
    RECORD: record,
  };
  writeFileSync(
    join(bin, "pnpm"),
    `#!${process.execPath}
const fs = require('node:fs');
fs.appendFileSync(process.env.RECORD, JSON.stringify(process.argv.slice(2)) + '\\n');
if (process.env.DIRTY_CHECKOUT) fs.writeFileSync('generated.txt', 'changed');
process.exit(Number(process.env.CHECK_EXIT || 0));
`,
    { mode: 0o755 },
  );
  const git = (...args: string[]) => {
    const result = spawnSync("git", args, { cwd, env, encoding: "utf8" });
    expect(result.status, result.stderr).toBe(0);
    return result.stdout.trim();
  };
  git("init", "--quiet");
  const commit = () => {
    git("add", ".");
    git(
      "-c",
      "core.hooksPath=/dev/null",
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "-c",
      "commit.gpgsign=false",
      "commit",
      "--quiet",
      "-m",
      "fixture",
    );
    return git("rev-parse", "HEAD");
  };
  const head = commit();
  const install = (...args: string[]) =>
    spawnSync(process.execPath, ["scripts/install-hooks.mjs", ...args], {
      cwd,
      env,
      encoding: "utf8",
    });
  return { directory, cwd, bin, record, env, git, commit, head, install };
}

test("pre-push checks the pushed checkout, propagates failure and blocks the actual push", () => {
  const f = fixture();
  const zero = "0".repeat(40);
  const update = (object = f.head) =>
    `refs/heads/main ${object} refs/heads/main ${zero}\n`;
  const check = (input = update(), env = {}) =>
    spawnSync(process.execPath, ["scripts/check-push.mjs"], {
      cwd: f.cwd,
      input,
      env: { ...f.env, ...env },
      encoding: "utf8",
    });
  try {
    expect(f.install().status).toBe(0);
    expect(f.install().status).toBe(0);
    expect(f.git("config", "--local", "--get", "core.hooksPath")).toBe(
      ".githooks",
    );
    expect(check("").status).toBe(0);
    expect(check(update(zero)).status).toBe(0);
    expect(existsSync(f.record)).toBe(false);
    f.git(
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "tag",
      "-a",
      "fixture-tag",
      "-m",
      "fixture",
    );
    const tag = f.git("rev-parse", "fixture-tag");
    expect(
      check(
        update() +
          `refs/tags/fixture-tag ${tag} refs/tags/fixture-tag ${zero}\n`,
      ).status,
    ).toBe(0);
    expect(readFileSync(f.record, "utf8")).toBe('["verify:push"]\n');
    expect(check(update(), { CHECK_EXIT: "9" }).status).toBe(9);
    for (const staged of [false, true]) {
      writeFileSync(join(f.cwd, "new.txt"), "unverified");
      if (staged) f.git("add", "new.txt");
      const before = readFileSync(f.record, "utf8");
      const rejected = check();
      expect(rejected.status).toBe(1);
      expect(rejected.stderr).toContain("clean checkout");
      expect(readFileSync(f.record, "utf8")).toBe(before);
      expect(readFileSync(join(f.cwd, "new.txt"), "utf8")).toBe("unverified");
      if (staged) f.git("reset", "--quiet", "HEAD", "new.txt");
      rmSync(join(f.cwd, "new.txt"));
    }
    expect(check(update(), { DIRTY_CHECKOUT: "1" }).status).toBe(1);
    const next = f.commit();
    expect(check(update()).stderr).toContain("before pushing");
    expect(check(update(next)).status).toBe(0);

    const remote = join(f.directory, "remote.git");
    f.git("init", "--bare", "--quiet", remote);
    const push = (code: string) =>
      spawnSync("git", ["push", remote, "HEAD:refs/heads/checked"], {
        cwd: f.cwd,
        env: { ...f.env, CHECK_EXIT: code },
        encoding: "utf8",
      });
    const failed = push("9");
    expect(failed.status).not.toBe(0);
    expect(f.git("ls-remote", remote)).toBe("");
    const passed = push("0");
    expect(passed.status, passed.stderr).toBe(0);
    expect(f.git("ls-remote", remote)).toContain(`${next}\trefs/heads/checked`);
  } finally {
    rmSync(f.directory, { recursive: true, force: true });
  }
});

test("hook installation preserves existing hooks and automatic setup skips CI and archives", () => {
  const f = fixture();
  try {
    for (const name of ["pre-commit", "pre-push"]) {
      const path = join(f.cwd, ".git/hooks", name);
      writeFileSync(path, "existing hook");
      const result = f.install();
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain(`existing ${name}`);
      expect(readFileSync(path, "utf8")).toBe("existing hook");
      rmSync(path);
    }
    f.git("config", "--local", "core.hooksPath", "custom-hooks");
    expect(f.install().status).not.toBe(0);
    expect(f.git("config", "--get", "core.hooksPath")).toBe("custom-hooks");
    f.git("config", "--local", "--unset", "core.hooksPath");
    const automatic = (ci: string) =>
      spawnSync(process.execPath, ["scripts/install-hooks.mjs", "--auto"], {
        cwd: f.cwd,
        env: { ...f.env, CI: ci },
        encoding: "utf8",
      });
    expect(automatic("true").status).toBe(0);
    expect(
      spawnSync("git", ["config", "--local", "--get", "core.hooksPath"], {
        cwd: f.cwd,
      }).status,
    ).toBe(1);
    expect(automatic("").status).toBe(0);
    expect(f.git("config", "--get", "core.hooksPath")).toBe(".githooks");
    rmSync(join(f.cwd, ".git"), { recursive: true });
    expect(automatic("").status).toBe(0);
  } finally {
    rmSync(f.directory, { recursive: true, force: true });
  }
});
