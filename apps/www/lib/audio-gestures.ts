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
  gesture: "hold" | "tap" = "hold",
) {
  const listeners = new AbortController();
  let awaitingRelease = false;
  const needsRelease = () =>
    gesture === "hold" &&
    navigator.userActivation?.isActive === false &&
    audio.state !== "running";
  function waitForRelease() {
    awaitingRelease = true;
    surface.dataset.audioActivation = "release";
  }
  for (const type of ["contextmenu", "dragstart"] as const) {
    surface.addEventListener(type, (event) => event.preventDefault(), {
      signal: listeners.signal,
    });
  }
  surface.addEventListener(
    "pointerdown",
    (event) => {
      prepareAudioPlayback();
      if (
        event.isPrimary &&
        event.button === 0 &&
        event.pointerType === "touch" &&
        needsRelease()
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        waitForRelease();
      }
    },
    { capture: true, signal: listeners.signal },
  );
  surface.addEventListener("keydown", prepareAudioPlayback, {
    capture: true,
    signal: listeners.signal,
  });
  surface.addEventListener(
    "touchstart",
    (event) => {
      event.preventDefault();
      prepareAudioPlayback();
      if (needsRelease()) {
        waitForRelease();
        return;
      }
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
      const activate = awaitingRelease;
      awaitingRelease = false;
      delete surface.dataset.audioActivation;
      if (
        activate ||
        ["starting", "suspended", "interrupted"].includes(audio.state)
      )
        void audio.start().catch(error);
    },
    { capture: true, passive: true, signal: listeners.signal },
  );
  surface.addEventListener(
    "touchcancel",
    () => {
      awaitingRelease = false;
      delete surface.dataset.audioActivation;
    },
    { passive: true, signal: listeners.signal },
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
    delete surface.dataset.audioActivation;
    listeners.abort();
    unsubscribe();
  };
}
