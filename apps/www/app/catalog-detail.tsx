import Link from "next/link";
import type { ReactNode } from "react";
import { CatalogLayout } from "./catalog-layout";
import { bundledCatalogEntry, catalogEntries } from "../lib/catalog";
import type { CatalogEntry } from "../lib/catalog";
import { siteBuild } from "../lib/site-build";

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
      <CatalogRelated entry={entry} />
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

function CatalogEntryHeader({ entry }: { entry: CatalogEntry }) {
  const group =
    entry.category === "bundled" ? "Catalog sounds" : "Interactive experiences";
  const groupHref =
    entry.category === "bundled"
      ? "/catalog#catalog-sounds"
      : "/catalog#catalog-experiences";
  return (
    <header className="catalog-entry-header">
      <nav className="catalog-breadcrumb" aria-label="Breadcrumb">
        <ol>
          <li>
            <Link href="/catalog">Catalog</Link>
          </li>
          <li>
            <span aria-hidden="true">/</span>
            <Link href={groupHref}>{group}</Link>
          </li>
          <li>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{entry.title}</span>
          </li>
        </ol>
      </nav>
      <h1>{entry.title}</h1>
      <p>{entry.description}</p>
      <p className="catalog-source">{sourceLabel(entry)}</p>
    </header>
  );
}

function sourceLabel(entry: CatalogEntry) {
  if (entry.category === "bundled") {
    return (
      <>
        Copy-owned sound · {entry.use}. Source <code>{entry.source.file}</code>.
      </>
    );
  }
  return (
    <>
      Independent catalog source you own.{" "}
      {entry.source.files.map((file, index) => (
        <span key={file}>
          {index > 0 ? ", " : null}
          <code>{file}</code>
        </span>
      ))}
      .
    </>
  );
}

function CatalogRelated({ entry }: { entry: CatalogEntry }) {
  const group = catalogEntries.filter(
    (item) => item.category === entry.category,
  );
  const index = group.findIndex((item) => item.slug === entry.slug);
  const previous = group[(index - 1 + group.length) % group.length];
  const next = group[(index + 1) % group.length];
  const showNext = next && next !== previous;
  const rest = group.filter(
    (item) => item.slug !== entry.slug && item !== previous && item !== next,
  );
  const relatedSounds =
    entry.category === "experience"
      ? entry.relatedSounds.flatMap((slug) => {
          const sound = bundledCatalogEntry(slug);
          return sound ? [sound] : [];
        })
      : [];
  const heading =
    entry.category === "bundled" ? "Related sounds" : "Related experiences";
  return (
    <section className="catalog-related">
      <h2>{heading}</h2>
      <nav aria-label="Related entries">
        {previous && (
          <Link href={previous.href}>Previous: {previous.title}</Link>
        )}
        {showNext && next && <Link href={next.href}>Next: {next.title}</Link>}
        {rest.length > 0 && (
          <ul>
            {rest.map((item) => (
              <li key={item.slug}>
                <Link href={item.href}>{item.title}</Link>
              </li>
            ))}
          </ul>
        )}
      </nav>
      {relatedSounds.length > 0 && (
        <nav aria-label="Related sounds">
          {relatedSounds.map((sound) => (
            <Link key={sound.slug} href={sound.href}>
              {sound.title}
            </Link>
          ))}
        </nav>
      )}
      <nav className="catalog-docs" aria-label="Documentation">
        <Link href="/docs/recipes">Recipes</Link>
        <Link href="/docs/parameters">Parameters</Link>
        <Link href="/docs/lifecycle">Playback and lifecycle</Link>
      </nav>
    </section>
  );
}
