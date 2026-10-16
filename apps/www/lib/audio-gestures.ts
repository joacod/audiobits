import type { AudioEngine } from "audiobits";

/** Request playback audio for explicit sound interactions. */
export function prepareAudioPlayback() {
  const session = (navigator as Navigator & { audioSession?: { type: string } })
    .audioSession;
  if (session && session.type !== "playback") session.type = "playback";
}

/** Retry host-owned activation in native touch events without scheduling sound. */
export function bindAudioGestures(
  surface: HTMLElement,
  audio: AudioEngine,
  stop: () => void,
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
  const retryActivation = () => {
    // The host owns this pending promise, including errors and cancellation.
    // Never start an idle engine or independently report a cancelled gesture.
    if (audio.state === "starting") void audio.start();
  };
  surface.addEventListener(
    "touchstart",
    (event) => {
      event.preventDefault();
      prepareAudioPlayback();
      retryActivation();
    },
    { capture: true, passive: false, signal: listeners.signal },
  );
  surface.addEventListener("touchend", retryActivation, {
    capture: true,
    passive: true,
    signal: listeners.signal,
  });
  // An OS interruption can end voices without a pointer release or page hide.
  let previous = audio.state;
  const unsubscribe = audio.subscribe((state) => {
    const wasRunning = previous === "running";
    previous = state;
    if (wasRunning && (state === "interrupted" || state === "suspended"))
      stop();
  });
  return () => {
    listeners.abort();
    unsubscribe();
  };
}
