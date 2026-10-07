"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@base-ui/react/button";
import { RecipeTools } from "./recipe-tools";
import { soundInfo } from "../lib/gallery";
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
import { confirmation, impact, thruster } from "audiobits/recipes";

export function ConfirmationDemo({
  rawSource,
  selected,
}: {
  rawSource: string;
  selected?: SoundKind;
}) {
  const lastFinite = useRef<Partial<Record<SoundKind, Voice>>>({});
  const seeds = useRef<Record<SoundKind, number | null>>({
    confirmation: 42,
    impact: 42,
    thruster: 42,
  });
  const [playing, setPlaying] = useState<Record<string, string>>({});
  const audio = useRef<AudioEngine | null>(null);
  const sound = useRef<Sound | null>(null);
  const impactSound = useRef<Sound | null>(null);
  const thrusterSound = useRef<Sound | null>(null);
  const thrusterVoice = useRef<Voice | null>(null);
  const request = useRef(0);
  const route = useRef<Bus | null>(null);
  const [delay, setDelay] = useState(false);
  const [volume, setVolume] = useState(0);
  const volumeValue = useRef(0);
  const throttleValue = useRef(0.2);
  const [intensity, setIntensity] = useState(0.5);
  const [throttle, setThrottle] = useState(0.2);
  const [thrusterState, setThrusterState] = useState("stopped");
  const [state, setState] = useState<AudioState>("idle");
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const stopThruster = useCallback(() => {
    request.current++;
    thrusterVoice.current?.stop();
    thrusterVoice.current = null;
    setThrusterState("stopped");
  }, []);
  const stopAll = useCallback(() => {
    stopThruster();
    audio.current?.stopAll({ tails: "cut" });
    setPlaying({});
  }, [stopThruster]);
  useEffect(() => {
    const requests = request;
    const engine = createAudio();
    audio.current = engine;
    sound.current = engine.sound(confirmation);
    impactSound.current = engine.sound(impact);
    thrusterSound.current = engine.sound(thruster);
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
      sound.current = null;
      impactSound.current = null;
      thrusterSound.current = null;
      thrusterVoice.current = null;
      void engine.dispose().catch(() => {});
    };
  }, [stopAll]);
  const applyRecipe = useCallback(
    (kind: SoundKind, recipe: Recipe) => {
      stopAll();
      setError("");
      const target =
        kind === "confirmation"
          ? sound
          : kind === "impact"
            ? impactSound
            : thrusterSound;
      const next = audio.current?.sound(recipe);
      target.current?.dispose();
      target.current = next ?? null;
    },
    [stopAll],
  );
  const setSeed = useCallback((kind: SoundKind, seed: number | null) => {
    seeds.current[kind] = seed;
  }, []);
  const resetControl = useCallback((kind: SoundKind) => {
    if (kind === "impact") setIntensity(0.5);
    if (kind === "thruster") {
      throttleValue.current = 0.2;
      setThrottle(0.2);
    }
  }, []);
  async function play(
    kind: "confirmation" | "impact" | "thruster" = "confirmation",
  ) {
    const engine = audio.current;
    const definition =
      kind === "confirmation"
        ? sound.current
        : kind === "impact"
          ? impactSound.current
          : thrusterSound.current;
    if (!engine || !definition || document.hidden) return;
    const seed = seeds.current[kind];
    if (seed === null) {
      setError("Enter a valid seed before Play.");
      return;
    }
    if (kind === "thruster" && thrusterVoice.current?.state === "active")
      return;
    const token = request.current;
    if (kind === "thruster") setThrusterState("starting");
    setError("");
    setPlaying((value) => ({ ...value, [kind]: "starting" }));
    try {
      await engine.start();
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
      if (kind === "thruster") {
        if (thrusterVoice.current?.state === "active") return;
        const voice = definition.play({
          seed,
          bus: route.current,
          parameters: { throttle: throttleValue.current },
        });
        thrusterVoice.current = voice;
        setThrusterState("running");
        void voice.ended.then(() => {
          if (thrusterVoice.current === voice) {
            thrusterVoice.current = null;
            setThrusterState("stopped");
          }
        });
      } else {
        const voice = definition.play({
          seed,
          bus: route.current,
          ...(kind === "impact" ? { parameters: { intensity } } : {}),
        });
        lastFinite.current[kind] = voice;
        setPlaying((value) => ({ ...value, [kind]: "playing" }));
        void voice.ended.then(() => {
          if (
            audio.current === engine &&
            lastFinite.current[kind] === voice &&
            token === request.current
          )
            setPlaying((value) => ({ ...value, [kind]: "ready" }));
        });
      }
    } catch (cause) {
      if (audio.current === engine && token === request.current) {
        if (kind === "thruster") setThrusterState("stopped");
        setPlaying((value) => ({ ...value, [kind]: "retry Play" }));
        setError(
          `${cause instanceof Error ? cause.message : "Audio failed."} Retry Play.`,
        );
      }
    }
  }
  return (
    <section aria-labelledby="confirmation-heading">
      <h2 id="confirmation-heading">Three-sound development preview</h2>
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
      {(!selected || selected === "confirmation") && (
        <article className="sound-card" id="confirmation">
          <div className="sound-preview">
            <h3>
              <Link href="/sounds/confirmation">Confirmation</Link>
            </h3>
            <p className="sound-use">{soundInfo.confirmation.use}</p>
            <p>{soundInfo.confirmation.description}</p>
            <Button className="play-action" onClick={() => void play()}>
              Play confirmation
            </Button>
            <p aria-live="polite">
              Confirmation: {playing.confirmation ?? "ready"}
            </p>
          </div>
          <RecipeTools
            kind="confirmation"
            onReset={resetControl}
            control={0}
            rawSource={rawSource}
            onSeed={setSeed}
            onApply={applyRecipe}
          />
        </article>
      )}
      {(!selected || selected === "impact") && (
        <article className="sound-card" id="impact">
          <div className="sound-preview">
            <h3>
              <Link href="/sounds/impact">Impact</Link>
            </h3>
            <p className="sound-use">{soundInfo.impact.use}</p>
            <p>
              A descending body and filtered noise transient. Intensity changes
              pitch, brightness, and level.
            </p>
            <label>
              Intensity: {intensity.toFixed(2)}
              <input
                aria-label="Intensity"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={intensity}
                onChange={(event) => setIntensity(Number(event.target.value))}
              />
            </label>
            <Button className="play-action" onClick={() => void play("impact")}>
              Play impact
            </Button>
            <p aria-live="polite">Impact: {playing.impact ?? "ready"}</p>
          </div>
          <RecipeTools
            kind="impact"
            onReset={resetControl}
            control={intensity}
            rawSource={rawSource}
            onSeed={setSeed}
            onApply={applyRecipe}
          />
        </article>
      )}
      {(!selected || selected === "thruster") && (
        <article className="sound-card" id="thruster">
          <div className="sound-preview">
            <h3>
              <Link href="/sounds/thruster">Thruster</Link>
            </h3>
            <p className="sound-use">{soundInfo.thruster.use}</p>
            <p>
              Start once, adjust throttle while it runs, then release with Stop.
            </p>
            <label>
              Throttle: {throttle.toFixed(2)}
              <input
                aria-label="Throttle"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={throttle}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  throttleValue.current = value;
                  setThrottle(value);
                  try {
                    if (thrusterVoice.current?.state === "active")
                      thrusterVoice.current.set({ throttle: value });
                  } catch (cause) {
                    setError(
                      cause instanceof Error
                        ? cause.message
                        : "Control update failed.",
                    );
                  }
                }}
              />
            </label>
            <div className="audio-controls">
              <Button
                className="play-action"
                disabled={thrusterState !== "stopped"}
                onClick={() => void play("thruster")}
              >
                Start thruster
              </Button>
              <Button onClick={stopThruster}>Stop thruster</Button>
            </div>
            <p data-testid="thruster-state">Thruster: {thrusterState}</p>
          </div>
          <RecipeTools
            kind="thruster"
            onReset={resetControl}
            control={throttle}
            rawSource={rawSource}
            onSeed={setSeed}
            onApply={applyRecipe}
          />
        </article>
      )}
    </section>
  );
}
