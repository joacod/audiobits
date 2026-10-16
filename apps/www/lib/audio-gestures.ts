import { AudioBitsError, type AudioEngine, type AudioState } from "audiobits";

/** Request playback audio for explicit sound interactions. */
export function prepareAudioPlayback() {
  const session = (navigator as Navigator & { audioSession?: { type: string } })
    .audioSession;
  if (session && session.type !== "playback") session.type = "playback";
}

/** Activate native touch starts and retry pending holds without scheduling sound. */
export function bindAudioGestures(
  surface: HTMLElement,
  audio: AudioEngine,
  stop: () => void,
  error: (cause: unknown) => void,
  recovered?: () => void,
) {
  const listeners = new AbortController();
  for (const type of ["contextmenu", "dragstart"] as const) {
    surface.addEventListener(type, (event) => event.preventDefault(), {
      signal: listeners.signal,
    });
  }
  surface.addEventListener("pointerdown", prepareAudioPlayback, {
    capture: true,
    signal: listeners.signal,
  });
  surface.addEventListener("keydown", prepareAudioPlayback, {
    capture: true,
    signal: listeners.signal,
  });
  const activate = (states: readonly AudioState[]) => {
    if (!states.includes(audio.state)) return;
    // A pending host startup owns its own error handling; calling start()
    // still synchronously retries that native activation.
    if (audio.state === "starting") {
      void audio.start();
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
      event.preventDefault();
      prepareAudioPlayback();
      activate(["idle", "starting", "suspended", "interrupted"]);
    },
    { capture: true, passive: false, signal: listeners.signal },
  );
  // Touch release alone leaves an idle engine idle, but a pending or resumable
  // hold may supply the activation its press lacked.
  surface.addEventListener(
    "touchend",
    () => {
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
