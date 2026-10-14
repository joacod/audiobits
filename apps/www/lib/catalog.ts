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

// Static imports, controls, previews and curated order are website setup.
// A new registry item must declare that setup before it can be presented.
export function createCatalogEntries(
  items = registry.items,
): readonly CatalogEntry[] {
  for (const entry of items) {
    if (entry.meta.classification === "recipe" && !(entry.name in demos))
      throw new Error(
        `${entry.name}: missing website recipe presentation and usage setup`,
      );
    if (
      entry.meta.classification === "experience" &&
      !experienceEntries.some((item) => item.slug === entry.name)
    )
      throw new Error(
        `${entry.name}: missing website experience presentation setup`,
      );
  }
  return [
    ...items
      .filter((item) => item.meta.classification === "experience")
      .sort(
        (a, b) =>
          experienceEntries.findIndex((item) => item.slug === a.name) -
          experienceEntries.findIndex((item) => item.slug === b.name),
      )
      .map((entry): ExperienceCatalogEntry => {
        const item = experienceEntries.find(
          (item) => item.slug === entry.name,
        )!;
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
    ...items
      .filter((item) => item.meta.classification === "recipe")
      .sort(
        (a, b) =>
          bundledOrder.indexOf(a.name as SoundKind) -
          bundledOrder.indexOf(b.name as SoundKind),
      )
      .map((item): BundledCatalogEntry => {
        const slug = item.name as SoundKind;
        const demo = demos[slug];
        return {
          slug,
          title: item.title,
          description: item.description,
          category: "bundled",
          href: `/catalog/${slug}`,
          playback: demo.recipe.kind,
          use: demo.use,
          preview: { family: demo.visualFamily },
          source: {
            exportName: item.meta.exportName,
            file: item.files[0].path,
          },
        };
      }),
  ];
}

export const catalogEntries = createCatalogEntries();

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
