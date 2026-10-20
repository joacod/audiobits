import Link from "next/link";
import type { ReactNode } from "react";
import { CatalogLayout } from "./catalog-layout";
import { ExperienceLink } from "./experience-link";
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
      <div
        className="catalog-bench"
        id={entry.slug}
        data-family={entry.preview.family}
      >
        {children}
      </div>
      <CatalogPagination entry={entry} />
    </CatalogLayout>
  );
}

function CatalogEntryHeader({ entry }: { entry: CatalogEntry }) {
  return (
    <header className="catalog-entry-header" data-family={entry.preview.family}>
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
        <ExperienceLink rel="prev" href={previous.href}>
          <span className="catalog-pagination-arrow" aria-hidden="true">
            ←
          </span>
          <span className="catalog-pagination-copy">
            <span className="catalog-pagination-label">Previous</span>
            <span className="catalog-pagination-title">{previous.title}</span>
          </span>
        </ExperienceLink>
      )}
      {next && (
        <ExperienceLink rel="next" href={next.href}>
          <span className="catalog-pagination-copy">
            <span className="catalog-pagination-label">Next</span>
            <span className="catalog-pagination-title">{next.title}</span>
          </span>
          <span className="catalog-pagination-arrow" aria-hidden="true">
            →
          </span>
        </ExperienceLink>
      )}
    </nav>
  );
}
