import { expect, test } from "vitest";
import {
  energyChargeExperience,
  reactiveThrusterExperience,
} from "./experiences";
import { demos, soundKinds } from "./gallery";
import { catalogEntries, catalogGroups } from "./catalog";

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

test("catalog index covers every current entry once, in collection order", () => {
  expect(catalogGroups.map((group) => [group.category, group.title])).toEqual([
    ["experience", "Interactive experiences"],
    ["bundled", "Bundled sounds"],
  ]);
  expect(catalogEntries.map((entry) => entry.category)).toEqual([
    "experience",
    "experience",
    ...bundledOrder.map(() => "bundled" as const),
  ]);
  expect(catalogEntries.map((entry) => entry.slug)).toEqual([
    "energy-charge",
    "reactive-thruster",
    ...bundledOrder,
  ]);
  expect(new Set(catalogEntries.map((entry) => entry.slug)).size).toBe(
    catalogEntries.length,
  );
  expect(new Set(catalogEntries.map((entry) => entry.href)).size).toBe(
    catalogEntries.length,
  );
  expect([...soundKinds].sort()).toEqual([...bundledOrder].sort());
  expect(catalogEntries).toHaveLength(soundKinds.length + 2);
});

test("catalog entries derive links and playback from website metadata", () => {
  const [charge, reactive] = catalogEntries;
  expect(charge).toMatchObject({
    title: energyChargeExperience.title,
    description: energyChargeExperience.description,
    href: energyChargeExperience.href,
    controls: energyChargeExperience.controls,
    source: { files: energyChargeExperience.sourceFiles },
    preview: { family: "charge" },
  });
  expect(reactive).toMatchObject({
    title: reactiveThrusterExperience.title,
    description: reactiveThrusterExperience.description,
    href: reactiveThrusterExperience.href,
    controls: reactiveThrusterExperience.controls,
    source: { files: reactiveThrusterExperience.sourceFiles },
    preview: { family: "thruster" },
  });
  expect("playback" in charge).toBe(false);
  expect("playback" in reactive).toBe(false);

  for (const slug of bundledOrder) {
    const entry = catalogEntries.find((item) => item.slug === slug);
    const demo = demos[slug];
    expect(entry).toMatchObject({
      category: "bundled",
      title: demo.title,
      description: demo.description,
      href: `/sounds/${slug}`,
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
    href: "/sounds/thruster",
  });
  expect(experienceThruster).toMatchObject({
    category: "experience",
    href: "/experiences/reactive-thruster",
  });
});
