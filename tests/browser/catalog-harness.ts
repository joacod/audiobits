import {
  sounds,
  parametersFor,
  type SoundKind,
} from "../../apps/www/lib/gallery";
import { compile } from "../../packages/audiobits/src/compiler/plan";
import { createGraph } from "../../packages/audiobits/src/compiler/graph";
import { require } from "./runtime-harness";

async function catalogSignal(
  rate: number,
  kind: SoundKind,
  control: number,
  seed: number,
  action: "natural" | "early" | "live" | "cancel" = "natural",
) {
  async function render() {
    const context = new OfflineAudioContext(1, rate * 2, rate);
    const recipe = sounds[kind];
    const graph = createGraph(
      context,
      context.destination,
      compile(recipe, parametersFor(recipe, control), seed),
      0.05,
      -12,
      0,
      () => {},
    );
    if (action === "cancel") graph.stop();
    const pauses: Promise<void>[] = [];
    if (action === "early")
      pauses.push(
        context.suspend(0.07).then(() => {
          graph.stop();
          return context.resume();
        }),
      );
    else if (recipe.kind === "sustained" && action !== "cancel") {
      if (action === "live")
        for (const [time, value] of [
          [0.3, 1],
          [0.32, 0],
          [0.34, 0.75],
          [0.6, 0.2],
        ])
          pauses.push(
            context.suspend(time).then(() => {
              graph.set(parametersFor(recipe, value));
              return context.resume();
            }),
          );
      pauses.push(
        context.suspend(1.2).then(() => {
          graph.stop();
          return context.resume();
        }),
      );
    }
    const rendering = context.startRendering();
    await Promise.all(pauses);
    const data = (await rendering).getChannelData(0);
    if ("ended" in graph) await graph.ended;
    return data;
  }
  const managed = await render(),
    replay = await render();
  let difference = 0,
    energy = 0,
    latePeak = 0;
  for (let i = 0; i < managed.length; i++) {
    require(Number.isFinite(replay[i]) &&
      Number.isFinite(managed[i]), "Nonfinite catalog signal");
    difference = Math.max(difference, Math.abs(managed[i] - replay[i]));
    energy += replay[i] ** 2;
    if (i > rate * 1.6) latePeak = Math.max(latePeak, Math.abs(replay[i]));
  }
  return { difference, energy, latePeak, action };
}
Object.assign(globalThis, { catalogSignal });
