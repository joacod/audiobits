import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogDetail } from "../../catalog-detail";
import { CatalogSoundBench } from "../../catalog-sound-bench";
import {
  bundledCatalogEntry,
  bundledDetailDescription,
  catalogEntriesByCategory,
} from "../../../lib/catalog";
import { rawExampleSource } from "../../../lib/site-build";

export function generateStaticParams() {
  return catalogEntriesByCategory("bundled").map((entry) => ({
    slug: entry.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = bundledCatalogEntry(slug);
  if (!entry) notFound();
  return {
    title: entry.title,
    description: bundledDetailDescription(entry),
    alternates: { canonical: entry.href },
  };
}

export default async function CatalogSoundPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = bundledCatalogEntry(slug);
  if (!entry) notFound();
  const markIndex = catalogEntriesByCategory("bundled").findIndex(
    (item) => item.slug === entry.slug,
  );
  return (
    <CatalogDetail entry={entry}>
      <CatalogSoundBench
        slug={entry.slug}
        markIndex={markIndex}
        rawSource={rawExampleSource()}
      />
    </CatalogDetail>
  );
}
