import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { CatalogDetail } from "../../catalog-detail";
import { CatalogInstall } from "../../catalog-install";
import { UsageCode } from "../../usage-code";
import { CatalogSoundBench } from "../../catalog-sound-bench";
import {
  bundledCatalogEntry,
  bundledDetailDescription,
  catalogEntries,
  experienceCatalogEntry,
  experienceDetailDescription,
} from "../../../lib/catalog";
import { experienceUsage } from "../../../lib/site-build";
import { highlightCode } from "../../../lib/highlight-code";
import { CodeBlock } from "../../code-block";

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

const EchoProbeDetail = dynamic(
  () =>
    import("../../echo-probe-detail").then((module) => module.EchoProbeDetail),
  {
    loading: () => (
      <div className="catalog-stage" aria-label="Loading Echo Probe" />
    ),
  },
);

const RiftDetail = dynamic(
  () => import("../../rift-detail").then((module) => module.RiftDetail),
  {
    loading: () => (
      <div className="catalog-stage" aria-label="Loading The Rift" />
    ),
  },
);

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
    return (
      <CatalogDetail entry={bundled}>
        <CatalogSoundBench slug={bundled.slug} />
      </CatalogDetail>
    );
  }
  const experience = experienceCatalogEntry(slug);
  if (!experience) notFound();
  const code = experienceUsage(experience.slug);
  const tokens = await highlightCode(code, "typescript");
  return (
    <CatalogDetail entry={experience}>
      {experience.slug === "the-rift" ? (
        <RiftDetail />
      ) : experience.slug === "echo-probe" ? (
        <EchoProbeDetail />
      ) : experience.slug === "lightsaber" ? (
        <LightsaberDetail />
      ) : experience.slug === "energy-charge" ? (
        <EnergyChargeDetail />
      ) : (
        <ThrusterDetail />
      )}
      <CatalogInstall slug={experience.slug}>
        <UsageCode slug={experience.slug} code={code}>
          <CodeBlock code={code} tokens={tokens} />
        </UsageCode>
      </CatalogInstall>
      <section className="catalog-inspector">
        <h2>Customize or inspect</h2>
        <p>
          Connect your application&apos;s state and events to the sound
          controller. The full showcase source includes the browser host, input,
          and visuals.
        </p>
        <a
          href={`https://github.com/joacod/audiobits/tree/main/catalog/experiences/${experience.slug}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          View complete public source
        </a>
      </section>
    </CatalogDetail>
  );
}
