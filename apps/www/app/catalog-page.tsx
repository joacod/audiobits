import Link from "next/link";
import { SiteHeader } from "./site-header";
import { CatalogLayout } from "./catalog-layout";
import { CatalogExperiences } from "./catalog-experiences";
import { CatalogSounds } from "./catalog-sounds";
import { siteBuild } from "../lib/site-build";
import "./catalog.css";

export function CatalogPage() {
  return (
    <main className="foundation catalog-page">
      <SiteHeader current="catalog" />
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
    </main>
  );
}
