import type { AudioEngine } from "audiobits";
import { createLightsaberAudio } from "../../../catalog/experiences/lightsaber/host";
import { createThrusterAudio } from "../../../catalog/experiences/reactive-thruster/host";
import { createEnergyChargeAudio } from "../../../catalog/experiences/energy-charge/host";
import { prepareAudioPlayback } from "./audio-gestures";

const factories = {
  lightsaber: createLightsaberAudio,
  "reactive-thruster": createThrusterAudio,
  "energy-charge": createEnergyChargeAudio,
};
export type ExperienceId = keyof typeof factories;

function experienceAt(path: string): ExperienceId | undefined {
  if (path === "/") return "reactive-thruster";
  const slug = path.replace(/^\/catalog\//, "");
  return Object.hasOwn(factories, slug) ? (slug as ExperienceId) : undefined;
}

// Browser-only handoff between a navigation gesture and the destination effect.
// A failed or abandoned navigation must not retain a running audio context.
let pending:
  | { id: ExperienceId; audio: AudioEngine; detach(): void; discard(): void }
  | undefined;

export function prepareExperienceNavigationAudio(href: string) {
  const target = new URL(href, window.location.href);
  const id = experienceAt(target.pathname);
  if (target.origin !== window.location.origin) return;
  if (!id) {
    pending?.discard();
    return;
  }
  if (target.pathname === window.location.pathname) return;
  if (pending?.id === id) return;
  pending?.discard();
  const audio = factories[id]();
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
    id,
    audio,
    discard,
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

export function takeExperienceAudio(
  id: ExperienceId,
  surface: HTMLElement | null,
) {
  if (pending && pending.id !== id) pending.discard();
  const entry = pending;
  pending = undefined;
  entry?.detach();
  if (surface) {
    surface.dataset.audioEntry = entry ? "navigation" : "stage";
    surface.dataset.audioEntryState = entry?.audio.state ?? "idle";
  }
  return entry?.audio;
}
