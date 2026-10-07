"use client";

import { useEffect, useRef, useState } from "react";
import { createAudio } from "audiobits";
import type { AudioEngine, AudioState, Sound } from "audiobits";
import { confirmation } from "audiobits/recipes";

export function ConfirmationDemo() {
  const audio = useRef<AudioEngine | null>(null);
  const sound = useRef<Sound | null>(null);
  const [state, setState] = useState<AudioState>("idle");
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  useEffect(() => {
    const engine = createAudio();
    audio.current = engine;
    sound.current = engine.sound(confirmation);
    const unsubscribe = engine.subscribe(setState);
    return () => {
      unsubscribe();
      audio.current = null;
      sound.current = null;
      void engine.dispose().catch(() => {});
    };
  }, []);
  async function play() {
    const engine = audio.current;
    const definition = sound.current;
    if (!engine || !definition) return;
    setError("");
    try {
      await engine.start();
      if (audio.current === engine) definition.play();
    } catch (cause) {
      if (audio.current === engine)
        setError(
          cause instanceof Error ? cause.message : "Audio failed. Retry Play.",
        );
    }
  }
  return (
    <section aria-labelledby="confirmation-heading">
      <h2 id="confirmation-heading">Confirmation preview</h2>
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
        <button onClick={() => audio.current?.stopAll()}>Stop all</button>
      </div>
      <p role="status">Audio: {state}</p>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
