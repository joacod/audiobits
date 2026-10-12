import Link from "next/link";
import { CatalogLayout } from "./catalog-layout";
import { CatalogExperiences } from "./catalog-experiences";
import { CatalogSounds } from "./catalog-sounds";

export function CatalogPage() {
  return (
    <CatalogLayout>
      <p className="catalog-intro">Play. Adjust. Add to project.</p>
      <CatalogExperiences />
      <CatalogSounds />
      <footer className="catalog-footer">
        <Link href="/docs/catalog">Catalog and installation guide</Link>
      </footer>
    </CatalogLayout>
  );
}
