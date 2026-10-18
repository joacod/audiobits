import { AudioBitsError, type AudioEngine, type AudioState } from "audiobits";
import { observeAudioActivation } from "./audio-activation-report";

/** Request playback audio for explicit sound interactions. */
export function prepareAudioPlayback() {
  const session = (navigator as Navigator & { audioSession?: { type: string } })
    .audioSession;
  if (session && session.type !== "playback") session.type = "playback";
}

/** Activate in native gestures without owning sound intent. */
export function bindAudioGestures(
  surface: HTMLElement,
  audio: AudioEngine,
  stop: () => void,
  error: (cause: unknown) => void,
  recovered?: () => void,
) {
  const listeners = new AbortController();
  const record = observeAudioActivation(surface, audio, listeners.signal);
  const prepare = () => {
    try {
      prepareAudioPlayback();
    } catch (cause) {
      error(cause);
    }
  };
  for (const type of ["contextmenu", "dragstart"] as const) {
    surface.addEventListener(type, (event) => event.preventDefault(), {
      signal: listeners.signal,
    });
  }
  surface.addEventListener(
    "pointerdown",
    (event) => {
      record(event);
      prepare();
    },
    {
      capture: true,
      signal: listeners.signal,
    },
  );
  surface.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Enter" || event.key === " " || event.key === "Escape")
        record(event);
      prepare();
    },
    {
      capture: true,
      signal: listeners.signal,
    },
  );
  const activate = (states: readonly AudioState[], hostOwnsStart = false) => {
    if (!states.includes(audio.state)) return;
    // A pending host startup owns its own error handling; calling start()
    // still synchronously retries that native activation.
    if (hostOwnsStart || audio.state === "starting") {
      // The host joins the engine's pending start in this same event and
      // reports failure only while its interaction is still current.
      void audio.start().catch(() => {});
      return;
    }
    // Ignore cancelled gestures, torn-down listeners and disposed engines;
    // report genuine activation failures.
    void audio.start().catch((cause: unknown) => {
      if (
        listeners.signal.aborted ||
        audio.state === "disposed" ||
        (cause instanceof AudioBitsError && cause.code === "start-cancelled")
      )
        return;
      error(cause);
    });
  };
  surface.addEventListener(
    "touchstart",
    (event) => {
      record(event);
      prepare();
      // Activate here even before the host establishes its hold. All surfaces
      // use the native capture listener, including React-managed controls.
      // The host still owns playback and invalidates it on release/cancel.
      activate(["idle", "starting", "suspended", "interrupted"], true);
    },
    // Keep touch dispatch synchronous without cancelling native touch defaults.
    { capture: true, passive: false, signal: listeners.signal },
  );
  // Touch release alone leaves an idle engine idle, but a pending or resumable
  // hold may supply the activation its press lacked.
  surface.addEventListener(
    "touchend",
    (event) => {
      record(event);
      activate(["starting", "suspended", "interrupted"]);
    },
    { capture: true, passive: true, signal: listeners.signal },
  );
  // An OS interruption can end voices without a pointer release or page hide.
  let previous = audio.state;
  const unsubscribe = audio.subscribe((state) => {
    const wasRunning = previous === "running";
    previous = state;
    if (state === "running") recovered?.();
    if (wasRunning && (state === "interrupted" || state === "suspended"))
      stop();
  });
  return () => {
    listeners.abort();
    unsubscribe();
  };
}
