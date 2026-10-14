import registry from "../../../registry.json" with { type: "json" };
import {
  energyChargeExperience,
  lightsaberExperience,
  reactiveThrusterExperience,
} from "./experiences";
import { demos, type SoundKind } from "./gallery";

// Navigation metadata only. Recipes stay in the gallery module.
export type CatalogFamily =
  "charge" | "thruster" | "blade" | "pulse" | "harmonic" | "flow";

type CatalogEntryBase = {
  slug: string;
  title: string;
  description: string;
  href: string;
};

export type ExperienceCatalogEntry = CatalogEntryBase & {
  category: "experience";
  controls: readonly string[];
  preview: { family: "charge" | "thruster" | "blade" };
  source: { files: readonly string[] };
  relatedSounds: readonly string[];
};

export type BundledCatalogEntry = CatalogEntryBase & {
  category: "bundled";
  slug: SoundKind;
  playback: "one-shot" | "sustained";
  use: string;
  preview: { family: "pulse" | "harmonic" | "flow" };
  source: { exportName: string; file: string };
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
  { slug: "lightsaber", preview: "blade", experience: lightsaberExperience },
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
  { id: "sounds", title: "Catalog sounds", category: "bundled" },
] as const satisfies readonly {
  id: string;
  title: string;
  category: CatalogCategory;
}[];

export const catalogEntries: readonly CatalogEntry[] = [
  ...registry.items
    .filter((item) => item.meta.classification === "experience")
    .sort(
      (a, b) =>
        experienceEntries.findIndex((item) => item.slug === a.name) -
        experienceEntries.findIndex((item) => item.slug === b.name),
    )
    .map((entry): ExperienceCatalogEntry => {
      const item = experienceEntries.find((item) => item.slug === entry.name)!;
      return {
        slug: entry.name,
        title: entry.title,
        description: entry.description,
        category: "experience",
        href: `/catalog/${entry.name}`,
        controls: item.experience.controls,
        preview: { family: item.preview },
        source: { files: item.experience.sourceFiles },
        relatedSounds: item.experience.relatedSounds,
      };
    }),
  ...registry.items
    .filter((item) => item.meta.classification === "recipe")
    .map((item) => item.name as SoundKind)
    .sort((a, b) => bundledOrder.indexOf(a) - bundledOrder.indexOf(b))
    .map((slug): BundledCatalogEntry => {
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
        source: {
          exportName: demo.exportName,
          file: registry.items.find((item) => item.name === slug)!.files[0]
            .path,
        },
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

export function experienceCatalogEntry(slug: string) {
  const entry = catalogEntries.find((item) => item.slug === slug);
  return entry?.category === "experience" ? entry : undefined;
}

export function bundledDetailDescription(entry: BundledCatalogEntry) {
  return `${entry.description} ${entry.use}. Play, customize, and copy the current sound.`;
}

export function experienceDetailDescription(entry: ExperienceCatalogEntry) {
  return `${entry.description} Hear and interact, then add the sound controller to your project.`;
}
