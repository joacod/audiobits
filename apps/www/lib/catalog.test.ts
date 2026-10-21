import registry from "../../../registry.json" with { type: "json" };
import { expect, test } from "vitest";
import {
  energyChargeExperience,
  lightsaberExperience,
  reactiveThrusterExperience,
} from "./experiences";
import { demos, soundKinds } from "./gallery";
import { catalogEntries, catalogGroups, createCatalogEntries } from "./catalog";
import { experienceSourceFiles } from "./registry";
import { readFileSync } from "node:fs";

test("sound-only installation keeps complete showcase sources available", () => {
  for (const entry of catalogEntries.filter(
    (item) => item.category === "experience",
  )) {
    const item = registry.items.find((item) => item.name === entry.slug)!;
    expect(experienceSourceFiles(entry.slug).map((file) => file.path)).toEqual(
      item.files
        .filter((file) => file.path.endsWith(".ts"))
        .map((file) => file.path),
    );
    expect(entry.source.files).toContain("host.ts");
    expect(entry.source.files).toContain("index.html");
    for (const file of entry.source.files)
      expect(
        readFileSync(`catalog/experiences/${entry.slug}/${file}`, "utf8")
          .length,
      ).toBeGreaterThan(0);
  }
});

test("catalog index discovers every registry entry once and groups collections", () => {
  expect(catalogGroups.map((group) => [group.category, group.title])).toEqual([
    ["experience", "Interactive experiences"],
    ["bundled", "Catalog sounds"],
  ]);
  expect(catalogEntries.map((entry) => entry.category)).toEqual(
    catalogGroups.flatMap((group) =>
      registry.items
        .filter(
          (item) =>
            item.meta.classification ===
            (group.category === "bundled" ? "recipe" : "experience"),
        )
        .map(() => group.category),
    ),
  );
  expect(catalogEntries.map((entry) => entry.slug)).toEqual([
    "lightsaber",
    "reactive-thruster",
    "the-rift",
    "echo-probe",
    "energy-charge",
    "riff-reactor",
    ...registry.items
      .filter((item) => item.meta.classification === "recipe")
      .map((item) => item.name),
  ]);
  expect(new Set(catalogEntries.map((entry) => entry.slug)).size).toBe(
    catalogEntries.length,
  );
  expect(new Set(catalogEntries.map((entry) => entry.href)).size).toBe(
    catalogEntries.length,
  );
  expect([...soundKinds].sort()).toEqual(
    registry.items
      .filter((item) => item.meta.classification === "recipe")
      .map((item) => item.name)
      .sort(),
  );
  expect(catalogEntries.map((item) => item.slug).sort()).toEqual(
    registry.items.map((item) => item.name).sort(),
  );
});

test("catalog entries derive links and playback from website metadata", () => {
  const [lightsaber, reactive, , , charge] = catalogEntries;
  expect(energyChargeExperience.href).toBe("/catalog/energy-charge");
  expect(reactiveThrusterExperience.href).toBe("/catalog/reactive-thruster");
  expect(charge).toMatchObject({
    title: energyChargeExperience.title,
    description: energyChargeExperience.description,
    href: "/catalog/energy-charge",
    controls: energyChargeExperience.controls,
    source: { files: energyChargeExperience.sourceFiles },
    preview: { family: "charge" },
  });
  expect(reactive).toMatchObject({
    title: reactiveThrusterExperience.title,
    description: reactiveThrusterExperience.description,
    href: "/catalog/reactive-thruster",
    controls: reactiveThrusterExperience.controls,
    source: { files: reactiveThrusterExperience.sourceFiles },
    preview: { family: "thruster" },
  });
  expect(lightsaber).toMatchObject({
    title: "Lightsaber",
    href: "/catalog/lightsaber",
    preview: { family: "blade" },
    source: { files: lightsaberExperience.sourceFiles },
  });
  expect(lightsaberExperience.title).toBe("Lightsaber");
  expect("playback" in charge).toBe(false);
  expect("playback" in reactive).toBe(false);

  for (const slug of soundKinds) {
    const entry = catalogEntries.find((item) => item.slug === slug);
    const demo = demos[slug];
    expect(entry).toMatchObject({
      category: "bundled",
      title: demo.title,
      description: demo.description,
      href: `/catalog/${slug}`,
      playback: demo.recipe.kind,
      use: demo.use,
      preview: { family: demo.visualFamily },
      source: { exportName: demo.exportName },
    });
    expect(entry).not.toHaveProperty("recipe");
    expect(entry && "controls" in entry).toBe(false);
  }

  const bundledThruster = catalogEntries.find(
    (entry) => entry.slug === "thruster",
  );
  const experienceThruster = catalogEntries.find(
    (entry) => entry.slug === "reactive-thruster",
  );
  expect(bundledThruster).toMatchObject({
    category: "bundled",
    playback: "sustained",
    href: "/catalog/thruster",
  });
  expect(experienceThruster).toMatchObject({
    category: "experience",
    href: "/catalog/reactive-thruster",
  });
});

test.each(["recipe", "experience"])(
  "a future %s is discovered and reports missing presentation setup",
  (classification) => {
    const template = registry.items.find(
      (item) => item.meta.classification === classification,
    )!;
    const future = { ...template, name: "future-sound", title: "Future sound" };
    expect(() => createCatalogEntries([...registry.items, future])).toThrow(
      `future-sound: missing website ${classification} presentation`,
    );
  },
);

test("a future recipe with presentation setup uses registry metadata without inventory edits", () => {
  const template = registry.items.find((item) => item.name === "confirmation")!;
  const future = structuredClone(template);
  future.name = "future-sound";
  future.title = "Future sound";
  future.description = "Registry-owned description.";
  future.meta.exportName = "futureSound";
  future.files = [
    { ...template.files[0], path: "catalog/recipes/future-sound/recipe.ts" },
  ];
  const presentation = demos as Record<
    string,
    (typeof demos)[keyof typeof demos]
  >;
  presentation[future.name] = demos.confirmation;
  try {
    expect(
      createCatalogEntries([...registry.items, future]).find(
        (item) => item.slug === future.name,
      ),
    ).toMatchObject({
      title: future.title,
      description: future.description,
      category: "bundled",
      href: `/catalog/${future.name}`,
      source: {
        exportName: future.meta.exportName,
        file: future.files[0].path,
      },
    });
  } finally {
    delete presentation[future.name];
  }
});
