import Link from "next/link";
import { CatalogLayout } from "./catalog-layout";
import { CatalogCards } from "./catalog-cards";

export function CatalogPage() {
  return (
    <CatalogLayout>
      <p className="catalog-intro">Play. Adjust. Add to project.</p>
      <CatalogCards />
      <footer className="catalog-footer">
        <Link href="/docs/catalog">Catalog and installation guide</Link>
      </footer>
    </CatalogLayout>
  );
}
