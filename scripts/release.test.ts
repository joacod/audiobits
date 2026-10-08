import { expect, test } from "vitest";
import { readFileSync } from "node:fs";
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

test("release workflows prepare independently and keep production actions disabled", async () => {
  const { createRequire } = await import("node:module");
  const require = createRequire(import.meta.url);
  // Use the YAML parser already required by the installed ESLint toolchain.
  const { load } = createRequire(require.resolve("eslint/package.json"))(
    "js-yaml",
  ) as {
    load(source: string): {
      on: Record<string, unknown>;
      permissions: { contents: string };
      concurrency: { group: string; "cancel-in-progress": boolean };
      jobs: Record<
        string,
        {
          if?: string;
          needs?: string;
          environment?: string;
          steps: { run?: string }[];
        }
      >;
    };
  };
  const npm = load(readFileSync(".github/workflows/npm-candidate.yml", "utf8"));
  const site = load(
    readFileSync(".github/workflows/site-candidate.yml", "utf8"),
  );
  expect(npm.concurrency.group).not.toBe(site.concurrency.group);
  for (const [workflow, action, environment] of [
    [npm, "publish", "npm-production"],
    [site, "deploy", "site-production"],
  ] as const) {
    expect(Object.keys(workflow.on)).toEqual(["workflow_dispatch"]);
    expect(workflow.permissions.contents).toBe("read");
    expect(workflow.concurrency["cancel-in-progress"]).toBe(false);
    expect(workflow.jobs[action].if).toBe("${{ false }}");
    expect(workflow.jobs[action].needs).toBe("prepare");
    expect(workflow.jobs[action].environment).toBe(environment);
    expect(workflow.jobs[action].steps.at(-1)?.run).toContain("exit 1");
  }
  expect(
    npm.jobs.prepare.steps.some(({ run }) => run === "pnpm release:prepare"),
  ).toBe(true);
  expect(
    site.jobs.prepare.steps.some(({ run }) => run === "pnpm build:site"),
  ).toBe(true);
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
  const candidate = load(
    readFileSync(".github/workflows/npm-candidate.yml", "utf8"),
  );
  expect(
    candidate.jobs.prepare.steps.find(({ run }: { run?: string }) =>
      run?.includes("playwright install"),
    )?.run,
  ).toBe("pnpm exec playwright install --with-deps chromium");
  const { default: browser } = await import("../playwright.config");
  expect(browser.projects?.map(({ name }) => name)).toEqual(["chromium"]);
  expect(browser.retries).toBe(0);
  expect(browser.use?.trace).toBe(process.env.CI ? "retain-on-failure" : "off");
  expect(metadata.browserMatrix).toEqual(["Chromium"]);
});
