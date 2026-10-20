import {
  copyFileSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, posix, resolve } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { expect, test } from "vitest";
import ts from "typescript";
import { validateRecipe, type Recipe } from "audiobits";
import capabilities from "audiobits/capabilities.json";
import registry from "../registry.json" with { type: "json" };
import { compile } from "../packages/audiobits/src/compiler/plan";
import { controlsFor } from "../packages/audiobits/src/compiler/values";

test("canonical gallery imports resolve in native Node tooling", () => {
  execFileSync(process.execPath, [
    "--input-type=module",
    "-e",
    'await import("./apps/www/lib/gallery.ts")',
  ]);
});

test("GitHub installer verification rejects invalid revisions without loading consumer dependencies", () => {
  const directory = mkdtempSync(join(tmpdir(), "audiobits-arguments-"));
  const script = join(directory, "test-package.mjs");
  // No node_modules or catalog beside the copy: argument rejection must not
  // depend on TypeScript, Playwright, the packed runtime or website setup.
  copyFileSync("scripts/test-package.mjs", script);
  try {
    for (const [args, message] of [
      [["--github"], "requires --revision=<full commit SHA>"],
      [
        ["--github", "--revision=main"],
        "requires --revision=<full commit SHA>",
      ],
      [
        ["--github", `--revision=${"0".repeat(40)}`],
        "revision must match the checkout",
      ],
      [
        [`--revision=${"0".repeat(40)}`],
        "--revision is only used with --github",
      ],
    ] as const) {
      const result = spawnSync(process.execPath, [script, ...args], {
        encoding: "utf8",
      });
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(message);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("registry covers every canonical recipe and sound-only experience", async () => {
  expect(new Set(registry.items.map((item) => item.name)).size).toBe(
    registry.items.length,
  );
  expect(registry.items.map((item) => item.name).sort()).toEqual(
    [
      ...["catalog/recipes", "catalog/experiences"].flatMap((directory) =>
        readdirSync(directory, { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name),
      ),
    ].sort(),
  );
  for (const item of registry.items) {
    expect(item.dependencies).toEqual(
      // Native recipe delay requires the 0.3 runtime line.
      ["echo-probe", "the-rift"].includes(item.name)
        ? ["audiobits@^0.3.0"]
        : ["audiobits"],
    );
    expect(item.title.length).toBeGreaterThan(0);
    expect(item.description.length).toBeGreaterThan(0);
    expect(item.categories).toContain(item.meta.classification);
    expect(item.meta.schemaVersion).toBe(capabilities.schemaVersion);
    for (const [key, values] of Object.entries(
      item.meta.requiredCapabilities,
    )) {
      const supported =
        key === "runtime"
          ? capabilities.runtime
          : capabilities.recipe[key as keyof typeof capabilities.recipe];
      for (const value of values) expect(supported).toContain(value);
    }
    if (["echo-probe", "the-rift"].includes(item.name)) {
      expect(item.meta.requiredCapabilities).toHaveProperty("effects", [
        "delay",
        "filter",
      ]);
    }
    const definitions = item.files
      .filter((file) => file.path.endsWith("/recipe.ts"))
      .map((file) => readFileSync(file.path, "utf8"))
      .join("\n");
    const fields = {
      sources: /type: "(oscillator|noise)"/g,
      filters: /filter: "([^"]+)"/g,
      parameterModes: /mode: "(play|live)"/g,
      kinds: /kind: "([^"]+)"/g,
      waveforms: /waveform: "([^"]+)"/g,
      noiseColors: /color: "([^"]+)"/g,
      mappingScales: /scale: "([^"]+)"/g,
      automationCurves: /curve: "([^"]+)"/g,
    };
    for (const [key, pattern] of Object.entries(fields)) {
      const actual = [
        ...new Set([...definitions.matchAll(pattern)].map((match) => match[1])),
      ].sort();
      expect(
        item.meta.requiredCapabilities[key as keyof typeof fields],
        `${item.name}: ${key}`,
      ).toEqual(actual);
    }
    const bySource = new Map(
      item.files.map((file) => [file.path, file.target]),
    );
    expect(new Set(item.files.map((file) => file.target)).size).toBe(
      item.files.length,
    );
    expect(
      item.files.some((file) => /LICENSE/i.test(file.path + file.target)),
    ).toBe(false);
    const base = `catalog/${item.meta.classification === "recipe" ? "recipes" : "experiences"}/${item.name}`;
    const paths = item.files.map((file) => file.path);
    expect(paths).toContain(`${base}/recipe.ts`);
    expect(new Set(paths).size).toBe(paths.length);
    if (item.meta.classification === "recipe") {
      expect(paths).toEqual([`${base}/recipe.ts`]);
    } else {
      expect(paths).toContain(`${base}/README.md`);
      expect(
        paths.some(
          (path) => path.endsWith(".ts") && path !== `${base}/recipe.ts`,
        ),
      ).toBe(true);
    }
    for (const file of item.files) {
      const source = readFileSync(file.path, "utf8");
      // HTML/CSS/assets and browser demo entrypoints never belong to an install.
      expect(posix.dirname(file.path)).toBe(base);
      expect(
        file.path.endsWith(".ts") || file.path === `${base}/README.md`,
      ).toBe(true);
      expect(file.path).not.toMatch(/\/(?:host|stage|motion)\.ts$/);
      expect(file.target).toBe(
        `~/src/sounds/${file.path.slice("catalog/".length)}`,
      );
      if (file.path.endsWith(".ts"))
        expect(source).not.toMatch(
          /\b(?:document|window|HTMLElement|HTMLCanvasElement|requestAnimationFrame)\b/,
        );
      if (!file.path.endsWith(".ts")) continue;
      for (const importedFile of ts.preProcessFile(source, true, true)
        .importedFiles) {
        const specifier = importedFile.fileName;
        if (!specifier.startsWith(".")) {
          expect(specifier).toBe("audiobits");
          continue;
        }
        const imported = posix.normalize(
          posix.join(dirname(file.path), specifier),
        );
        const path = bySource.has(imported) ? imported : `${imported}.ts`;
        const target = bySource.get(path);
        expect(target, `${item.name}: missing ${path}`).toBeDefined();
        expect(
          posix.normalize(posix.join(dirname(file.target), specifier)),
        ).toBe(
          target?.replace(/\.ts$/, specifier.endsWith(".ts") ? ".ts" : ""),
        );
      }
    }
    const path = `${base}/recipe.ts`;
    const module = (await import(resolve(path))) as Record<string, Recipe>;
    expect(validateRecipe(module[item.meta.exportName]).ok).toBe(true);
  }
});

test("installed sound source typechecks without browser presentation globals", () => {
  const virtual = new Map(
    registry.items.flatMap((item) =>
      item.files
        .filter((file) => file.path.endsWith(".ts"))
        .map(
          (file) =>
            [
              resolve("__catalog_consumer__", file.target.slice(2)),
              readFileSync(file.path, "utf8"),
            ] as const,
        ),
    ),
  );
  const options: ts.CompilerOptions = {
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    noUncheckedSideEffectImports: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    lib: ["lib.es2022.d.ts"],
    types: [],
  };
  const host = ts.createCompilerHost(options);
  const read = host.readFile,
    exists = host.fileExists,
    directoryExists = host.directoryExists!;
  host.readFile = (path) => virtual.get(path) ?? read(path);
  host.fileExists = (path) => virtual.has(path) || exists(path);
  host.directoryExists = (path) =>
    [...virtual.keys()].some((file) => file.startsWith(`${path}/`)) ||
    directoryExists(path);
  const program = ts.createProgram([...virtual.keys()], options, host);
  expect(
    ts
      .getPreEmitDiagnostics(program)
      .map((diagnostic) =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
      ),
  ).toEqual([]);
});

test("canonical recipes round-trip and compile deterministically at control and seed extrema", async () => {
  for (const item of registry.items.filter(
    (item) => item.meta.classification === "recipe",
  )) {
    const canonical = (
      (await import(resolve(item.files[0].path))) as Record<string, Recipe>
    )[item.meta.exportName];
    const roundTrip = validateRecipe(JSON.parse(JSON.stringify(canonical)));
    expect(roundTrip.ok).toBe(true);
    if (!roundTrip.ok) throw new Error("Invalid catalog recipe");
    expect(roundTrip.recipe).toEqual(canonical);
    expect(Object.isFrozen(canonical)).toBe(true);
    for (const edge of ["min", "default", "max"] as const) {
      const controls = Object.fromEntries(
        Object.entries(canonical.parameters ?? {}).map(([name, parameter]) => [
          name,
          parameter[edge],
        ]),
      );
      for (const seed of [0, 42, 0xffffffff]) {
        expect(
          compile(canonical, controlsFor(canonical, controls), seed),
        ).toEqual(
          compile(
            roundTrip.recipe,
            controlsFor(roundTrip.recipe, controls),
            seed,
          ),
        );
      }
    }
  }
});
