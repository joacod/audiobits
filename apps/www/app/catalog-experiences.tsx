import type { CSSProperties } from "react";
import Link from "next/link";
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
            <div className="catalog-experience-copy">
              <h3>{entry.title}</h3>
              <p>{entry.description}</p>
              <ul className="catalog-controls">
                {entry.controls.map((control) => (
                  <li key={control}>{control}</li>
                ))}
              </ul>
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
      <svg viewBox="0 0 320 148">
        <path d="M12 34c52-20 96-16 296 10" />
        <path d="M12 62c70-14 128 28 296-8" />
        <path d="M12 90c46 18 150 14 296-10" />
        <path d="M12 116c78-22 140 12 296 6" />
        <circle className="thruster-point" cx="247" cy="74" r="4" />
      </svg>
    </div>
  );
}
