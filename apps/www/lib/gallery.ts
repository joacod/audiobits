import capabilities from "audiobits/capabilities.json" with { type: "json" };
import {
  confirmation,
  impact,
  thruster,
  tactileClick,
  gentleRejection,
  glassNotification,
  whoosh,
  powerUp,
} from "audiobits/recipes";
import type { Recipe } from "audiobits";

// Presentation belongs to the gallery, independently of portable recipe data.
export const demos = {
  confirmation: {
    recipe: confirmation,
    title: "Confirmation",
    description: "A soft upward chime for a completed action.",
    use: "Success feedback · one-shot",
    labels: {},
    endpoints: {},
  },
  impact: {
    recipe: impact,
    title: "Impact",
    description:
      "A descending body and filtered noise transient. Intensity changes pitch, brightness, and level.",
    use: "Collisions and hits · one-shot",
    labels: { intensity: "Intensity" },
    endpoints: { intensity: ["Soft", "Hard"] },
  },
  thruster: {
    recipe: thruster,
    title: "Thruster",
    description:
      "Start once, adjust throttle while it runs, then release with Stop.",
    use: "Movement and propulsion · sustained",
    labels: { throttle: "Throttle" },
    endpoints: { throttle: ["Idle", "Full thrust"] },
  },
  "tactile-click": {
    recipe: tactileClick,
    title: "Tactile click",
    description: "A tiny rounded contact with a restrained noise texture.",
    use: "Buttons and toggles · one-shot",
    labels: { intensity: "Click intensity" },
    endpoints: { intensity: ["Light", "Firm"] },
  },
  "gentle-rejection": {
    recipe: gentleRejection,
    title: "Gentle rejection",
    description: "Two soft descending tones for an unavailable action.",
    use: "Unavailable actions · one-shot",
    labels: {},
    endpoints: {},
  },
  "glass-notification": {
    recipe: glassNotification,
    title: "Glass notification",
    description:
      "Four delicate partials with independent decays and a bright glass rim.",
    use: "Quiet notifications · one-shot",
    labels: { brightness: "Brightness" },
    endpoints: { brightness: ["Warm", "Brilliant"] },
  },
  whoosh: {
    recipe: whoosh,
    title: "Whoosh",
    description:
      "Filtered noise sweeps past with an adjustable sense of weight.",
    use: "Transitions and movement · one-shot",
    labels: { size: "Size" },
    endpoints: { size: ["Small", "Huge"] },
  },
  "power-up": {
    recipe: powerUp,
    title: "Power-up",
    description: "A rising triangle and sine halo that gather energy together.",
    use: "Rewards and pickups · one-shot",
    labels: { intensity: "Power intensity" },
    endpoints: { intensity: ["Gentle", "Charged"] },
  },
};
export type SoundKind = keyof typeof demos;
export const soundKinds = Object.keys(demos) as SoundKind[];
export const sounds = Object.fromEntries(
  soundKinds.map((kind) => [kind, demos[kind].recipe]),
) as Record<SoundKind, Recipe>;
export const soundInfo = demos;
export type RawSoundKind = "confirmation" | "impact" | "thruster";
export function hasRawComparison(kind: SoundKind): kind is RawSoundKind {
  return kind === "confirmation" || kind === "impact" || kind === "thruster";
}
export function parametersFor(
  recipe: Recipe,
  control: number | Readonly<Record<string, number>> = {},
) {
  return Object.fromEntries(
    Object.entries(recipe.parameters ?? {}).map(([name, p]) => [
      name,
      typeof control === "number"
        ? p.min + control * (p.max - p.min)
        : (control[name] ?? p.default),
    ]),
  );
}
export function parameterLabel(kind: SoundKind, name: string): string {
  const labels: Readonly<Record<string, string>> = demos[kind].labels;
  return labels[name] ?? name[0].toUpperCase() + name.slice(1);
}
export function parameterEndpoints(
  kind: SoundKind,
  name: string,
): readonly string[] | undefined {
  const endpoints: Readonly<Record<string, readonly string[]>> =
    demos[kind].endpoints;
  return endpoints[name];
}
export function libraryExample(
  recipe: Recipe,
  control: number | Readonly<Record<string, number>>,
  seed: number,
) {
  return `import { createAudio, defineSound } from "audiobits";

// AudioBits ${capabilities.packageVersion} · package API
const recipe = defineSound(${JSON.stringify(recipe, null, 2)});
const audio = createAudio();
const sound = audio.sound(recipe);
let voice: ReturnType<typeof sound.play> | undefined;
let request = 0;

// Call play() directly from a click/tap/keyboard gesture.
export async function play() {
  const token = ++request;
  await audio.start();
  if (token !== request || document.hidden) return;
  voice?.stop();
  voice = sound.play({ parameters: ${JSON.stringify(parametersFor(recipe, control))}, seed: ${seed} });
}
${
  recipe.kind === "sustained"
    ? `
// While active: voice?.set(${JSON.stringify(
        Object.fromEntries(
          Object.entries(recipe.parameters ?? {})
            .filter(([, p]) => p.mode === "live")
            .map(([name]) => [name, parametersFor(recipe, control)[name]]),
        ),
      )});
`
    : ""
}
export function stop() {
  request++;
  audio.stopAll({ tails: "cut" });
}
function hide() {
  if (document.hidden) {
    stop();
    void audio.suspend().catch(console.error);
  }
}
document.addEventListener("visibilitychange", hide);

// Call on navigation/unmount; returning requires a new Play gesture.
export async function dispose() {
  stop();
  document.removeEventListener("visibilitychange", hide);
  await audio.dispose();
}
// Host Play handler: void play().catch(showError); retry with a new gesture.
// Uses the default dry route and -12 dB master; gallery mixer is separate.
`;
}

export function rawHost(kind: RawSoundKind, control: number, seed: number) {
  return `
// Call directly from the host's Play gesture. Catch errors and show Retry Play.
let context: AudioContext | undefined;
let raw: ReturnType<typeof playRaw> | undefined;
let request = 0;
export async function play() {
  const token = ++request;
  context ??= new AudioContext();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      context.resume(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Audio blocked. Retry Play.")), 2000);
      }),
    ]);
  } finally { clearTimeout(timeout); }
  if (context.state !== "running") throw new Error("Audio blocked. Retry Play.");
  if (token !== request || document.hidden) return;
  raw?.dispose();
  raw = playRaw(context, "${kind}", ${control}, ${seed});
}
export function stop() { request++; raw?.stop(); }
${kind === "thruster" ? `// While active: raw?.setThrottle(${control});` : ""}
function hide() {
  if (document.hidden) {
    request++;
    raw?.dispose();
    void context?.suspend().catch(console.error);
  }
}
document.addEventListener("visibilitychange", hide);
export async function dispose() {
  request++;
  document.removeEventListener("visibilitychange", hide);
  raw?.dispose();
  await context?.close();
}
`;
}
