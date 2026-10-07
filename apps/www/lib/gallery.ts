import capabilities from "audiobits/capabilities.json" with { type: "json" };
import { confirmation, impact, thruster } from "audiobits/recipes";
import type { Recipe } from "audiobits";

export const sounds = { confirmation, impact, thruster };
export type SoundKind = keyof typeof sounds;
export const soundInfo = {
  confirmation: {
    title: "Confirmation",
    description: "A soft upward chime for a completed action.",
    use: "Success feedback · one-shot",
  },
  impact: {
    title: "Impact",
    description: "A descending body with a bright noise transient.",
    use: "Collisions and hits · one-shot",
  },
  thruster: {
    title: "Thruster",
    description: "A continuous motor and exhaust that respond to throttle.",
    use: "Movement and propulsion · sustained",
  },
};
export function parametersFor(recipe: Recipe, control: number) {
  return Object.fromEntries(
    Object.entries(recipe.parameters ?? {}).map(([name, parameter]) => [
      name,
      name === "intensity" || name === "throttle" ? control : parameter.default,
    ]),
  );
}
export function libraryExample(recipe: Recipe, control: number, seed: number) {
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
// While active: voice?.set({ throttle: ${control} });
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

export function rawHost(kind: SoundKind, control: number, seed: number) {
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
