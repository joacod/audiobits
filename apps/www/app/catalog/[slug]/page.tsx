import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { notFound } from "next/navigation";
import { CatalogDetail } from "../../catalog-detail";
import { CatalogInstall } from "../../catalog-install";
import { ExperienceSource } from "../../experience-source";
import { CatalogSoundBench } from "../../catalog-sound-bench";
import {
  bundledCatalogEntry,
  bundledDetailDescription,
  catalogEntries,
  catalogEntriesByCategory,
  experienceCatalogEntry,
  experienceDetailDescription,
} from "../../../lib/catalog";
import { experienceSourceFiles } from "../../../lib/registry";
import { experienceSourcePurpose } from "../../../lib/experiences";
import { rawExampleSource } from "../../../lib/site-build";

function ChargeStageFallback() {
  return (
    <div className="catalog-stage catalog-charge-stage">
      <div className="catalog-charge-well" />
    </div>
  );
}

function ThrusterStageFallback() {
  return (
    <div className="catalog-stage catalog-thruster-stage">
      <div className="flight-pad" />
    </div>
  );
}

const EnergyChargeDetail = dynamic(
  () =>
    import("../../energy-charge-detail").then(
      (module) => module.EnergyChargeDetail,
    ),
  { loading: ChargeStageFallback },
);
const ThrusterDetail = dynamic(
  () => import("../../thruster-detail").then((module) => module.ThrusterDetail),
  { loading: ThrusterStageFallback },
);

const LightsaberDetail = dynamic(
  () =>
    import("../../lightsaber-detail").then((module) => module.LightsaberDetail),
  {
    loading: () => (
      <div className="catalog-stage" aria-label="Loading Lightsaber" />
    ),
  },
);

function readExperienceSources(slug: keyof typeof experienceSourcePurpose) {
  const purposes = experienceSourcePurpose[slug];
  return experienceSourceFiles(slug).map(({ name, path }) => ({
    name,
    purpose: (purposes as Readonly<Record<string, string>>)[name],
    code: readFileSync(join(process.cwd(), "../..", path), "utf8"),
  }));
}

export function generateStaticParams() {
  return catalogEntries.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const bundled = bundledCatalogEntry(slug);
  if (bundled) {
    return {
      title: bundled.title,
      description: bundledDetailDescription(bundled),
      alternates: { canonical: bundled.href },
    };
  }
  const experience = experienceCatalogEntry(slug);
  if (!experience) notFound();
  return {
    title: experience.title,
    description: experienceDetailDescription(experience),
    alternates: { canonical: experience.href },
  };
}

export default async function CatalogEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const bundled = bundledCatalogEntry(slug);
  if (bundled) {
    const markIndex = catalogEntriesByCategory("bundled").findIndex(
      (item) => item.slug === bundled.slug,
    );
    return (
      <CatalogDetail entry={bundled}>
        <CatalogSoundBench
          slug={bundled.slug}
          markIndex={markIndex}
          rawSource={rawExampleSource()}
        />
      </CatalogDetail>
    );
  }
  const experience = experienceCatalogEntry(slug);
  if (!experience) notFound();
  if (experience.slug === "lightsaber") {
    return (
      <CatalogDetail entry={experience}>
        <LightsaberDetail />
        <CatalogInstall slug={experience.slug} />
        <div className="catalog-inspector">
          <h2>Inspect source</h2>
          <ExperienceSource
            presentation="Five original recipes, motion mapping, voice ownership, browser lifecycle, and the canvas stage. The same source powers this page and the standalone demo."
            sources={readExperienceSources(experience.slug)}
          />
        </div>
      </CatalogDetail>
    );
  }
  if (experience.slug === "energy-charge") {
    return (
      <CatalogDetail entry={experience}>
        <EnergyChargeDetail sources={readExperienceSources(experience.slug)} />
      </CatalogDetail>
    );
  }
  if (experience.slug === "reactive-thruster") {
    return (
      <CatalogDetail entry={experience}>
        <ThrusterDetail sources={readExperienceSources(experience.slug)} />
      </CatalogDetail>
    );
  }
  notFound();
}
