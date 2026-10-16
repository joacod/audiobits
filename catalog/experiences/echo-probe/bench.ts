// Development-only recipe comparison. Never included in the registry payload.
import type { AudioEngine, PlayOptions, Recipe } from "audiobits";
import { compile } from "../../../packages/audiobits/src/compiler/plan";
import { createGraph } from "../../../packages/audiobits/src/compiler/graph";
import { createEchoProbe } from "./controller";
import { createEchoProbe as createBaseline } from "./baseline-controller";
import { echoProbe } from "./recipe";
import { probeEchoes, type MaterialId } from "./controller";
import { probeDiffusion as noiseWash } from "./baseline";

export interface BenchSettings {
  composition: "baseline" | "materials";
  /** "surface" omits the material so the controller falls back from `surface`. */
  material: MaterialId | "surface";
  space: "cluster" | "noise" | "none";
  distance: number;
  surface: number;
  intensity: number;
  pan: number;
  seed: number;
  /** Match returned energy for composition comparisons; disable for strength/distance. */
  matchLevel: boolean;
}
export const benchDefaults: BenchSettings = {
  composition: "materials",
  material: "surface",
  space: "cluster",
  distance: 0.35,
  surface: 0.7,
  intensity: 0.9,
  pan: -0.6,
  seed: 42,
  matchLevel: true,
};

/** Compare a single reflector at a fixed clock origin, using production scheduling. */
export async function renderProbeComparison(
  settings: BenchSettings,
  rate = 48000,
  seconds = 8,
) {
  const buildStarted = performance.now();
  const context = new OfflineAudioContext(4, rate * seconds, rate);
  const master = context.createGain();
  master.gain.value = 10 ** (-12 / 20);
  master.connect(context.destination);
  const dry = context.createGain();
  const wet = context.createGain();
  const dryChannels = context.createChannelSplitter(2);
  const wetChannels = context.createChannelSplitter(2);
  const lanes = context.createChannelMerger(4);
  dry.connect(dryChannels);
  wet.connect(wetChannels);
  dryChannels.connect(lanes, 0, 0);
  dryChannels.connect(lanes, 1, 1);
  wetChannels.connect(lanes, 0, 2);
  wetChannels.connect(lanes, 1, 3);
  lanes.connect(master);
  let voices = 0,
    sources = 0,
    delayNodes = 0,
    clockSources = 0,
    delaySeconds = 0,
    filters = 0;
  const graphs: ReturnType<typeof createGraph>[] = [];
  const owned: AudioNode[] = [
    master,
    dry,
    wet,
    dryChannels,
    wetChannels,
    lanes,
  ];
  const plans: {
    at: number;
    seed: number;
    pan: number;
    gainDb: number;
    role: string;
  }[] = [];
  const audio = {
    state: "running",
    native: { context },
    subscribe() {
      return () => {};
    },
    sound(original: Recipe) {
      const isPulse =
        original === echoProbe ||
        (original.layers[0].id === "struck-body" && !original.parameters);
      const isLate =
        Object.values(probeEchoes).includes(original as never) ||
        original === noiseWash;
      const recipe: Recipe =
        isLate && settings.space === "noise" ? noiseWash : original;
      return {
        play(options: PlayOptions = {}) {
          const at = options.at ?? 0;
          const seed = options.seed ?? settings.seed;
          const pan = options.pan ?? 0;
          const gainDb = options.gainDb ?? 0;
          const role = isPulse ? "pulse" : isLate ? "late" : "early";
          plans.push({ at, seed, pan, gainDb, role });
          // The noise reference is one wash per reflector, rather than three copies.
          if (
            isLate &&
            (settings.space === "none" ||
              (settings.space === "noise" &&
                plans.filter((p) => p.role === "late").length > 1))
          )
            return { ended: new Promise<void>(() => {}), stop() {} };
          const parameters =
            recipe === noiseWash
              ? { surface: settings.surface }
              : options.parameters;
          const plan = compile(recipe, parameters, seed);
          graphs.push(
            createGraph(
              context,
              isPulse ? dry : wet,
              plan,
              at,
              gainDb,
              pan,
              () => {},
            ),
          );
          voices++;
          sources += plan.layers.length;
          const effects = [
            ...plan.effectChain,
            ...plan.layers.flatMap(({ layer }) => layer.effects ?? []),
          ];
          filters += effects.filter(
            (effect) => effect.type === "filter",
          ).length;
          clockSources += Number(plan.hasDelay);
          for (const effect of effects) {
            if (effect.type !== "delay" || effect.mix === 0) continue;
            delayNodes++;
            delaySeconds += effect.time;
          }
          return { ended: new Promise<void>(() => {}), stop() {} };
        },
        dispose() {},
      };
    },
  } as unknown as AudioEngine;
  const control =
    settings.composition === "baseline"
      ? createBaseline(audio)
      : createEchoProbe(audio);
  const { material, ...reflection } = settings;
  const emission = control.emit(
    [material === "surface" ? reflection : { ...reflection, material }],
    { seed: settings.seed },
  )!;
  const buildMs = performance.now() - buildStarted;
  const renderStarted = performance.now();
  const lanesBuffer = await context.startRendering();
  const renderMs = performance.now() - renderStarted;
  const buffer = context.createBuffer(2, rate * seconds, rate);
  for (const graph of graphs) graph.finish();
  control.dispose();
  for (const node of owned) node.disconnect();
  let peak = 0,
    energy = 0,
    returnEnergy = 0,
    left = 0,
    right = 0,
    slope = 0,
    returnSlope = 0,
    tail = 0,
    dryPeak = 0,
    wetPeak = 0,
    wetLeft = 0,
    wetRight = 0,
    lateEnergy = 0;
  const dryA = lanesBuffer.getChannelData(0),
    dryB = lanesBuffer.getChannelData(1);
  const wetA = lanesBuffer.getChannelData(2),
    wetB = lanesBuffer.getChannelData(3);
  for (let i = 0; i < dryA.length; i++) {
    const a = dryA[i] + wetA[i],
      b = dryB[i] + wetB[i];
    if (![a, b, wetA[i], wetB[i]].every(Number.isFinite))
      throw new Error("Nonfinite comparison sample");
    const power = a ** 2 + b ** 2,
      wetPower = wetA[i] ** 2 + wetB[i] ** 2;
    energy += power;
    returnEnergy += wetPower;
    left += a ** 2;
    right += b ** 2;
    wetLeft += wetA[i] ** 2;
    wetRight += wetB[i] ** 2;
    peak = Math.max(peak, Math.abs(a), Math.abs(b));
    dryPeak = Math.max(dryPeak, Math.abs(dryA[i]), Math.abs(dryB[i]));
    wetPeak = Math.max(wetPeak, Math.abs(wetA[i]), Math.abs(wetB[i]));
    if (i) {
      slope +=
        (a - dryA[i - 1] - wetA[i - 1]) ** 2 +
        (b - dryB[i - 1] - wetB[i - 1]) ** 2;
      returnSlope +=
        (wetA[i] - wetA[i - 1]) ** 2 + (wetB[i] - wetB[i - 1]) ** 2;
    }
    if (i > rate * ((emission.reflections[0]?.at ?? Infinity) + 0.3))
      lateEnergy += wetPower;
    if (i > rate * (seconds - 0.2))
      tail = Math.max(tail, Math.abs(a), Math.abs(b));
  }
  // Match only returned energy, preserving the dry pulse's level. This is an
  // audition aid, not a claim of equal perceived loudness.
  const scale =
    settings.matchLevel && returnEnergy > 0
      ? Math.min(
          Math.sqrt(0.05 / returnEnergy),
          Math.max(0, 0.45 - dryPeak) / Math.max(wetPeak, 1e-12),
        )
      : 1;
  const a = buffer.getChannelData(0),
    b = buffer.getChannelData(1);
  for (let i = 0; i < a.length; i++) {
    a[i] = dryA[i] + wetA[i] * scale;
    b[i] = dryB[i] + wetB[i] * scale;
  }
  return {
    buffer,
    plans,
    metrics: {
      peak,
      energy,
      returnEnergy,
      left,
      right,
      wetLeft,
      wetRight,
      brightness: slope / energy,
      returnBrightness: returnEnergy ? returnSlope / returnEnergy : 0,
      lateEnergy,
      tail,
      scale,
      voices,
      sources,
      filters,
      delayNodes,
      clockSources,
      delaySeconds,
      buildMs,
      renderMs,
    },
  };
}
