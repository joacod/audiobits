import Link from "next/link";
import type { ReactNode } from "react";
import { CatalogLayout } from "./catalog-layout";
import { bundledCatalogEntry, catalogEntries } from "../lib/catalog";
import type { CatalogEntry } from "../lib/catalog";

const soundDescription = {
  confirmation: "A soft upward chime for a completed action.",
  "tactile-click": "A small, rounded click for buttons and toggles.",
  "gentle-rejection": "Two soft descending tones for an unavailable action.",
  "glass-notification": "A delicate glass chime for quiet notifications.",
  impact:
    "A punchy hit. Adjust intensity for a lighter tap or a heavier collision.",
  whoosh:
    "A rush of air for transitions and movement. Adjust size to change its weight.",
  "power-up": "A rising tone that builds energy for rewards and pickups.",
  thruster: "A continuous engine sound. Adjust throttle while it runs.",
};

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
      <p>
        {entry.category === "bundled"
          ? soundDescription[entry.slug]
          : entry.description}
      </p>
    </header>
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
