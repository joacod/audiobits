"use client";

import Link from "next/link";
import { Button } from "@base-ui/react/button";
import { AudioMonitor } from "./audio-monitor";
import { PlaySpark } from "./play-spark";
import { SoundMark } from "../icons/catalog-marks";
import { PlayIcon } from "../icons/play-icon";
import { openCatalogLabel } from "./catalog-label";
import { useCollectionSession } from "./collection-session";
import { catalogEntriesByCategory } from "../lib/catalog";
import type { BundledCatalogEntry } from "../lib/catalog";
import { soundInfo } from "../lib/gallery";

function statusFor(entry: BundledCatalogEntry, playing?: string) {
  return playing ?? (entry.playback === "sustained" ? "stopped" : "ready");
}

export function CatalogSounds() {
  const entries = catalogEntriesByCategory("bundled");
  const {
    ready,
    playing,
    volume,
    engine,
    state,
    error,
    muted,
    current,
    active,
    play,
    stop,
    stopAll,
    toggleMuted,
    changeVolume,
  } = useCollectionSession();
  return (
    <section className="catalog-section" aria-labelledby="catalog-sounds">
      <h2 id="catalog-sounds">Catalog sounds</h2>
      <p className="catalog-section-hint">
        Preview a sound. Open its workbench to customize and install it.
      </p>
      <div className="catalog-output" data-audio-session="catalog">
        <AudioMonitor
          engine={engine}
          active={active}
          current={
            current
              ? `${soundInfo[current].title} · ${playing[current] ?? "ready"}`
              : ""
          }
          state={state}
          muted={muted}
          volume={volume}
          ready={ready}
          error={error}
          onMute={toggleMuted}
          onStop={stopAll}
          onVolume={changeVolume}
        />
      </div>
      <div className="catalog-sounds">
        {entries.map((entry, index) => {
          const sustained = entry.playback === "sustained";
          const status = statusFor(entry, playing[entry.slug]);
          const running =
            sustained && (status === "starting" || status === "running");
          const action = running ? "Stop" : sustained ? "Start" : "Play";
          return (
            <article
              key={entry.slug}
              id={entry.slug}
              className={`catalog-sound catalog-sound-${entry.preview.family}`}
              data-catalog-entry={entry.slug}
              data-status={status}
            >
              <SoundMark family={entry.preview.family} index={index} />
              <div className="catalog-sound-copy">
                <h3>{entry.title}</h3>
                <p className="catalog-use">
                  {entry.use
                    .replace("one-shot", "quick sound")
                    .replace("sustained", "continuous sound")}
                </p>
                <p
                  className="catalog-status"
                  data-testid={`${entry.slug}-state`}
                  aria-live="polite"
                >
                  {entry.title}: {status}
                </p>
              </div>
              <div className="catalog-sound-actions">
                <PlaySpark>
                  <Button
                    className="play-action"
                    disabled={!ready}
                    onClick={() =>
                      running ? stop(entry.slug) : void play(entry.slug)
                    }
                  >
                    {running ? null : <PlayIcon />}
                    {action} {entry.title.toLowerCase()}
                  </Button>
                </PlaySpark>
                <Link className="catalog-open" href={entry.href}>
                  {openCatalogLabel(entry)}
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
