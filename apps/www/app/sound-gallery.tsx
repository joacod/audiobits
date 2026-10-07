"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@base-ui/react/button";
import { SoundCard } from "./sound-card";
import { OutputScope } from "./output-scope";
import { soundInfo, soundKinds, sounds, parametersFor } from "../lib/gallery";
import type { SoundKind } from "../lib/gallery";
import { createAudio } from "audiobits";
import type {
  AudioEngine,
  AudioState,
  Bus,
  Sound,
  Voice,
  Recipe,
} from "audiobits";

const defaults = () =>
  Object.fromEntries(
    soundKinds.map((kind) => [kind, parametersFor(sounds[kind])]),
  ) as Record<SoundKind, Record<string, number>>;

export function SoundGallery({
  rawSource,
  selected,
  home = false,
}: {
  rawSource: string;
  selected?: SoundKind;
  home?: boolean;
}) {
  const definitions = useRef<Partial<Record<SoundKind, Sound>>>({});
  const voices = useRef<Partial<Record<SoundKind, Voice>>>({});
  const seeds = useRef<Partial<Record<SoundKind, number | null>>>(
    Object.fromEntries(soundKinds.map((kind) => [kind, 42])),
  );
  const audio = useRef<AudioEngine | null>(null);
  const request = useRef(0);
  const soundRequests = useRef<Partial<Record<SoundKind, number>>>({});
  const route = useRef<Bus | null>(null);
  const [recipes, setRecipes] = useState(sounds);
  const [controls, setControls] = useState(defaults);
  const controlValues = useRef(controls);
  const [playing, setPlaying] = useState<Partial<Record<SoundKind, string>>>(
    {},
  );
  const [volume, setVolume] = useState(0);
  const volumeValue = useRef(0);
  const [started, setStarted] = useState<AudioEngine | null>(null);
  const [state, setState] = useState<AudioState>("idle");
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);

  const stopAll = useCallback(() => {
    request.current++;
    audio.current?.stopAll({ tails: "cut" });
    voices.current = {};
    setPlaying({});
  }, []);
  useEffect(() => {
    const requests = request;
    const engine = createAudio();
    audio.current = engine;
    definitions.current = Object.fromEntries(
      soundKinds.map((kind) => [kind, engine.sound(sounds[kind])]),
    );
    const unsubscribe = engine.subscribe(setState);
    const hide = () => {
      if (document.hidden) {
        stopAll();
        void engine.suspend().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      requests.current++;
      unsubscribe();
      route.current = null;
      audio.current = null;
      definitions.current = {};
      voices.current = {};
      void engine.dispose().catch(() => {});
    };
  }, [stopAll]);
  const resetControl = useCallback((kind: SoundKind) => {
    const next = parametersFor(sounds[kind]);
    controlValues.current = { ...controlValues.current, [kind]: next };
    setControls(controlValues.current);
  }, []);
  const applyRecipe = useCallback(
    (kind: SoundKind, recipe: Recipe) => {
      stopAll();
      setError("");
      const next = audio.current?.sound(recipe);
      definitions.current[kind]?.dispose();
      definitions.current[kind] = next;
      setRecipes((value) => ({ ...value, [kind]: recipe }));
      controlValues.current = {
        ...controlValues.current,
        [kind]: parametersFor(recipe),
      };
      setControls(controlValues.current);
    },
    [stopAll],
  );
  const setSeed = useCallback((kind: SoundKind, seed: number | null) => {
    seeds.current[kind] = seed;
  }, []);

  function updateControl(kind: SoundKind, name: string, value: number) {
    const next = { ...controlValues.current[kind], [name]: value };
    controlValues.current = { ...controlValues.current, [kind]: next };
    setControls(controlValues.current);
    try {
      if (
        recipes[kind].parameters?.[name].mode === "live" &&
        voices.current[kind]?.state === "active"
      )
        voices.current[kind]?.set({ [name]: value });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Control update failed.",
      );
    }
  }
  function stop(kind: SoundKind) {
    soundRequests.current[kind] = (soundRequests.current[kind] ?? 0) + 1;
    voices.current[kind]?.stop();
    delete voices.current[kind];
    setPlaying((value) => ({ ...value, [kind]: "stopped" }));
  }
  async function play(kind: SoundKind) {
    const engine = audio.current;
    const definition = definitions.current[kind];
    if (!engine || !definition || document.hidden) return;
    const seed = seeds.current[kind];
    if (seed == null) {
      setError("Enter a valid seed before Play.");
      return;
    }
    const sustained = definition.recipe.kind === "sustained";
    if (sustained && voices.current[kind]?.state === "active") return;
    const token = request.current;
    const soundToken = soundRequests.current[kind] ?? 0;
    setError("");
    setPlaying((value) => ({ ...value, [kind]: "starting" }));
    try {
      await engine.start();
      if (
        audio.current !== engine ||
        token !== request.current ||
        (soundRequests.current[kind] ?? 0) !== soundToken ||
        document.hidden
      )
        return;
      if (sustained && voices.current[kind]?.state === "active") return;
      if (!route.current) {
        route.current = engine.bus("effects");
        route.current.setGainDb(volumeValue.current, 0.1);
      }
      setStarted(engine);
      const voice = definition.play({
        seed,
        bus: route.current,
        parameters: controlValues.current[kind],
      });
      voices.current[kind] = voice;
      setPlaying((value) => ({
        ...value,
        [kind]: sustained ? "running" : "playing",
      }));
      void voice.ended.then(() => {
        if (audio.current === engine && voices.current[kind] === voice) {
          delete voices.current[kind];
          setPlaying((value) => ({
            ...value,
            [kind]: sustained ? "stopped" : "ready",
          }));
        }
      });
    } catch (cause) {
      if (audio.current === engine && token === request.current) {
        setPlaying((value) => ({
          ...value,
          [kind]: sustained ? "stopped" : "retry Play",
        }));
        setError(
          `${cause instanceof Error ? cause.message : "Audio failed."} Retry Play.`,
        );
      }
    }
  }
  return (
    <section aria-labelledby="gallery-heading">
      <h2 id="gallery-heading" className="sr-only">
        Procedural sound gallery
      </h2>
      <div className="gallery-mixer">
        <div className="audio-controls">
          <Button
            aria-pressed={muted}
            onClick={() => {
              const next = !muted;
              audio.current?.setMuted(next);
              setMuted(next);
            }}
          >
            Mute
          </Button>
          <Button onClick={stopAll}>Stop all</Button>
        </div>
        <label>
          Effects volume: {volume} dB
          <input
            aria-label="Effects volume"
            type="range"
            min="-60"
            max="0"
            step="1"
            value={volume}
            onChange={(event) => {
              const value = Number(event.target.value);
              volumeValue.current = value;
              setVolume(value);
              try {
                route.current?.setGainDb(value, 0.1);
              } catch (cause) {
                setError(
                  cause instanceof Error ? cause.message : "Volume failed.",
                );
              }
            }}
          />
        </label>
        <p role="status">Audio: {state}</p>
        {error && <p role="alert">{error}</p>}
      </div>
      <OutputScope
        engine={started}
        active={Object.values(playing).some(
          (value) => value === "running" || value === "playing",
        )}
      />
      {home && (
        <SoundCard
          kind="impact"
          recipe={recipes["impact"]}
          controls={controls["impact"]}
          playing={playing["impact"]}
          rawSource={rawSource}
          onPlay={play}
          onStop={stop}
          onUpdateControl={updateControl}
          onReset={resetControl}
          onSeed={setSeed}
          onApply={applyRecipe}
          featured
        />
      )}
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
      {!selected && (
        <div id="collection" className="collection-title">
          <h2>
            {home ? "A character for every interaction." : "Find your sound."}
          </h2>
          <p>Play. Change. Repeat.</p>
        </div>
      )}
      {(selected
        ? [selected]
        : soundKinds.filter((kind) => !home || kind !== "impact")
      ).map((kind) => (
        <SoundCard
          key={kind}
          kind={kind}
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
        />
      ))}
    </section>
  );
}
