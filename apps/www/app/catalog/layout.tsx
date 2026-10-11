import type { ReactNode } from "react";
import { SiteHeader } from "../site-header";
import "../catalog.css";

export default function CatalogRouteLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main className="foundation catalog-page">
      <SiteHeader current="catalog" />
      {children}
    </main>
  );
}
