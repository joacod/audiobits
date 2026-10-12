# Integration and ownership

Read the consumer's installed metadata and declarations before using these
schema-1 examples. Human-readable [API](https://www.audiobits.dev/docs/api)
and [lifecycle](https://www.audiobits.dev/docs/lifecycle) guides are secondary
to that contract. Keep engine creation in the host's client lifecycle; imports
and recipe data can remain safe for server rendering. Do not start audio during
render, module load, an effect, or a timer.

A small local confirmation sound needs no catalog dependency:

```ts
import { defineSound } from "audiobits";

export const confirmation = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.12,
  layers: [
    {
      id: "chime",
      source: { type: "oscillator", waveform: "sine", frequency: 880 },
      gainDb: -18,
      envelope: { attack: 0.005, decay: 0.03, sustain: 0.35, release: 0.08 },
    },
  ],
});
```

The following factory owns one engine and all its sounds. Adapt its methods to
the application's buttons and teardown hook; call `play` directly in the gesture.
Pass a visible status/error handler rather than silently swallowing failures.

```ts
import { createAudio, type Recipe } from "audiobits";

export function createSoundHost(
  recipe: Recipe,
  reportError: (cause: unknown) => void,
) {
  const audio = createAudio();
  const sound = audio.sound(recipe);
  const listeners = new AbortController();
  let generation = 0;
  let disposed = false;
  function stop() {
    generation++;
    audio.stopAll({ tails: "cut" });
  }
  async function play() {
    if (disposed || document.hidden) return;
    const token = ++generation;
    try {
      await audio.start();
      if (disposed || document.hidden || token !== generation) return;
      return sound.play();
    } catch (cause) {
      if (!disposed && token === generation) reportError(cause);
    }
  }
  async function dispose() {
    if (disposed) return;
    disposed = true;
    stop();
    listeners.abort();
    await audio.dispose();
  }
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden && !disposed) {
        stop();
        void audio.suspend().catch(reportError);
      }
    },
    { signal: listeners.signal },
  );
  window.addEventListener(
    "pagehide",
    () => {
      void dispose().catch(reportError);
    },
    { signal: listeners.signal },
  );
  return { play, stop, dispose };
}
```

Wire Stop even for finite sounds. `voice.stop()` follows the recipe release;
`audio.stopAll({ tails: "cut" })` uses the runtime's short fade. On SPA removal,
call and handle `host.dispose()`; page events alone do not cover route changes.
If the application already owns a shared engine, reuse it and dispose only this
integration's sounds/voices. The owner suspends and disposes the shared engine.
Avoid cutting other components' voices with a shared `stopAll`.

Keep guarded live engine objects in stable refs or accessors instead of ordinary
React state/props that tooling might enumerate. Adapt to existing conventions
without adding a framework adapter. Define a local recipe or install copy-owned
catalog source separately; the npm package supplies the engine and recipe language.
