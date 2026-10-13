import "./plasma-blade.css";
import type { CSSProperties } from "react";
import Link from "next/link";
import { ThrusterPreviewMark } from "../icons/thruster-preview";
import { catalogEntriesByCategory } from "../lib/catalog";
import { openCatalogLabel } from "./catalog-label";

export function CatalogExperiences() {
  const experiences = catalogEntriesByCategory("experience");
  return (
    <section className="catalog-section" aria-labelledby="catalog-experiences">
      <h2 id="catalog-experiences">Interactive experiences</h2>
      <div className="catalog-experiences">
        {experiences.map((entry) => (
          <article
            key={entry.slug}
            id={entry.slug}
            className={`catalog-experience catalog-experience-${entry.preview.family}`}
            data-catalog-entry={entry.slug}
          >
            {entry.preview.family === "charge" && <ChargePreview />}
            {entry.preview.family === "blade" && (
              <svg
                className="plasma-preview"
                viewBox="0 0 300 200"
                aria-hidden="true"
              >
                <path
                  d="M110 162 L192 30"
                  stroke="#b44cff"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
                <path
                  d="M110 162 L192 30"
                  stroke="#eee8ff"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <path d="M95 188 L110 162" stroke="#777781" strokeWidth="10" />
                <path
                  d="M205 105 l12 -7 12 7 v14 l-12 7 -12 -7z"
                  fill="none"
                  stroke="#bc8e53"
                />
              </svg>
            )}
            <div className="catalog-experience-copy">
              <h3>{entry.title}</h3>
              <p>{entry.description}</p>
              <Link className="catalog-open" href={entry.href}>
                {openCatalogLabel(entry)}
              </Link>
            </div>
            {entry.preview.family === "thruster" && <ThrusterPreview />}
          </article>
        ))}
      </div>
    </section>
  );
}

function ChargePreview() {
  return (
    <div
      className="charge-well"
      aria-hidden="true"
      style={{ "--charge": 0.75 } as CSSProperties}
    >
      <div className="charge-rings">
        {Array.from({ length: 8 }, (_, index) => (
          <span
            key={index}
            className="charge-ring"
            style={{ "--i": index } as CSSProperties}
          />
        ))}
        <span className="charge-core" />
      </div>
    </div>
  );
}

function ThrusterPreview() {
  return (
    <div className="thruster-field" aria-hidden="true">
      <ThrusterPreviewMark />
    </div>
  );
}
