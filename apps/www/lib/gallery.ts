import capabilities from "audiobits/capabilities.json" with { type: "json" };
import { confirmation } from "../../../catalog/recipes/confirmation/recipe.ts";
import { impact } from "../../../catalog/recipes/impact/recipe.ts";
import { thruster } from "../../../catalog/recipes/thruster/recipe.ts";
import { tactileClick } from "../../../catalog/recipes/tactile-click/recipe.ts";
import { gentleRejection } from "../../../catalog/recipes/gentle-rejection/recipe.ts";
import { glassNotification } from "../../../catalog/recipes/glass-notification/recipe.ts";
import { whoosh } from "../../../catalog/recipes/whoosh/recipe.ts";
import { powerUp } from "../../../catalog/recipes/power-up/recipe.ts";
import { registryItem } from "./registry.ts";
import type { Recipe } from "audiobits";

// Presentation belongs to the gallery, independently of portable recipe data.
export const demos = {
  confirmation: {
    visualFamily: "harmonic",
    exportName: registryItem("confirmation").meta.exportName,
    title: registryItem("confirmation").title,
    description: registryItem("confirmation").description,
    recipe: confirmation,
    use: "Success feedback · one-shot",
    labels: {},
    endpoints: {},
  },
  impact: {
    visualFamily: "pulse",
    exportName: registryItem("impact").meta.exportName,
    title: registryItem("impact").title,
    description: registryItem("impact").description,
    recipe: impact,
    use: "Collisions and hits · one-shot",
    labels: { intensity: "Intensity" },
    endpoints: { intensity: ["Soft", "Hard"] },
  },
  thruster: {
    visualFamily: "flow",
    exportName: registryItem("thruster").meta.exportName,
    title: registryItem("thruster").title,
    description: registryItem("thruster").description,
    recipe: thruster,
    use: "Movement and propulsion · sustained",
    labels: { throttle: "Throttle" },
    endpoints: { throttle: ["Idle", "Full thrust"] },
  },
  "tactile-click": {
    visualFamily: "pulse",
    exportName: registryItem("tactile-click").meta.exportName,
    title: registryItem("tactile-click").title,
    description: registryItem("tactile-click").description,
    recipe: tactileClick,
    use: "Buttons and toggles · one-shot",
    labels: { intensity: "Click intensity" },
    endpoints: { intensity: ["Light", "Firm"] },
  },
  "gentle-rejection": {
    visualFamily: "pulse",
    exportName: registryItem("gentle-rejection").meta.exportName,
    title: registryItem("gentle-rejection").title,
    description: registryItem("gentle-rejection").description,
    recipe: gentleRejection,
    use: "Unavailable actions · one-shot",
    labels: {},
    endpoints: {},
  },
  "glass-notification": {
    visualFamily: "harmonic",
    exportName: registryItem("glass-notification").meta.exportName,
    title: registryItem("glass-notification").title,
    description: registryItem("glass-notification").description,
    recipe: glassNotification,
    use: "Quiet notifications · one-shot",
    labels: { brightness: "Brightness" },
    endpoints: { brightness: ["Warm", "Brilliant"] },
  },
  whoosh: {
    visualFamily: "flow",
    exportName: registryItem("whoosh").meta.exportName,
    title: registryItem("whoosh").title,
    description: registryItem("whoosh").description,
    recipe: whoosh,
    use: "Transitions and movement · one-shot",
    labels: { size: "Size" },
    endpoints: { size: ["Small", "Huge"] },
  },
  "power-up": {
    visualFamily: "harmonic",
    exportName: registryItem("power-up").meta.exportName,
    title: registryItem("power-up").title,
    description: registryItem("power-up").description,
    recipe: powerUp,
    use: "Rewards and pickups · one-shot",
    labels: { intensity: "Power intensity" },
    endpoints: { intensity: ["Gentle", "Charged"] },
  },
} as const;
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

// Seeded noise and nonconstant random values affect the audible variation.
export function hasAudibleVariation(recipe: Recipe): boolean {
  function varies(value: unknown): boolean {
    if (!value || typeof value !== "object") return false;
    if (Array.isArray(value)) return value.some(varies);
    const node = value as Record<string, unknown>;
    if (node.type === "noise") return true;
    if (Array.isArray(node.random) && node.random[0] !== node.random[1])
      return true;
    return Object.values(node).some(varies);
  }
  return varies(recipe);
}

export function quickExample(
  kind: SoundKind,
  controls: Readonly<Record<string, number>>,
  seed: number,
  recipe: Recipe = sounds[kind],
) {
  const original = JSON.stringify(recipe) === JSON.stringify(sounds[kind]);
  const sustained = recipe.kind === "sustained";
  const live = Object.entries(recipe.parameters ?? {}).filter(
    ([, p]) => p.mode === "live",
  );
  const options = [
    ...(Object.keys(controls).length
      ? [`parameters: ${JSON.stringify(controls)}`]
      : []),
    ...(hasAudibleVariation(recipe) ? [`seed: ${seed}`] : []),
  ].join(", ");
  return `import { createAudio${original ? "" : ", defineSound"} } from "audiobits";
${
  original
    ? `import { ${demos[kind].exportName} } from "./sounds/recipes/${kind}/recipe";`
    : `
const recipe = defineSound(${JSON.stringify(recipe, null, 2)});`
}

const audio = createAudio();
const sound = audio.sound(${original ? demos[kind].exportName : "recipe"});
let request = 0;
${sustained ? "let voice: ReturnType<typeof sound.play> | undefined;\n" : ""}
// Use in src/integration.ts. Call play() from a user gesture; handle errors.
export async function play() {
  const token = ++request;
  await audio.start();
  if (token !== request) return;
  ${sustained ? "voice?.stop();\n  voice = " : ""}sound.play(${options ? `{ ${options} }` : ""});
}
${
  sustained && live.length
    ? `
// Connect application state to these live parameters.
export function update(${live.length === 1 ? "value: number" : `values: { ${live.map(([name]) => `${JSON.stringify(name)}: number`).join("; ")} }`}) {
  voice?.set(${live.length === 1 ? `{ ${JSON.stringify(live[0][0])}: value }` : "values"});
}
`
    : ""
}${
    sustained
      ? `
// Release with the recipe's natural tail.
export function release() {
  request++;
  voice?.stop();
  voice = undefined;
}
`
      : ""
  }
export function stop() {
  request++;
  audio.stopAll({ tails: "cut" });
${sustained ? "  voice = undefined;\n" : ""}}

// Call on navigation/unmount.
export async function dispose() {
  stop();
  sound.dispose();
  await audio.dispose();
}
`;
}
