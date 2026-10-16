import type { AudioEngine } from "audiobits";

/** Request playback audio for explicit sound interactions. */
export function prepareAudioPlayback() {
  const session = (navigator as Navigator & { audioSession?: { type: string } })
    .audioSession;
  if (session && session.type !== "playback") session.type = "playback";
}

/** Activate in native touch events without scheduling sound. */
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
  surface.addEventListener(
    "touchstart",
    (event) => {
      event.preventDefault();
      prepareAudioPlayback();
      if (
        ["idle", "starting", "suspended", "interrupted"].includes(audio.state)
      )
        void audio.start().catch(error);
    },
    { capture: true, passive: false, signal: listeners.signal },
  );
  surface.addEventListener(
    "touchend",
    () => {
      if (["starting", "suspended", "interrupted"].includes(audio.state))
        void audio.start().catch(error);
    },
    { capture: true, passive: true, signal: listeners.signal },
  );
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
