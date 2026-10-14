"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { Button } from "@base-ui/react/button";
import { SoundMark } from "../icons/catalog-marks";
import { ThrusterPreviewMark } from "../icons/thruster-preview";
import { PlayIcon } from "../icons/play-icon";
import {
  catalogEntries,
  catalogGroups,
  type CatalogEntry,
} from "../lib/catalog";
import { openCatalogLabel } from "./catalog-label";
import { useCollectionSession } from "./collection-session";

export function CatalogCards() {
  const { ready, playing, error, play, stop, stopAll } = useCollectionSession();
  const [selected, setSelected] = useState<string>();

  return (
    <div data-audio-session="catalog">
      {catalogGroups.map((group) => (
        <section
          key={group.id}
          className="catalog-section"
          aria-labelledby={`catalog-${group.id}`}
        >
          <h2 id={`catalog-${group.id}`}>{group.title}</h2>
          <div className="catalog-cards">
            {catalogEntries
              .filter((entry) => entry.category === group.category)
              .map((entry, index) => {
                const sustained =
                  entry.category === "bundled" &&
                  entry.playback === "sustained";
                const status =
                  playing[entry.slug as keyof typeof playing] ??
                  (sustained ? "stopped" : "ready");
                const running =
                  sustained && (status === "starting" || status === "running");
                const action = running ? "Stop" : sustained ? "Start" : "Play";
                return (
                  <article
                    key={entry.slug}
                    id={entry.slug}
                    className="catalog-card"
                    data-catalog-entry={entry.slug}
                    data-status={
                      entry.category === "bundled" ? status : undefined
                    }
                  >
                    <div className="catalog-card-preview" aria-hidden="true">
                      <CatalogPreview entry={entry} index={index} />
                    </div>
                    <div className="catalog-card-copy">
                      <h3>
                        <Link
                          href={entry.href}
                          aria-label={openCatalogLabel(entry)}
                        >
                          {entry.title}
                        </Link>
                      </h3>
                      <p>{entry.description}</p>
                    </div>
                    <div className="catalog-card-actions">
                      <span aria-hidden="true">
                        {entry.category === "experience"
                          ? "Open experience"
                          : "Open sound"}{" "}
                        →
                      </span>
                      {entry.category === "bundled" && (
                        <Button
                          className="play-action"
                          disabled={!ready}
                          aria-label={`${action} ${entry.title.toLowerCase()}`}
                          onClick={() => {
                            setSelected(entry.slug);
                            if (running) stop(entry.slug);
                            else {
                              stopAll();
                              void play(entry.slug);
                            }
                          }}
                        >
                          {running ? null : <PlayIcon />}
                          {action}
                        </Button>
                      )}
                    </div>
                    {entry.category === "bundled" && (
                      <p
                        className="sr-only"
                        data-testid={`${entry.slug}-state`}
                        aria-live="polite"
                      >
                        {entry.title}: {status}
                      </p>
                    )}
                    {selected === entry.slug && error && (
                      <p className="catalog-card-error" role="alert">
                        {error}
                      </p>
                    )}
                  </article>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}

function CatalogPreview({
  entry,
  index,
}: {
  entry: CatalogEntry;
  index: number;
}) {
  if (entry.category === "bundled")
    return <SoundMark family={entry.preview.family} index={index} />;
  if (entry.preview.family === "charge")
    return (
      <div
        className="charge-well"
        style={{ "--charge": 0.75 } as CSSProperties}
      >
        <div className="charge-rings">
          {Array.from({ length: 8 }, (_, i) => (
            <span
              key={i}
              className="charge-ring"
              style={{ "--i": i } as CSSProperties}
            />
          ))}
          <span className="charge-core" />
        </div>
      </div>
    );
  if (entry.preview.family === "thruster")
    return (
      <div className="thruster-field">
        <ThrusterPreviewMark />
      </div>
    );
  return (
    <svg className="catalog-blade-mark" viewBox="0 0 300 200">
      <path
        d="M110 162 L192 30"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path d="M95 188 L110 162" stroke="var(--mute)" strokeWidth="10" />
      <path
        d="M205 105 l12 -7 12 7 v14 l-12 7 -12 -7z"
        fill="none"
        stroke="var(--mute)"
      />
    </svg>
  );
}
