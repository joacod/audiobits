import { expect, test } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { selectScope, parseNameStatus, metadataOnly } from "./select-scope.mjs";
import { checkRequired } from "./check-required.mjs";

const select = (...paths: string[]) =>
  selectScope(paths.map((path) => ({ path })));

test("prose and shipped metadata avoid unrelated website regressions", () => {
  expect(select("README.md")).toMatchObject({
    kind: "docs",
    package: false,
    site: false,
    consumers: false,
  });
  expect(select("packages/audiobits/README.md")).toMatchObject({
    kind: "artifact",
    package: true,
    site: false,
    consumers: false,
  });
  expect(
    selectScope([
      { path: "packages/audiobits/package.json", metadataOnly: true },
    ]),
  ).toMatchObject({ kind: "artifact", package: true, site: false });
  expect(
    selectScope([{ path: "README.md", executable: true }]).fullBrowser,
  ).toBe(true);
  expect(
    metadataOnly(
      "package.json",
      '{"version":"1","exports":{".":"a"}}',
      '{"version":"2","exports":{".":"a"}}',
    ),
  ).toBe(true);
  expect(
    metadataOnly(
      "package.json",
      '{"exports":{".":"a"}}',
      '{"exports":{".":"b"}}',
    ),
  ).toBe(false);
});

test("version metadata and consumed Changesets still select the artifact gate without website games", () => {
  expect(
    selectScope([
      { path: "packages/audiobits/package.json", metadataOnly: true },
      {
        path: "packages/audiobits/src/recipe/capabilities.json",
        metadataOnly: true,
      },
      { path: "packages/audiobits/CHANGELOG.md" },
      {
        path: ".changeset/consumed-change.md",
        deleted: true,
        executable: true,
      },
    ]),
  ).toMatchObject({
    kind: "artifact",
    package: true,
    site: false,
    consumers: false,
  });
});

test("runtime contracts retain packed consumers and full native/host regressions", () => {
  for (const path of [
    "packages/audiobits/src/runtime/engine.ts",
    "packages/audiobits/src/compiler/plan.ts",
    "packages/audiobits/src/recipe/schema.json",
    "packages/audiobits/tsdown.config.ts",
  ]) {
    expect(select(path)).toMatchObject({
      package: true,
      consumers: true,
      fullBrowser: true,
      site: true,
    });
  }
});

test("owning experiences select their full files, including the extended Riff song", () => {
  const riff = select("catalog/experiences/riff-reactor/controller.ts");
  expect(riff).toMatchObject({
    consumers: true,
    site: true,
    fullBrowser: false,
  });
  expect(riff.browserFiles).toContain("tests/browser/riff-reactor.spec.ts");
  expect(
    select(
      "catalog/experiences/riff-reactor/controller.ts",
      "tests/browser/riff-reactor.spec.ts",
    ),
  ).toMatchObject({ consumers: true, site: true, fullBrowser: false });
  expect(
    select("catalog/experiences/lightsaber/controller.ts").browserFiles,
  ).toContain("tests/browser/landing.spec.ts");
  expect(select("apps/www/app/riff-detail.tsx")).toMatchObject({
    consumers: false,
    site: true,
    fullBrowser: false,
  });
  expect(
    select("catalog/experiences/echo-probe/controller.ts").browserFiles,
  ).toEqual(
    expect.arrayContaining([
      "tests/browser/echo-probe.spec.ts",
      "tests/browser/echo-vision.spec.ts",
    ]),
  );
  expect(select("skills/audiobits/references/integration.md")).toMatchObject({
    consumers: true,
    site: true,
  });
});

test("shared, dependency, CI, mixed and unknown changes broaden conservatively", () => {
  for (const paths of [
    ["apps/www/lib/audio-gestures.ts"],
    ["apps/www/app/layout.tsx"],
    ["pnpm-lock.yaml"],
    [".github/workflows/ci.yml"],
    [".changeset/config.json"],
    ["future/source.ts"],
    ["apps/www/future/riff-unknown.ts"],
    ["README.md", "tests/browser/riff-reactor.spec.ts"],
    ["catalog/experiences/new-item/controller.ts"],
    ["catalog/recipes/new-item/recipe.ts"],
    ["README.md", "apps/www/app/riff-detail.tsx"],
  ]) {
    expect(select(...paths), paths.join(", ")).toMatchObject({
      fullBrowser: true,
      package: true,
      consumers: true,
      site: true,
    });
  }
});

test("new and modified browser specs run as complete files without tag filtering", () => {
  const path = "tests/browser/new-extended.spec.ts";
  expect(select(path)).toMatchObject({
    site: true,
    fullBrowser: false,
    browserFiles: [path],
  });
  expect(selectScope([{ path, deleted: true }]).fullBrowser).toBe(true);
  const changes = parseNameStatus(
    "R100\0tests/browser/old.spec.ts\0tests/browser/new.spec.ts\0D\0docs/removed.md\0A\0tests/browser/added.spec.ts\0M\0tests/browser/modified.spec.ts\0",
  );
  expect(changes).toEqual([
    { path: "tests/browser/old.spec.ts", deleted: true },
    { path: "tests/browser/new.spec.ts", deleted: false, added: true },
    { path: "docs/removed.md", deleted: true, added: false },
    { path: "tests/browser/added.spec.ts", deleted: false, added: true },
    { path: "tests/browser/modified.spec.ts", deleted: false, added: false },
  ]);
  expect(selectScope(changes).browserFiles).toEqual(
    expect.arrayContaining([
      "tests/browser/new.spec.ts",
      "tests/browser/added.spec.ts",
      "tests/browser/modified.spec.ts",
    ]),
  );
});

test("PR comparison uses the merge base and detects executable documentation changes", () => {
  const directory = mkdtempSync(join(tmpdir(), "audiobits-scope-"));
  const git = (...args: string[]) => {
    const result = spawnSync("git", args, { cwd: directory, encoding: "utf8" });
    expect(result.status, result.stderr).toBe(0);
    return result.stdout.trim();
  };
  const commit = () => {
    git("add", ".");
    git(
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
  const run = (base: string, head: string) => {
    const result = spawnSync(
      process.execPath,
      [resolve("scripts/ci/select-scope.mjs")],
      {
        cwd: directory,
        encoding: "utf8",
        env: {
          ...process.env,
          GITHUB_OUTPUT: "",
          EVENT_NAME: "pull_request",
          PR_BASE_SHA: base,
          PR_HEAD_SHA: head,
        },
      },
    );
    expect(result.status, result.stderr).toBe(0);
    return JSON.parse(result.stdout);
  };
  try {
    git("init", "--quiet");
    writeFileSync(
      join(directory, "README.md"),
      "Introduction\n\n```sh\npnpm install\n```\n",
    );
    const ancestor = commit();
    writeFileSync(
      join(directory, "README.md"),
      "Updated introduction\n\n```sh\npnpm install\n```\n",
    );
    const head = commit();
    git("checkout", "--quiet", ancestor);
    mkdirSync(join(directory, "packages/audiobits/src"), { recursive: true });
    writeFileSync(
      join(directory, "packages/audiobits/src/main.ts"),
      "main-only change",
    );
    const base = commit();
    git("checkout", "--quiet", head);
    expect(run(base, head)).toMatchObject({ kind: "docs", site: false });
    writeFileSync(
      join(directory, "README.md"),
      "Introduction\n\n```sh\npnpm different-command\n```\n",
    );
    const executable = commit();
    expect(run(base, executable).fullBrowser).toBe(true);
    mkdirSync(join(directory, "tests/browser"), { recursive: true });
    writeFileSync(
      join(directory, "tests/browser/old-extended.spec.ts"),
      "extended browser fixture",
    );
    const beforeRename = commit();
    git(
      "mv",
      "tests/browser/old-extended.spec.ts",
      "tests/browser/renamed-extended.spec.ts",
    );
    writeFileSync(
      join(directory, "tests/browser/added-extended.spec.ts"),
      "another extended browser fixture",
    );
    rmSync(join(directory, "README.md"));
    const renamed = commit();
    const selected = run(beforeRename, renamed);
    expect(selected.browserFiles).toEqual([
      "tests/browser/added-extended.spec.ts",
      "tests/browser/renamed-extended.spec.ts",
    ]);
    expect(selected.fullBrowser).toBe(true);
    rmSync(join(directory, "tests/browser/renamed-extended.spec.ts"));
    const missing = spawnSync(
      process.execPath,
      [resolve("scripts/ci/select-scope.mjs")],
      {
        cwd: directory,
        encoding: "utf8",
        env: {
          ...process.env,
          GITHUB_OUTPUT: "",
          EVENT_NAME: "pull_request",
          PR_BASE_SHA: beforeRename,
          PR_HEAD_SHA: renamed,
        },
      },
    );
    expect(missing.status).not.toBe(0);
    expect(missing.stderr).toContain("Changed browser spec is missing");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("the aggregation rejects failed, cancelled, missing and skipped required jobs", () => {
  const needs = Object.fromEntries(
    ["select-scope", "quality", "chromium-integration"].map((job) => [
      job,
      { result: "success" },
    ]),
  );
  expect(() => checkRequired(needs)).not.toThrow();
  expect(() =>
    checkRequired({ ...needs, "another-required-job": { result: "failure" } }),
  ).toThrow("another-required-job");
  for (const job of Object.keys(needs)) {
    for (const result of ["failure", "cancelled", "skipped", undefined])
      expect(() =>
        checkRequired({ ...needs, [job]: result ? { result } : undefined }),
      ).toThrow(job);
  }
});

test("the CI runner executes selected extended files and propagates command failure", () => {
  const directory = mkdtempSync(join(tmpdir(), "audiobits-runner-"));
  const record = join(directory, "commands.jsonl");
  writeFileSync(
    join(directory, "pnpm"),
    `#!${process.execPath}\nrequire('node:fs').appendFileSync(process.env.RECORD, JSON.stringify(process.argv.slice(2)) + '\\n');\nif (process.env.FAIL_COMMAND === process.argv[2]) process.exit(9);\n`,
    { mode: 0o755 },
  );
  const scope = select("tests/browser/riff-reactor.spec.ts");
  const run = (fail = "") =>
    spawnSync(
      process.execPath,
      [resolve("scripts/ci/run-checks.mjs"), "browser"],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${directory}:${process.env.PATH}`,
          CHECK_SCOPE: JSON.stringify(scope),
          RECORD: record,
          FAIL_COMMAND: fail,
        },
      },
    );
  try {
    const passed = run();
    expect(passed.status, passed.stderr).toBe(0);
    const commands = readFileSync(record, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as string[]);
    expect(commands).toContainEqual([
      "exec",
      "playwright",
      "test",
      "tests/browser/riff-reactor.spec.ts",
      "--max-failures=1",
    ]);
    expect(JSON.stringify(commands)).not.toContain("--grep");
    writeFileSync(record, "");
    const failed = run("build:lib");
    expect(failed.status).toBe(9);
    expect(readFileSync(record, "utf8").trim().split("\n")).toHaveLength(1);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
