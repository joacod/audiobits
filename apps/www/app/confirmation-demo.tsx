"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@base-ui/react/button";
import { OutputScope } from "./output-scope";
import { RecipeTools } from "./recipe-tools";
import {
  soundInfo,
  soundKinds,
  sounds,
  parametersFor,
  parameterLabel,
  parameterEndpoints,
} from "../lib/gallery";
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

export function ConfirmationDemo({
  rawSource,
  selected,
}: {
  rawSource: string;
  selected?: SoundKind;
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
  const [delay, setDelay] = useState(false);
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
      <h2 id="gallery-heading" className={selected ? "sr-only" : undefined}>
        Procedural sound gallery
      </h2>
      <p>
        Browse silently. Play a sound, adjust it, then copy your configuration.
      </p>
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
          <Button
            aria-pressed={delay}
            onClick={() => {
              const engine = audio.current;
              if (!engine || document.hidden) return;
              const token = request.current;
              void engine
                .start()
                .then(() => {
                  if (
                    audio.current !== engine ||
                    token !== request.current ||
                    document.hidden
                  )
                    return;
                  if (!route.current) {
                    route.current = engine.bus("effects");
                    route.current.setGainDb(volumeValue.current, 0.1);
                  }
                  const next = !delay;
                  route.current.setDelay(
                    next ? { seconds: 0.18, feedback: 0.35, wet: 0.25 } : null,
                  );
                  setDelay(next);
                })
                .catch((cause: unknown) => {
                  if (audio.current === engine && token === request.current)
                    setError(
                      cause instanceof Error ? cause.message : "Delay failed.",
                    );
                });
            }}
          >
            Shared delay
          </Button>
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
      {(selected ? [selected] : soundKinds).map((kind) => {
        const recipe = recipes[kind];
        const info = soundInfo[kind];
        const sustained = recipe.kind === "sustained";
        const status = playing[kind] ?? (sustained ? "stopped" : "ready");
        return (
          <article className="sound-card" id={kind} key={kind}>
            <div className="sound-preview">
              <h3>
                <Link href={`/sounds/${kind}`}>{info.title}</Link>
              </h3>
              <p className="sound-use">{info.use}</p>
              <p>{info.description}</p>
              {Object.entries(recipe.parameters ?? {}).map(
                ([name, parameter]) => (
                  <label key={name}>
                    {parameterLabel(kind, name)}:{" "}
                    {controls[kind][name]?.toFixed(2)}
                    <input
                      aria-label={parameterLabel(kind, name)}
                      type="range"
                      min={parameter.min}
                      max={parameter.max}
                      step={(parameter.max - parameter.min) / 100}
                      value={controls[kind][name] ?? parameter.default}
                      onChange={(event) =>
                        updateControl(kind, name, Number(event.target.value))
                      }
                    />
                    {parameterEndpoints(kind, name) && (
                      <span className="morph-endpoints" aria-hidden="true">
                        {parameterEndpoints(kind, name)?.map((endpoint) => (
                          <span key={endpoint}>{endpoint}</span>
                        ))}
                      </span>
                    )}
                    <span className="control-mode">
                      {parameter.mode === "live"
                        ? "Changes this voice while it plays"
                        : "Applies on the next Play"}
                    </span>
                  </label>
                ),
              )}
              <div className="audio-controls">
                <Button
                  className="play-action"
                  disabled={
                    sustained && (status === "starting" || status === "running")
                  }
                  onClick={() => void play(kind)}
                >
                  {sustained ? "Start" : "Play"} {kind}
                </Button>
                {sustained && (
                  <Button onClick={() => stop(kind)}>Stop {kind}</Button>
                )}
              </div>
              <p data-testid={`${kind}-state`} aria-live="polite">
                {info.title}: {status}
              </p>
            </div>
            <RecipeTools
              kind={kind}
              controls={controls[kind]}
              rawSource={rawSource}
              onReset={resetControl}
              onSeed={setSeed}
              onApply={applyRecipe}
            />
          </article>
        );
      })}
    </section>
  );
}
