import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogExperience } from "../../catalog-experience";
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
  const code = experienceUsage(experience.source.item);
  const tokens = await highlightCode(code, "typescript");
  return (
    <CatalogDetail entry={experience}>
      <CatalogExperience slug={experience.slug} />
      <CatalogInstall slug={experience.source.item}>
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
          href={
            experience.slug === "echo-vision"
              ? "https://github.com/joacod/audiobits/blob/main/apps/www/app/echo-vision-stage.ts"
              : `https://github.com/joacod/audiobits/tree/main/catalog/experiences/${experience.source.item}`
          }
          target="_blank"
          rel="noopener noreferrer"
        >
          View complete public source
        </a>
      </section>
    </CatalogDetail>
  );
}
