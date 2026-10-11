import {
  energyChargeExperience,
  reactiveThrusterExperience,
} from "./experiences";
import { demos, type SoundKind } from "./gallery";

// Navigation metadata only. Recipes stay in the gallery module.
export type CatalogFamily =
  "charge" | "thruster" | "pulse" | "harmonic" | "flow";

type CatalogEntryBase = {
  slug: string;
  title: string;
  description: string;
  href: string;
};

export type ExperienceCatalogEntry = CatalogEntryBase & {
  category: "experience";
  controls: readonly string[];
  preview: { family: "charge" | "thruster" };
  source: { files: readonly string[] };
};

export type BundledCatalogEntry = CatalogEntryBase & {
  category: "bundled";
  slug: SoundKind;
  playback: "one-shot" | "sustained";
  use: string;
  preview: { family: "pulse" | "harmonic" | "flow" };
  source: { exportName: string };
};

export type CatalogEntry = ExperienceCatalogEntry | BundledCatalogEntry;
export type CatalogCategory = CatalogEntry["category"];

const experienceEntries = [
  {
    slug: "energy-charge",
    preview: "charge",
    experience: energyChargeExperience,
  },
  {
    slug: "reactive-thruster",
    preview: "thruster",
    experience: reactiveThrusterExperience,
  },
] as const;

const bundledOrder = [
  "confirmation",
  "tactile-click",
  "gentle-rejection",
  "glass-notification",
  "impact",
  "whoosh",
  "power-up",
  "thruster",
] as const satisfies readonly SoundKind[];

export const catalogGroups = [
  {
    id: "experiences",
    title: "Interactive experiences",
    category: "experience",
  },
  { id: "sounds", title: "Bundled sounds", category: "bundled" },
] as const satisfies readonly {
  id: string;
  title: string;
  category: CatalogCategory;
}[];

export const catalogEntries: readonly CatalogEntry[] = [
  ...experienceEntries.map((item): ExperienceCatalogEntry => ({
    slug: item.slug,
    title: item.experience.title,
    description: item.experience.description,
    category: "experience",
    href: item.experience.href,
    controls: item.experience.controls,
    preview: { family: item.preview },
    source: { files: item.experience.sourceFiles },
  })),
  ...bundledOrder.map((slug): BundledCatalogEntry => {
    const demo = demos[slug];
    return {
      slug,
      title: demo.title,
      description: demo.description,
      category: "bundled",
      href: `/catalog/${slug}`,
      playback: demo.recipe.kind,
      use: demo.use,
      preview: { family: demo.visualFamily },
      source: { exportName: demo.exportName },
    };
  }),
];

export function catalogEntriesByCategory(
  category: "experience",
): readonly ExperienceCatalogEntry[];
export function catalogEntriesByCategory(
  category: "bundled",
): readonly BundledCatalogEntry[];
export function catalogEntriesByCategory(category: CatalogCategory) {
  return catalogEntries.filter((entry) => entry.category === category) as
    readonly ExperienceCatalogEntry[] | readonly BundledCatalogEntry[];
}

export function bundledCatalogEntry(slug: string) {
  const entry = catalogEntries.find((item) => item.slug === slug);
  return entry?.category === "bundled" ? entry : undefined;
}

export function bundledDetailDescription(entry: BundledCatalogEntry) {
  return `${entry.description} ${entry.use}. Play, customize, and copy the current sound.`;
}
