import type { Metadata } from "next";
import { CatalogPage } from "../catalog-page";

export const metadata: Metadata = {
  title: "Catalog",
  description:
    "Browse interactive experiences and catalog sounds. Play a recipe, then open its workbench or the full example.",
  alternates: { canonical: "/catalog" },
};

export default function Page() {
  return <CatalogPage />;
}
