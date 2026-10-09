import type { Metadata } from "next";
import { GalleryPage } from "../gallery-page";

export const metadata: Metadata = {
  title: "Sound collection",
  description:
    "Explore the bundled procedural sound effects. Play, compare, and customize sounds for interfaces and games, then open their code workbenches.",
  alternates: { canonical: "/sounds" },
};

export default function SoundsPage() {
  return <GalleryPage />;
}
