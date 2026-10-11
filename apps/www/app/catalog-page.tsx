import Link from "next/link";
import { CatalogLayout } from "./catalog-layout";
import { CatalogExperiences } from "./catalog-experiences";
import { CatalogSounds } from "./catalog-sounds";
import { siteBuild } from "../lib/site-build";

export function CatalogPage() {
  return (
    <CatalogLayout>
      <CatalogExperiences />
      <CatalogSounds />
      <footer className="catalog-footer">
        <p>Available on npm · {siteBuild.version}</p>
        <p className="catalog-install">
          <code>npm install audiobits</code>
        </p>
        <Link href="/docs">Documentation</Link>
      </footer>
    </CatalogLayout>
  );
}
