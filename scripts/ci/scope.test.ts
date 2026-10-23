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
import {
  selectScope,
  parseNameStatus,
  metadataOnly,
  scopeForEvent,
} from "./select-scope.mjs";
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
  expect(selectScope([{ path: "README.md", executable: true }])).toMatchObject({
    kind: "baseline",
    site: true,
    extended: false,
  });
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

test("version metadata and consumed Changesets retain the independent artifact gate", () => {
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

test("runtime and distribution contracts retain packed consumers with bounded native/website coverage", () => {
  for (const path of [
    "packages/audiobits/src/runtime/engine.ts",
    "packages/audiobits/src/compiler/plan.ts",
    "packages/audiobits/src/recipe/schema.json",
    "packages/audiobits/tsdown.config.ts",
  ]) {
    expect(select(path)).toMatchObject({
      package: true,
      consumers: true,
      site: true,
      extended: false,
      browserFiles: [],
    });
  }
  for (const path of [
    "registry.json",
    "catalog/experiences/riff-reactor/controller.ts",
    "catalog/experiences/new-item/controller.ts",
    "catalog/recipes/new-item/recipe.ts",
    "skills/audiobits/references/integration.md",
    "tools/mcp/server.ts",
  ]) {
    expect(select(path)).toMatchObject({
      consumers: true,
      site: true,
      extended: false,
      browserFiles: [],
    });
  }
});

test("presentation changes and prose combine without selecting installed consumers or historical owners", () => {
  for (const paths of [
    ["apps/www/app/riff-detail.tsx"],
    ["apps/www/lib/audio-gestures.ts"],
    ["README.md", "apps/www/app/riff-detail.tsx"],
    ["apps/www/content/docs/(runtime)/index.mdx"],
  ])
    expect(select(...paths)).toMatchObject({
      package: false,
      consumers: false,
      site: true,
      extended: false,
      browserFiles: [],
    });
  expect(
    select("apps/www/app/riff-detail.tsx", "packages/audiobits/README.md"),
  ).toMatchObject({
    package: true,
    consumers: false,
    site: true,
    extended: false,
  });
  expect(
    select("README.md", "catalog/experiences/new-item/controller.ts"),
  ).toMatchObject({
    consumers: true,
    site: true,
    extended: false,
    browserFiles: [],
  });
});

test("shared, CI, dependency and unknown changes select the bounded baseline plus distribution checks", () => {
  for (const path of [
    "pnpm-lock.yaml",
    ".github/workflows/ci.yml",
    ".changeset/config.json",
    "future/source.ts",
    "tests/browser/experience-probe.ts",
  ]) {
    expect(select(path)).toMatchObject({
      kind: "baseline",
      package: true,
      consumers: true,
      site: true,
      extended: false,
      browserFiles: [],
    });
  }
});

test("new and modified regression files are explicit without requiring a baseline tag", () => {
  const path = "tests/browser/new-regression.spec.ts";
  expect(select(path)).toMatchObject({
    site: true,
    extended: false,
    browserFiles: [path],
  });
  expect(selectScope([{ path, deleted: true }])).toMatchObject({
    site: true,
    extended: false,
    browserFiles: [],
  });
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
  expect(selectScope(changes).browserFiles).toEqual([
    "tests/browser/added.spec.ts",
    "tests/browser/modified.spec.ts",
    "tests/browser/new.spec.ts",
  ]);
});

test("only explicit manual runs select extended browser evidence", () => {
  expect(() => scopeForEvent("push")).toThrow("Unsupported CI event");
  expect(() => scopeForEvent(undefined)).toThrow("Unsupported CI event");
  expect(scopeForEvent("workflow_dispatch")).toMatchObject({
    package: true,
    consumers: true,
    site: true,
    extended: true,
  });
  expect(() => scopeForEvent("pull_request", "main", "head")).toThrow(
    "full base/head SHAs",
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
    expect(run(base, executable)).toMatchObject({
      site: true,
      extended: false,
    });
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
    expect(selected.extended).toBe(false);
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

test("the CI runner executes untagged regression files and propagates command failure", () => {
  const directory = mkdtempSync(join(tmpdir(), "audiobits-runner-"));
  const record = join(directory, "commands.jsonl");
  writeFileSync(
    join(directory, "pnpm"),
    `#!${process.execPath}\nrequire('node:fs').appendFileSync(process.env.RECORD, JSON.stringify(process.argv.slice(2)) + '\\n');\nif (process.env.FAIL_COMMAND === process.argv[2]) process.exit(9);\nif (process.argv[2] === 'test:browser:site:prepared' && (process.env.AUDIOBITS_BROWSER_SUITE !== 'regression' || !JSON.parse(process.env.AUDIOBITS_BROWSER_FILES).includes('tests/browser/riff-reactor.spec.ts'))) process.exit(12);\n`,
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
    expect(commands).toContainEqual(["test:runtime:prepared"]);
    expect(commands).toContainEqual(["test:browser:site:prepared"]);
    expect(commands.flat()).not.toContain("test:browser:full:prepared");
    expect(
      commands.filter(([name]) => name === "test:browser:site:prepared"),
    ).toHaveLength(1);
    expect(commands.flat()).not.toContain("playwright");
    writeFileSync(record, "");
    const failed = run("build:lib");
    expect(failed.status).toBe(9);
    expect(readFileSync(record, "utf8").trim().split("\n")).toHaveLength(1);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("CI keeps unit and distribution evidence without repeating local preflight or package units", () => {
  const directory = mkdtempSync(join(tmpdir(), "audiobits-ci-phases-"));
  const record = join(directory, "commands.jsonl");
  writeFileSync(
    join(directory, "pnpm"),
    `#!${process.execPath}
require('node:fs').appendFileSync(process.env.RECORD, JSON.stringify(process.argv.slice(2)) + '\\n');
if (process.env.FAIL_COMMAND === process.argv[2]) process.exit(9);
`,
    { mode: 0o755 },
  );
  const run = (
    scope: ReturnType<typeof selectScope>,
    phase: string,
    fail = "",
  ) => {
    writeFileSync(record, "");
    const result = spawnSync(
      process.execPath,
      [resolve("scripts/ci/run-checks.mjs"), phase],
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
    const commands = readFileSync(record, "utf8")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as string[]);
    return { result, commands };
  };
  try {
    const baseline = select("package.json");
    const quality = run(baseline, "quality");
    expect(quality.result.status, quality.result.stderr).toBe(0);
    expect(quality.commands).toEqual([
      ["build:lib"],
      ["test"],
      ["check:skill"],
      ["test:mcp:prepared"],
    ]);
    const browser = run(baseline, "browser");
    expect(browser.result.status, browser.result.stderr).toBe(0);
    expect(browser.commands).toContainEqual(["test:package:prepared"]);
    expect(browser.commands).toContainEqual(["test:consumers:prepared"]);
    expect(browser.commands).toContainEqual(["build:prepared"]);
    expect(browser.commands.flat()).not.toContain("verify:package:prepared");
    const docs = run(select("README.md"), "quality");
    expect(docs.result.status, docs.result.stderr).toBe(0);
    expect(docs.commands).toEqual([
      ["exec", "node", "scripts/check-doc-links.mjs"],
    ]);
    const artifact = run(select("packages/audiobits/README.md"), "quality");
    expect(artifact.result.status, artifact.result.stderr).toBe(0);
    expect(artifact.commands).toContainEqual([
      "exec",
      "vitest",
      "run",
      "packages/audiobits/tests",
      "--bail=1",
    ]);
    const failed = run(baseline, "quality", "test");
    expect(failed.result.status).toBe(9);
    expect(failed.commands).toEqual([["build:lib"], ["test"]]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

// Exercise discovery through Playwright itself: CLI grep is an additional filter,
// so overriding it alone must never masquerade as running untagged regressions.
test("Playwright discovers untagged regression files and reserves long-form evidence for full runs", () => {
  const list = (suite: string, file: string) => {
    const result = spawnSync(
      "pnpm",
      ["exec", "playwright", "test", `tests/browser/${file}.spec.ts`, "--list"],
      {
        encoding: "utf8",
        env: { ...process.env, AUDIOBITS_BROWSER_SUITE: suite },
      },
    );
    expect(result.status, result.stderr + result.stdout).toBe(0);
    return result.stdout;
  };
  expect(list("regression", "gallery")).toContain("catalog dry signals");
  expect(list("regression", "riff-reactor")).not.toContain("whole track");
  expect(list("full", "riff-reactor")).toContain("whole track");
});

test("edited files join the required website cases in one Playwright selection", () => {
  const result = spawnSync("pnpm", ["exec", "playwright", "test", "--list"], {
    encoding: "utf8",
    env: {
      ...process.env,
      AUDIOBITS_BROWSER_SUITE: "regression",
      AUDIOBITS_BROWSER_FILES: JSON.stringify([
        "tests/browser/gallery.spec.ts",
        "tests/browser/automation.spec.ts",
      ]),
    },
  });
  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout).toContain("catalog dry signals");
  expect(result.stdout).toContain("mobile docs menu");
  expect(result.stdout).not.toContain("whole track");
  expect(result.stdout).not.toContain("held pointer ignition");
  expect(result.stdout).toContain(
    "catalog live controls match native automation",
  );
  expect(result.stdout).not.toContain("managed live automation cleans up");
});
