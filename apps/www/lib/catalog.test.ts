import registry from "../../../registry.json" with { type: "json" };
import { expect, test } from "vitest";
import {
  energyChargeExperience,
  lightsaberExperience,
  reactiveThrusterExperience,
} from "./experiences";
import { demos, soundKinds } from "./gallery";
import { catalogEntries, catalogGroups } from "./catalog";
import { experienceSourceFiles } from "./registry";
import { readFileSync } from "node:fs";

const bundledOrder = [
  "confirmation",
  "tactile-click",
  "gentle-rejection",
  "glass-notification",
  "impact",
  "whoosh",
  "power-up",
  "thruster",
] as const;

test("sound-only installation keeps complete showcase sources available", () => {
  for (const experience of [
    energyChargeExperience,
    reactiveThrusterExperience,
    lightsaberExperience,
  ]) {
    const id = experience.href.split("/").at(-1)!;
    expect(experienceSourceFiles(id).map((file) => file.name)).toEqual([
      "recipe.ts",
      id === "energy-charge"
        ? "progress.ts"
        : id === "reactive-thruster"
          ? "pointer.ts"
          : "controller.ts",
    ]);
    expect(experience.sourceFiles).toContain("host.ts");
    expect(experience.sourceFiles).toContain("index.html");
    for (const file of experience.sourceFiles)
      expect(
        readFileSync(`catalog/experiences/${id}/${file}`, "utf8").length,
      ).toBeGreaterThan(0);
  }
});

test("catalog index covers every current entry once, in collection order", () => {
  expect(catalogGroups.map((group) => [group.category, group.title])).toEqual([
    ["experience", "Interactive experiences"],
    ["bundled", "Catalog sounds"],
  ]);
  expect(catalogEntries.map((entry) => entry.category)).toEqual([
    "experience",
    "experience",
    "experience",
    ...bundledOrder.map(() => "bundled" as const),
  ]);
  expect(catalogEntries.map((entry) => entry.slug)).toEqual([
    "energy-charge",
    "reactive-thruster",
    "lightsaber",
    ...bundledOrder,
  ]);
  expect(new Set(catalogEntries.map((entry) => entry.slug)).size).toBe(
    catalogEntries.length,
  );
  expect(new Set(catalogEntries.map((entry) => entry.href)).size).toBe(
    catalogEntries.length,
  );
  expect([...soundKinds].sort()).toEqual([...bundledOrder].sort());
  expect(catalogEntries).toHaveLength(soundKinds.length + 3);
  expect(catalogEntries.map((item) => item.slug).sort()).toEqual(
    registry.items.map((item) => item.name).sort(),
  );
});

test("catalog entries derive links and playback from website metadata", () => {
  const [charge, reactive] = catalogEntries;
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
  expect(catalogEntries[2]).toMatchObject({
    title: "Lightsaber",
    href: "/catalog/lightsaber",
    preview: { family: "blade" },
    source: { files: lightsaberExperience.sourceFiles },
  });
  expect(lightsaberExperience.title).toBe("Lightsaber");
  expect("playback" in charge).toBe(false);
  expect("playback" in reactive).toBe(false);

  for (const slug of bundledOrder) {
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
