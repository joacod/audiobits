import { notFound } from "next/navigation";
import { GalleryPage } from "../../gallery-page";
import { sounds } from "../../../lib/gallery";
import type { SoundKind } from "../../../lib/gallery";
export function generateStaticParams() {
  return Object.keys(sounds).map((slug) => ({ slug }));
}
export default async function SoundPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!Object.hasOwn(sounds, slug)) notFound();
  return <GalleryPage selected={slug as SoundKind} />;
}
