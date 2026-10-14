import { createAudio } from "audiobits";
import { createLightsaber, type BladeState } from "./controller";

/** The browser host owns one bounded engine; the controller owns its voices. */
export function mountLightsaber(feedback: {
  state(value: BladeState): void;
  error(cause: unknown): void;
  impact?(force: number): void;
}) {
  const audio = createAudio({
    maxVoices: 8,
    maxVoicesPerSound: 3,
    masterGainDb: -6,
  });
  let state: BladeState = "stopped";
  let generation = 0;
  const control = createLightsaber(audio, {
    state(value) {
      state = value;
      feedback.state(value);
    },
  });
  const listeners = new AbortController();
  let disposed = false;
  const fail = (cause: unknown) => {
    if (!disposed) feedback.error(cause);
  };
  function stop() {
    if (disposed) return;
    generation++;
    control.stop();
    audio.stopAll({ tails: "cut" });
  }
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden && !disposed) {
        stop();
        void audio.suspend().catch(fail);
      }
    },
    { signal: listeners.signal },
  );
  window.addEventListener("blur", stop, { signal: listeners.signal });
  window.addEventListener(
    "pagehide",
    () => {
      void dispose().catch(fail);
    },
    { signal: listeners.signal },
  );
  async function dispose() {
    if (disposed) return;
    stop();
    disposed = true;
    listeners.abort();
    control.dispose();
    await audio.dispose();
  }
  function ignite() {
    if (disposed || document.hidden || state !== "stopped") return;
    const token = ++generation;
    state = "starting";
    feedback.state(state);
    void audio
      .start()
      .then(() => {
        if (disposed || document.hidden || token !== generation) return;
        control.ignite();
      })
      .catch((cause: unknown) => {
        if (disposed || token !== generation) return;
        stop();
        fail(cause);
      });
  }
  function retract() {
    if (disposed) return;
    generation++;
    control.retract();
  }
  function clash(force: number, pan = 0) {
    if (!control.clash(force, pan)) return false;
    feedback.impact?.(Math.max(0, Math.min(1, force)));
    return true;
  }
  return {
    audio,
    control: {
      update: control.update,
      get state() {
        return state;
      },
      get motion() {
        return control.motion;
      },
    },
    ignite,
    retract,
    clash,
    stop,
    mute(value: boolean) {
      if (!disposed) audio.setMuted(value);
    },
    dispose,
  };
}
