import { createLightsaberAudio } from "../../../catalog/experiences/lightsaber/host";
import { prepareAudioPlayback } from "./audio-gestures";

// Browser-only handoff between a navigation gesture and the destination effect.
// A failed or abandoned navigation must not retain a running audio context.
let pending:
  | { audio: ReturnType<typeof createLightsaberAudio>; detach(): void }
  | undefined;

export function prepareLightsaberNavigationAudio() {
  if (window.location.pathname === "/catalog/lightsaber") return;
  if (pending) return;
  const audio = createLightsaberAudio();
  const listeners = new AbortController();
  const discard = () => {
    if (pending !== entry) return;
    pending = undefined;
    entry.detach();
    void audio.dispose().catch(console.error);
  };
  // Bound the unclaimed handoff if route loading fails or never mounts a stage.
  const expiry = window.setTimeout(discard, 15_000);
  const entry = {
    audio,
    detach() {
      window.clearTimeout(expiry);
      listeners.abort();
    },
  };
  pending = entry;
  window.addEventListener("pagehide", discard, { signal: listeners.signal });
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) discard();
    },
    { signal: listeners.signal },
  );
  try {
    prepareAudioPlayback();
    // Keep this synchronous with the accepted link click. No sounds play here.
    // If this optional activation fails, the stage retains its normal retry path.
    void audio.start().catch(discard);
  } catch {
    discard();
  }
}

export function takeLightsaberNavigationAudio() {
  const entry = pending;
  pending = undefined;
  entry?.detach();
  return entry?.audio;
}
