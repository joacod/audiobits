"use client";

import Link from "next/link";

import { SoundCard } from "./sound-card";
import { AudioMonitor } from "./audio-monitor";
import { LandingExperience } from "./landing-experience";
import { soundInfo, soundKinds } from "../lib/gallery";
import type { SoundKind } from "../lib/gallery";
import { useCollectionSession } from "./collection-session";

export function SoundGallery({
  rawSource,
  selected,
  landing = false,
}: {
  rawSource: string;
  selected?: SoundKind;
  landing?: boolean;
}) {
  const {
    ready,
    recipes,
    controls,
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
    updateControl,
    resetControl,
    setSeed,
    applyRecipe,
    toggleMuted,
    changeVolume,
    setPlaying,
    setError,
  } = useCollectionSession(landing);
  if (landing) {
    return (
      <LandingExperience
        engine={engine}
        ready={ready}
        controls={controls}
        playing={playing}
        error={error}
        muted={muted}
        onPlay={play}
        onStop={() => {
          stopAll();
          setError("");
          setPlaying(
            Object.fromEntries(soundKinds.map((kind) => [kind, "stopped"])),
          );
        }}
        onUpdateControl={updateControl}
        onMute={toggleMuted}
      />
    );
  }
  const kinds: SoundKind[] = selected ? [selected] : soundKinds;
  return (
    <section className="lab-session" aria-label="Sound lab">
      <div className="session-sounds">
        {!selected && (
          <nav className="sound-index" aria-label="Sound collection">
            {soundKinds.map((kind) => (
              <Link
                href={`#${kind}`}
                aria-label={`Jump to ${soundInfo[kind].title}`}
                key={kind}
              >
                {soundInfo[kind].title}
              </Link>
            ))}
          </nav>
        )}
        {kinds.map((kind) => (
          <SoundCard
            key={kind}
            kind={kind}
            ready={ready}
            recipe={recipes[kind]}
            controls={controls[kind]}
            playing={playing[kind]}
            rawSource={rawSource}
            onPlay={play}
            onStop={stop}
            onUpdateControl={updateControl}
            onReset={resetControl}
            onSeed={setSeed}
            onApply={applyRecipe}
            workbench={!!selected}
            engine={engine}
          />
        ))}
      </div>
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
    </section>
  );
}
