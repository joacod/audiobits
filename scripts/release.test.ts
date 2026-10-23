import { expect, test } from "vitest";
import {
  readFileSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { documentationChannel } from "../apps/www/lib/documentation-channel";
import {
  defineSound,
  validateRecipe,
} from "../packages/audiobits/src/recipe/validate";
import { compile } from "../packages/audiobits/src/compiler/plan";
import { confirmation } from "../catalog/recipes/confirmation/recipe";

const metadata = JSON.parse(
  readFileSync("packages/audiobits/src/recipe/capabilities.json", "utf8"),
);
test("advertised recipe source/filter variants validate and compile; unknown variants fail", () => {
  for (const kind of metadata.recipe.kinds) {
    for (const source of metadata.recipe.sources) {
      for (const variant of source === "oscillator"
        ? metadata.recipe.waveforms
        : metadata.recipe.noiseColors) {
        for (const filter of metadata.recipe.filters) {
          const recipe = JSON.parse(JSON.stringify(confirmation));
          recipe.kind = kind;
          if (kind === "sustained") delete recipe.duration;
          recipe.layers[0].source =
            source === "oscillator"
              ? { type: source, waveform: variant, frequency: 440 }
              : { type: source, color: variant };
          recipe.effects[0].filter = filter;
          expect(compile(defineSound(recipe)).layers[0].layer.source.type).toBe(
            source,
          );
          recipe.layers[0].source.type = "unimplemented";
          expect(validateRecipe(recipe).ok).toBe(false);
        }
      }
    }
  }
});

test("stable documentation cannot promote private, prerelease or mismatched candidates", () => {
  const candidate = { name: "audiobits", version: "0.1.0-rc.0", private: true };
  expect(documentationChannel(candidate).channel).toBe("Unreleased");
  const source = "a".repeat(40);
  const stable = { channel: "stable", releasedVersion: "0.1.0", source };
  expect(() => documentationChannel(candidate, stable)).toThrow();
  const released = { ...candidate, version: "0.1.0", private: false };
  expect(documentationChannel(released).channel).toBe("Development");
  expect(documentationChannel(released, stable).channel).toBe("Stable");
  for (const input of [
    { ...stable, releasedVersion: "0.2.0" },
    { ...stable, source: "main" },
    { ...stable, channel: "preview-typo" },
  ])
    expect(() => documentationChannel(released, input)).toThrow();
  expect(() =>
    documentationChannel({ ...released, private: true }, stable),
  ).toThrow();
  expect(() =>
    documentationChannel(
      { ...released, version: "0.1.0-rc.0" },
      { ...stable, releasedVersion: "0.1.0-rc.0" },
    ),
  ).toThrow();
});

test("CI keeps stable required checks, explicit selection and native-only publication preparation", async () => {
  const { createRequire } = await import("node:module");
  const require = createRequire(import.meta.url);
  const { load } = createRequire(require.resolve("eslint/package.json"))(
    "js-yaml",
  );
  const ci = load(readFileSync(".github/workflows/ci.yml", "utf8"));
  const scripts = JSON.parse(readFileSync("package.json", "utf8")).scripts;
  expect(ci.on).toHaveProperty("pull_request");
  expect(ci.on).toHaveProperty("workflow_dispatch");
  expect(ci.on).not.toHaveProperty("push");
  expect(ci.on.pull_request.types).toEqual([
    "opened",
    "synchronize",
    "reopened",
    "ready_for_review",
    "converted_to_draft",
  ]);
  expect(ci.jobs["select-scope"].if).toBe(
    "github.event_name != 'pull_request' || github.event.pull_request.draft == false",
  );
  expect(ci.on.pull_request?.paths).toBeUndefined();
  expect(ci.on.pull_request?.["paths-ignore"]).toBeUndefined();
  for (const job of ["quality", "chromium-integration"]) {
    expect(ci.jobs[job].if).toBeUndefined();
    expect(ci.jobs[job].needs).toBe("select-scope");
    expect(ci.jobs[job].env.CHECK_SCOPE).toBe(
      "${{ needs.select-scope.outputs.scope }}",
    );
    expect(ci.jobs[job].steps).toContainEqual(
      expect.objectContaining({
        run: `node scripts/ci/run-checks.mjs ${job === "quality" ? "quality" : "browser"}`,
      }),
    );
  }
  expect(ci.jobs["select-scope"].steps[0].with["fetch-depth"]).toBe(0);
  // Selection uses only Node/Git and runs before any package manager setup.
  const selectorNode = ci.jobs["select-scope"].steps.find(
    ({ uses }: { uses?: string }) => uses?.startsWith("actions/setup-node@"),
  );
  expect(selectorNode.with["package-manager-cache"]).toBe(false);
  expect(selectorNode.with.cache).toBeUndefined();
  expect(ci.jobs.checks.if).toBe(
    "always() && (github.event_name != 'pull_request' || github.event.pull_request.draft == false)",
  );
  expect(ci.jobs.checks.needs).toEqual(
    expect.arrayContaining(["select-scope", "quality", "chromium-integration"]),
  );
  expect(ci.jobs.checks.steps).toContainEqual(
    expect.objectContaining({
      run: "node scripts/ci/check-required.mjs",
      env: { NEEDS_JSON: "${{ toJSON(needs) }}" },
    }),
  );
  const runner = readFileSync("scripts/prepare-release.mjs", "utf8");
  for (const gate of [
    "verify:package",
    "prepare:runtime:prepared",
    "test:runtime:prepared",
    "test:package:prepared",
  ])
    expect(runner).toContain(`"${gate}"`);
  expect(runner).not.toMatch(
    /build:site|build:prepared|test:consumers|test:browser:full/,
  );
  expect(scripts["release:prepare"]).toBe("node scripts/prepare-release.mjs");
  expect(scripts["test:consumers:prepared"]).toContain("--consumers");
  expect(scripts["test:package:prepared"]).not.toContain("--consumers");
  expect(scripts["test:browser:full:prepared"]).toContain(
    "AUDIOBITS_BROWSER_SUITE=full",
  );
  expect(scripts["test:browser:prepared"]).toContain("test:runtime:prepared");
  expect(scripts["test:browser:prepared"]).toContain(
    "test:browser:site:prepared",
  );
  const { default: browser } = await import("../playwright.config");
  const { default: runtime } = await import("../playwright.runtime.config");
  for (const config of [browser, runtime]) {
    expect(config.projects?.map(({ name }) => name)).toEqual(["chromium"]);
    expect(config.retries).toBe(0);
    expect(config.workers).toBe(2);
    expect(config.use?.trace).toBe(
      process.env.CI ? "retain-on-failure" : "off",
    );
  }
  expect(browser.grep).toEqual(/@required/);
  for (const file of ["ci", "release"]) {
    const workflow = load(
      readFileSync(`.github/workflows/${file}.yml`, "utf8"),
    );
    const job =
      workflow.jobs[file === "ci" ? "chromium-integration" : "publish"];
    expect(
      job.steps.filter(({ run }: { run?: string }) =>
        run?.includes("setup-linux-audio.sh"),
      ),
    ).toEqual([
      expect.objectContaining({
        run: "bash scripts/ci/setup-linux-audio.sh",
      }),
    ]);
    expect(JSON.stringify(job)).not.toContain("--with-deps");
  }
  expect(JSON.stringify(runtime.webServer)).not.toMatch(/www|3100|next/i);
  expect(metadata.browserMatrix).toEqual(["Chromium"]);
});

test("workflow actions retain immutable SHA pins", async () => {
  const { createRequire } = await import("node:module");
  const require = createRequire(import.meta.url);
  const { load } = createRequire(require.resolve("eslint/package.json"))(
    "js-yaml",
  );
  for (const file of ["ci", "release"]) {
    const source = readFileSync(`.github/workflows/${file}.yml`, "utf8");
    const workflow = load(source);
    for (const job of Object.values(workflow.jobs) as {
      steps: { uses?: string }[];
    }[]) {
      for (const step of job.steps)
        if (step.uses) expect(step.uses).toMatch(/^[\w/-]+@[a-f0-9]{40}$/);
    }
  }
});

test("production release isolates direct npm publication from GitHub finalization", async () => {
  const { createRequire } = await import("node:module");
  const require = createRequire(import.meta.url);
  const { load } = createRequire(require.resolve("eslint/package.json"))(
    "js-yaml",
  );
  const source = readFileSync(".github/workflows/release.yml", "utf8");
  const release = load(source);
  expect(release.on.push.branches).toEqual(["main"]);
  expect(release.on).toHaveProperty("workflow_dispatch");
  expect(release.permissions).toEqual({});
  expect(release.concurrency["cancel-in-progress"]).toBe(false);
  expect(release.concurrency.group).toBe("audiobits-npm-release");
  expect(release.jobs["select-mode"].if).toBe(
    "github.ref == 'refs/heads/main'",
  );
  expect(release.jobs["select-mode"].permissions).toEqual({ contents: "read" });
  expect(release.jobs.version.permissions).toEqual({
    contents: "write",
    "pull-requests": "write",
  });
  expect(release.jobs.publish.permissions).toEqual({
    contents: "read",
    "id-token": "write",
  });
  expect(release.jobs["select-mode"].outputs.mode).toBe(
    "${{ steps.mode.outputs.mode }}",
  );
  expect(release.jobs["select-mode"].steps).toContainEqual({
    uses: expect.stringMatching(
      /^changesets\/action\/select-mode@[a-f0-9]{40}$/,
    ),
    id: "mode",
  });
  expect(release.jobs.version.steps).toContainEqual({
    uses: expect.stringMatching(/^changesets\/action\/version@[a-f0-9]{40}$/),
    with: {
      "pr-title": "Version Packages",
      script: "pnpm version-packages",
    },
  });
  for (const [job, mode] of [
    ["version", "version"],
    ["publish", "publish"],
  ]) {
    expect(release.jobs[job].needs).toBe("select-mode");
    expect(release.jobs[job].if).toBe(
      `needs.select-mode.outputs.mode == '${mode}'`,
    );
  }
  for (const name of ["select-mode", "version", "publish"]) {
    const job = release.jobs[name] as {
      steps: { uses?: string; run?: string; with?: Record<string, unknown> }[];
    };
    expect(job.steps[0].uses).toMatch(/^actions\/checkout@[a-f0-9]{40}$/);
    expect(
      job.steps.find(({ uses }) => uses?.startsWith("pnpm/action-setup@")),
    ).toBeDefined();
    expect(
      job.steps.find(({ uses }) => uses?.startsWith("actions/setup-node@"))
        ?.with?.["node-version-file"],
    ).toBe(".node-version");
  }
  const steps = release.jobs.publish.steps;
  const runs = steps.flatMap(({ run }: { run?: string }) => run ?? []);
  const gate = runs.indexOf("pnpm release:prepare");
  const verify = runs.indexOf(
    'node scripts/verify-release-artifact.mjs >> "$GITHUB_OUTPUT"',
  );
  const publish = runs.indexOf(
    'npm publish "$RELEASE_ARCHIVE" --access public --tag latest',
  );
  expect(gate).toBeGreaterThan(-1);
  expect(verify).toBeGreaterThan(gate);
  expect(publish).toBeGreaterThan(verify);
  expect(runs.slice(verify + 1, publish).join("\n")).not.toMatch(/\bpack\b/);
  expect(runs.filter((run: string) => /\bnpm publish\b/.test(run))).toEqual([
    'npm publish "$RELEASE_ARCHIVE" --access public --tag latest',
  ]);
  expect(runs).toContain("npm install --global npm@11.19.0");
  for (const setup of ["bash scripts/ci/setup-linux-audio.sh"]) {
    expect(runs.indexOf(setup)).toBeGreaterThan(-1);
    expect(runs.indexOf(setup)).toBeLessThan(gate);
  }
  expect(
    steps.find(({ uses }: { uses?: string }) =>
      uses?.startsWith("actions/setup-node@"),
    ).with,
  ).toEqual({
    "node-version-file": ".node-version",
    "registry-url": "https://registry.npmjs.org",
    "package-manager-cache": false,
  });
  expect(
    steps.find(({ id }: { id?: string }) => id === "artifact"),
  ).toBeDefined();
  expect(
    steps.find(({ run }: { run?: string }) => run?.startsWith("npm publish"))
      .env.RELEASE_ARCHIVE,
  ).toBe("${{ steps.artifact.outputs.archive }}");
  expect(
    steps.some(
      ({
        uses,
        with: inputs,
      }: {
        uses?: string;
        with?: Record<string, unknown>;
      }) => uses?.includes("cache") || inputs?.cache !== undefined,
    ),
  ).toBe(false);
  for (const name of ["select-mode", "version"]) {
    const job = release.jobs[name];
    expect(JSON.stringify(job)).not.toMatch(
      /npm stage|npm publish|changeset publish|action\/publish/,
    );
  }
  expect(source).not.toMatch(
    /NPM_TOKEN|NODE_AUTH_TOKEN|\bPAT\b|secrets\s*\.|changeset publish|npm stage publish|npm stage approve|action\/publish|create-github-releases|push-git-tags/,
  );
  expect(release.jobs["github-release"].needs).toBe("publish");
  expect(release.jobs["github-release"].if).toBeUndefined();
  expect(release.jobs["github-release"].permissions).toEqual({
    contents: "write",
  });
  expect(release.jobs["github-release"].steps[0].with.ref).toBe(
    "${{ github.sha }}",
  );
  const finalization = release.jobs["github-release"].steps.find(
    ({ run }: { run?: string }) =>
      run === "node scripts/finalize-github-release.mjs",
  );
  expect(finalization.run).toBe("node scripts/finalize-github-release.mjs");
  expect(finalization.env).toEqual({
    GH_TOKEN: "${{ github.token }}",
    RELEASE_SHA: "${{ github.sha }}",
  });
  expect(release.jobs["github-release"].steps).toEqual(
    expect.arrayContaining([
      {
        uses: expect.stringMatching(/^actions\/checkout@[a-f0-9]{40}$/),
        with: { ref: "${{ github.sha }}" },
      },
      {
        uses: expect.stringMatching(/^actions\/setup-node@[a-f0-9]{40}$/),
        with: {
          "node-version-file": ".node-version",
          "package-manager-cache": false,
        },
      },
      finalization,
    ]),
  );
  for (const [name, job] of Object.entries(release.jobs) as [
    string,
    { permissions: Record<string, string> },
  ][]) {
    expect(job.permissions["id-token"]).toBe(
      name === "publish" ? "write" : undefined,
    );
  }
  const helper = readFileSync("scripts/finalize-github-release.mjs", "utf8");
  expect(helper).toContain(
    'readFileSync("packages/audiobits/package.json", "utf8")',
  );
  expect(helper).toContain(
    'readFileSync("packages/audiobits/CHANGELOG.md", "utf8")',
  );
  expect(helper).not.toMatch(/npm publish|npm stage|NPM_TOKEN|NODE_AUTH_TOKEN/);
});

test("automated versioning regenerates metadata only after Changesets succeeds", () => {
  const manifest = JSON.parse(readFileSync("package.json", "utf8"));
  expect(manifest.scripts["version-packages"].split(" && ")).toEqual([
    "changeset version",
    "node scripts/generate-recipe.mjs",
  ]);
  expect(manifest.scripts["version-packages"]).not.toMatch(
    /NPM_TOKEN|NODE_AUTH_TOKEN|\bPAT\b|secrets\s*\./,
  );
  const instructions = readFileSync("AGENTS.md", "utf8");
  expect(instructions).toMatch(
    /During ordinary feature\/fix work, do not run `changeset version`,\s+`pnpm version-packages`, `npm publish`/,
  );
});

test("published package identifies the GitHub repository and monorepo directory", () => {
  const manifest = JSON.parse(
    readFileSync("packages/audiobits/package.json", "utf8"),
  );
  expect(manifest.repository).toEqual({
    type: "git",
    url: "git+https://github.com/joacod/audiobits.git",
    directory: "packages/audiobits",
  });
});

test("publication accepts only the retained archive matching clean release evidence", () => {
  const root = mkdtempSync(join(tmpdir(), "audiobits-publish-test-"));
  const directory = join(root, "node_modules/.cache/audiobits-release");
  const manifest = JSON.parse(
    readFileSync("packages/audiobits/package.json", "utf8"),
  );
  const archive = `audiobits-${manifest.version}.tgz`;
  const bytes = Buffer.from("verified archive fixture");
  const evidence = {
    dirtySource: false,
    version: manifest.version,
    archive,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    sourceCommit: "",
    publicationGate: "package-v1",
  };
  const run = () =>
    spawnSync(
      process.execPath,
      [resolve("scripts/verify-release-artifact.mjs")],
      { cwd: root, encoding: "utf8" },
    );
  const writeEvidence = (value: unknown) =>
    writeFileSync(join(directory, "evidence.json"), JSON.stringify(value));
  try {
    mkdirSync(directory, { recursive: true });
    mkdirSync(join(root, "packages/audiobits"), { recursive: true });
    writeFileSync(
      join(root, "packages/audiobits/package.json"),
      JSON.stringify(manifest),
    );
    writeFileSync(join(directory, archive), bytes);
    const git = (...args: string[]) => {
      const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
      expect(result.status, result.stderr).toBe(0);
      return result.stdout.trim();
    };
    git("init", "--quiet");
    git("add", "packages");
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
    // Retained archives/evidence are ignored, just as in the real checkout.
    writeFileSync(join(root, ".git/info/exclude"), "node_modules/\n");
    evidence.sourceCommit = git("rev-parse", "HEAD");
    writeEvidence(evidence);
    const valid = run();
    expect(valid.status, valid.stderr).toBe(0);
    expect(valid.stdout.trim()).toBe(
      `archive=node_modules/.cache/audiobits-release/${archive}`,
    );
    for (const invalid of [
      { ...evidence, dirtySource: true },
      { ...evidence, dirtySource: undefined },
      { ...evidence, version: "mismatched" },
      { ...evidence, archive: "../other.tgz" },
      { ...evidence, sha256: "mismatched" },
      { ...evidence, sourceCommit: "0".repeat(40) },
      { ...evidence, publicationGate: undefined },
    ]) {
      writeEvidence(invalid);
      const rejected = run();
      expect(rejected.status).not.toBe(0);
      expect(rejected.stdout).toBe("");
    }
    writeEvidence(evidence);
    writeFileSync(join(root, "untracked.txt"), "unverified source");
    expect(run().status).not.toBe(0);
    rmSync(join(root, "untracked.txt"));
    writeFileSync(join(directory, archive), "changed bytes");
    expect(run().status).not.toBe(0);
    rmSync(join(directory, archive));
    expect(run().status).not.toBe(0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("publication preparation invalidates stale evidence on every failed phase and stamps only a complete gate", () => {
  const root = mkdtempSync(join(tmpdir(), "audiobits-gate-"));
  const evidencePath = join(
    root,
    "node_modules/.cache/audiobits-release/evidence.json",
  );
  const bin = join(root, "node_modules/.bin");
  const git = (...args: string[]) => {
    const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
    expect(result.status, result.stderr).toBe(0);
    return result.stdout.trim();
  };
  try {
    git("init", "--quiet");
    writeFileSync(join(root, "fixture.txt"), "verified source");
    git("add", "fixture.txt");
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
    writeFileSync(join(root, ".git/info/exclude"), "node_modules/\n");
    const sourceCommit = git("rev-parse", "HEAD");
    mkdirSync(bin, { recursive: true });
    mkdirSync(join(root, "node_modules/.cache/audiobits-release"), {
      recursive: true,
    });
    writeFileSync(
      join(bin, "pnpm"),
      `#!${process.execPath}
const fs = require('node:fs');
if (process.argv[2] === 'test:package:prepared') fs.writeFileSync(process.env.EVIDENCE_PATH, JSON.stringify({sourceCommit:process.env.SOURCE_COMMIT,dirtySource:false}));
if (process.argv[2] === process.env.FAIL_COMMAND) process.exit(9);
`,
      { mode: 0o755 },
    );
    const run = (fail = "") =>
      spawnSync(process.execPath, [resolve("scripts/prepare-release.mjs")], {
        cwd: root,
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${bin}:${process.env.PATH}`,
          EVIDENCE_PATH: evidencePath,
          SOURCE_COMMIT: sourceCommit,
          FAIL_COMMAND: fail,
        },
      });
    for (const fail of [
      "verify:package",
      "prepare:runtime:prepared",
      "test:runtime:prepared",
      "test:package:prepared",
    ]) {
      writeFileSync(
        evidencePath,
        JSON.stringify({ publicationGate: "package-v1", stale: true }),
      );
      expect(run(fail).status).toBe(9);
      expect(() => readFileSync(evidencePath)).toThrow();
    }
    const success = run();
    expect(success.status, success.stderr).toBe(0);
    expect(JSON.parse(readFileSync(evidencePath, "utf8"))).toEqual({
      sourceCommit,
      dirtySource: false,
      publicationGate: "package-v1",
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
