import Link from "next/link";
import type { ReactNode } from "react";
import { CatalogLayout } from "./catalog-layout";
import { CatalogLink } from "./catalog-link";
import { catalogEntries } from "../lib/catalog";
import type { CatalogEntry } from "../lib/catalog";

// Shared catalog frame. The child owns the interactive stage and its audio.
export function CatalogDetail({
  entry,
  children,
}: {
  entry: CatalogEntry;
  children: ReactNode;
}) {
  return (
    <CatalogLayout>
      <CatalogEntryHeader entry={entry} />
      <div className="catalog-bench" id={entry.slug}>
        {children}
      </div>
      <CatalogPagination entry={entry} />
    </CatalogLayout>
  );
}

function CatalogEntryHeader({ entry }: { entry: CatalogEntry }) {
  return (
    <header className="catalog-entry-header">
      <nav className="catalog-breadcrumb" aria-label="Breadcrumb">
        <ol>
          <li>
            <Link href="/catalog">Catalog</Link>
          </li>
          <li>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{entry.title}</span>
          </li>
        </ol>
      </nav>
      <h1>{entry.title}</h1>
      <p>{entry.description}</p>
    </header>
  );
}

function CatalogPagination({ entry }: { entry: CatalogEntry }) {
  const index = catalogEntries.findIndex((item) => item.slug === entry.slug);
  const previous = catalogEntries[index - 1];
  const next = catalogEntries[index + 1];
  return (
    <nav className="catalog-pagination" aria-label="Previous and next">
      {previous && (
        <CatalogLink rel="prev" href={previous.href}>
          ← Previous: {previous.title}
        </CatalogLink>
      )}
      {next && (
        <CatalogLink rel="next" href={next.href}>
          Next: {next.title} →
        </CatalogLink>
      )}
    </nav>
  );
}
