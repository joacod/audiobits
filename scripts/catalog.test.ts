import { readFileSync, readdirSync } from "node:fs";
import { dirname, posix, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { expect, test } from "vitest";
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

test("registry covers eight recipes and two complete, independent experiences", async () => {
  expect(registry.items).toHaveLength(10);
  expect(new Set(registry.items.map((item) => item.name)).size).toBe(10);
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
    expect(item.dependencies).toEqual(["audiobits"]);
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
    expect(bySource.has("LICENSE")).toBe(true);
    const base = `catalog/${item.meta.classification === "recipe" ? "recipes" : "experiences"}/${item.name}`;
    for (const file of readdirSync(base))
      expect(bySource.has(`${base}/${file}`)).toBe(true);
    for (const file of item.files) {
      const source = readFileSync(file.path, "utf8");
      expect(file.target.startsWith("~/src/sounds/")).toBe(true);
      for (const match of source.matchAll(
        /(?:from\s+|import\s*\(|src=)["']([^"']+)["']/g,
      )) {
        const specifier = match[1];
        if (!file.path.endsWith(".ts") && !file.path.endsWith(".html"))
          continue;
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
