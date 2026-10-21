import { createAudio, type AudioEngine } from "audiobits";
import {
  createRift,
  type RiftDisturbance,
  type RiftPhase,
  type RiftShape,
} from "./controller";

export function createRiftAudio() {
  return createAudio({
    maxVoices: 16,
    maxVoicesPerSound: 4,
    masterGainDb: -10,
  });
}

/** The browser host owns one bounded engine; the controller owns its voices. */
export function mountRift(
  feedback: {
    phase(value: RiftPhase): void;
    starting(value: boolean): void;
    error(cause: unknown): void;
    disturbance?(value: RiftDisturbance): void;
  },
  // Passing an activated engine transfers ownership, including disposal.
  audio: AudioEngine = createRiftAudio(),
) {
  const control = createRift(audio, {
    phase: feedback.phase,
    disturbance: (value) => feedback.disturbance?.(value),
  });
  const listeners = new AbortController();
  let disposed = false;
  let generation = 0;
  let pending: { settle: boolean } | undefined;
  const fail = (cause: unknown) => {
    if (!disposed) feedback.error(cause);
  };
  function clearPending() {
    if (!pending) return;
    pending = undefined;
    feedback.starting(false);
  }
  function stop() {
    if (disposed) return;
    generation++;
    clearPending();
    control.stop();
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
    (event) => {
      if (event.persisted) {
        stop();
        void audio.suspend().catch(fail);
      } else {
        void dispose().catch(fail);
      }
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
  /** Call synchronously inside the opening gesture. */
  function open(shape: Partial<RiftShape>) {
    if (disposed || document.hidden || pending || control.phase !== "idle")
      return;
    control.update(shape);
    const token = ++generation;
    const intent = { settle: false };
    pending = intent;
    feedback.starting(true);
    void audio
      .start()
      .then(() => {
        if (disposed || document.hidden || token !== generation) return;
        control.open();
        // Publish the opening before clearing activation so a released drag
        // keeps its geometry instead of appearing idle during the handoff.
        clearPending();
        if (intent.settle) control.settle();
      })
      .catch((cause: unknown) => {
        if (disposed || token !== generation) return;
        stop();
        fail(cause);
      });
  }
  /** A valid opening gesture ended: keep the fracture open. */
  function settle() {
    if (pending) pending.settle = true;
    else control.settle();
  }
  /** An abandoned opening heals; an activation still pending is dropped. */
  function cancel() {
    if (pending) {
      generation++;
      clearPending();
      return;
    }
    control.cancel();
  }
  return {
    audio,
    control,
    /** True while an opening gesture waits for audio activation. */
    get starting() {
      return pending !== undefined;
    },
    open,
    settle,
    cancel,
    update: control.update,
    collapse: () => control.collapse(),
    stop,
    dispose,
  };
}
