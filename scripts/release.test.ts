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
import { confirmation } from "../packages/audiobits/src/recipes";

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

test("normal CI keeps PR quality separate from main-only Chromium integration", async () => {
  const { createRequire } = await import("node:module");
  const require = createRequire(import.meta.url);
  const { load } = createRequire(require.resolve("eslint/package.json"))(
    "js-yaml",
  );
  const ci = load(readFileSync(".github/workflows/ci.yml", "utf8"));
  expect(Object.keys(ci.on).sort()).toEqual(["pull_request", "push"]);
  expect(ci.on.push.branches).toEqual(["main"]);
  expect(Object.keys(ci.jobs).sort()).toEqual([
    "chromium-integration",
    "quality",
  ]);
  expect(ci.jobs.quality.if).toBeUndefined();
  expect(
    ci.jobs.quality.steps.flatMap(({ run }: { run?: string }) => run ?? []),
  ).toEqual([
    "pnpm install --frozen-lockfile",
    "pnpm lint",
    "pnpm typecheck",
    "pnpm test",
    "pnpm build",
    "pnpm exec publint packages/audiobits --strict",
  ]);
  expect(ci.jobs["chromium-integration"].if).toBe(
    "github.event_name == 'push' && github.ref == 'refs/heads/main'",
  );
  expect(
    ci.jobs["chromium-integration"].steps.flatMap(
      ({ run }: { run?: string }) => run ?? [],
    ),
  ).toEqual([
    "pnpm install --frozen-lockfile",
    "pnpm exec playwright install --with-deps chromium",
    "bash scripts/ci/setup-linux-audio.sh",
    "pnpm test:browser --project=chromium",
  ]);
  const { default: browser } = await import("../playwright.config");
  expect(browser.projects?.map(({ name }) => name)).toEqual(["chromium"]);
  expect(browser.retries).toBe(0);
  expect(browser.use?.trace).toBe(process.env.CI ? "retain-on-failure" : "off");
  expect(metadata.browserMatrix).toEqual(["Chromium"]);
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
  expect(Object.keys(release.jobs).sort()).toEqual([
    "github-release",
    "publish",
    "select-mode",
    "version",
  ]);
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
    uses: "changesets/action/select-mode@v2",
    id: "mode",
  });
  expect(release.jobs.version.steps).toContainEqual({
    uses: "changesets/action/version@v2",
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
    expect(job.steps[0].uses).toBe("actions/checkout@v5");
    expect(
      job.steps.find(({ uses }) => uses === "pnpm/action-setup@v4"),
    ).toBeDefined();
    expect(
      job.steps.find(({ uses }) => uses === "actions/setup-node@v5")?.with?.[
        "node-version-file"
      ],
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
  expect(verify).toBe(gate + 1);
  expect(publish).toBe(verify + 1);
  expect(runs).toContain("npm install --global npm@11.19.0");
  for (const setup of [
    "pnpm exec playwright install --with-deps chromium",
    "bash scripts/ci/setup-linux-audio.sh",
  ]) {
    expect(runs.indexOf(setup)).toBeGreaterThan(-1);
    expect(runs.indexOf(setup)).toBeLessThan(gate);
  }
  expect(
    steps.find(
      ({ uses }: { uses?: string }) => uses === "actions/setup-node@v5",
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
  const finalization = release.jobs["github-release"].steps.at(-1);
  expect(finalization.run).toBe("node scripts/finalize-github-release.mjs");
  expect(finalization.env).toEqual({
    GH_TOKEN: "${{ github.token }}",
    RELEASE_SHA: "${{ github.sha }}",
  });
  expect(release.jobs["github-release"].steps).toEqual([
    {
      uses: "actions/checkout@v5",
      with: { ref: "${{ github.sha }}" },
    },
    {
      uses: "actions/setup-node@v5",
      with: {
        "node-version-file": ".node-version",
        "package-manager-cache": false,
      },
    },
    finalization,
  ]);
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
    url: "https://github.com/joacod/audiobits.git",
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
    ]) {
      writeEvidence(invalid);
      const rejected = run();
      expect(rejected.status).not.toBe(0);
      expect(rejected.stdout).toBe("");
    }
    writeEvidence(evidence);
    writeFileSync(join(directory, archive), "changed bytes");
    expect(run().status).not.toBe(0);
    rmSync(join(directory, archive));
    expect(run().status).not.toBe(0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
