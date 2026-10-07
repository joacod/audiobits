"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createAudio } from "audiobits";
import type { AudioEngine, AudioState, Sound, Voice } from "audiobits";
import { confirmation, impact, thruster } from "audiobits/recipes";

export function ConfirmationDemo() {
  const audio = useRef<AudioEngine | null>(null);
  const sound = useRef<Sound | null>(null);
  const impactSound = useRef<Sound | null>(null);
  const thrusterSound = useRef<Sound | null>(null);
  const thrusterVoice = useRef<Voice | null>(null);
  const request = useRef(0);
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
    audio.current?.stopAll();
  }, [stopThruster]);
  useEffect(() => {
    const engine = createAudio();
    audio.current = engine;
    sound.current = engine.sound(confirmation);
    impactSound.current = engine.sound(impact);
    thrusterSound.current = engine.sound(thruster);
    const unsubscribe = engine.subscribe(setState);
    const hide = () => {
      if (document.hidden) stopAll();
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      unsubscribe();
      audio.current = null;
      sound.current = null;
      impactSound.current = null;
      thrusterSound.current = null;
      thrusterVoice.current = null;
      void engine.dispose().catch(() => {});
    };
  }, [stopAll]);
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
    if (!engine || !definition) return;
    if (kind === "thruster" && thrusterVoice.current?.state === "active")
      return;
    const token = request.current;
    if (kind === "thruster") setThrusterState("starting");
    setError("");
    try {
      await engine.start();
      if (audio.current !== engine || token !== request.current) return;
      if (kind === "thruster") {
        if (thrusterVoice.current?.state === "active") return;
        const voice = definition.play({
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
      } else
        definition.play(kind === "impact" ? { parameters: { intensity } } : {});
    } catch (cause) {
      if (audio.current === engine && token === request.current) {
        if (kind === "thruster") setThrusterState("stopped");
        setError(
          cause instanceof Error ? cause.message : "Audio failed. Retry Play.",
        );
      }
    }
  }
  return (
    <section aria-labelledby="confirmation-heading">
      <h2 id="confirmation-heading">Three-sound development preview</h2>
      <p>Two soft sine layers with a gentle upward movement.</p>
      <div className="audio-controls">
        <button onClick={() => void play()}>Play confirmation</button>
        <button
          aria-pressed={muted}
          onClick={() => {
            const next = !muted;
            audio.current?.setMuted(next);
            setMuted(next);
          }}
        >
          Mute
        </button>
        <button onClick={stopAll}>Stop all</button>
      </div>
      <h3>Impact</h3>
      <p>
        A descending body and filtered noise transient. Intensity changes pitch,
        brightness, and level.
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
      <button onClick={() => void play("impact")}>Play impact</button>
      <h3>Thruster</h3>
      <p>Start once, adjust throttle while it runs, then release with Stop.</p>
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
        <button
          disabled={thrusterState !== "stopped"}
          onClick={() => void play("thruster")}
        >
          Start thruster
        </button>
        <button onClick={stopThruster}>Stop thruster</button>
      </div>
      <p data-testid="thruster-state">Thruster: {thrusterState}</p>
      <p role="status">Audio: {state}</p>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
