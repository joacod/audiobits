import type { AudioEngine } from "audiobits";

/** Request playback audio for explicit sound interactions. */
export function prepareAudioPlayback() {
  const session = (navigator as Navigator & { audioSession?: { type: string } })
    .audioSession;
  if (session && session.type !== "playback") session.type = "playback";
}

/** Retry pending activation in native touch events without scheduling sound. */
export function bindAudioGestures(
  surface: HTMLElement,
  audio: AudioEngine,
  stop: () => void,
  error: (cause: unknown) => void,
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
  for (const type of ["touchstart", "touchend"] as const) {
    surface.addEventListener(
      type,
      () => {
        if (["starting", "suspended", "interrupted"].includes(audio.state))
          void audio.start().catch(error);
      },
      { passive: true, signal: listeners.signal },
    );
  }
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
