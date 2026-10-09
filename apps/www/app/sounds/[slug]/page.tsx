import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GalleryPage } from "../../gallery-page";
import { sounds, soundInfo, soundKinds } from "../../../lib/gallery";
import type { SoundKind } from "../../../lib/gallery";
export function generateStaticParams() {
  return soundKinds.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!Object.hasOwn(sounds, slug)) notFound();
  const info = soundInfo[slug as SoundKind];
  return {
    title: `${info.title} sound workbench`,
    description: `${info.description} ${info.use}. Play, customize, and integrate with AudioBits.`,
    alternates: { canonical: `/sounds/${slug}` },
  };
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
