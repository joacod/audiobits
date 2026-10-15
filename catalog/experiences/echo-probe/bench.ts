// Development-only native comparison. Never included in the registry payload.
import type { AudioEngine, PlayOptions, Recipe } from "audiobits";
import { compile } from "../../../packages/audiobits/src/compiler/plan";
import { createGraph } from "../../../packages/audiobits/src/compiler/graph";
import { createEchoProbe } from "./controller";
import { createEchoProbe as createBaseline } from "./baseline-controller";
import {
  echoProbe,
  probeReflection,
  probeReturn,
  probeDiffusion,
} from "./recipe";
import { probeDiffusion as noiseWash } from "./baseline";

export interface BenchSettings {
  composition: "baseline" | "pulse" | "hybrid" | "delay";
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
  composition: "hybrid",
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
) {
  const buildStarted = performance.now();
  const context = new OfflineAudioContext(4, rate * 2, rate);
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
    filters = 0;
  let emitted: GainNode | undefined;
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
      const isLate = original === probeDiffusion || original === noiseWash;
      const recipe =
        original === probeReflection && settings.composition === "pulse"
          ? probeReturn
          : isLate && settings.space === "noise"
            ? noiseWash
            : original;
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
          if (settings.composition === "delay" && role === "early") {
            const delay = context.createDelay(1.2);
            delay.delayTime.value = at - 0.012;
            // Downmix the center-panned emission before independently placing
            // its return. Compensate the original center-channel gain once.
            delay.channelCount = 1;
            delay.channelCountMode = "explicit";
            const level = context.createGain();
            level.gain.value =
              Math.SQRT2 * 10 ** ((gainDb + 12 * (1 - 0.8)) / 20);
            const panner = context.createStereoPanner();
            panner.pan.value = pan;
            let output: AudioNode = delay;
            for (const effect of plan.effects) {
              const filter = context.createBiquadFilter();
              filter.type = effect.filter;
              filter.frequency.value = effect.frequency as number;
              filter.Q.value = effect.q;
              output.connect(filter);
              output = filter;
              owned.push(filter);
              filters++;
            }
            emitted!.connect(delay);
            output.connect(level).connect(panner).connect(wet);
            owned.push(delay, level, panner);
            delayNodes++;
          } else {
            let destination: AudioNode = isPulse ? dry : wet;
            if (settings.composition === "delay" && isPulse) {
              emitted = context.createGain();
              emitted.connect(dry);
              destination = emitted;
              owned.push(emitted);
            }
            graphs.push(
              createGraph(
                context,
                destination,
                plan,
                at,
                gainDb,
                pan,
                () => {},
              ),
            );
            voices++;
            sources += plan.layers.length;
            filters +=
              plan.effects.length +
              plan.layers.reduce(
                (n, layer) => n + (layer.layer.effects?.length ?? 0),
                0,
              );
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
  const emission = control.emit([settings], { seed: settings.seed })!;
  const buildMs = performance.now() - buildStarted;
  const renderStarted = performance.now();
  const lanesBuffer = await context.startRendering();
  const renderMs = performance.now() - renderStarted;
  const buffer = context.createBuffer(2, rate * 2, rate);
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
    if (i > rate * 1.8) tail = Math.max(tail, Math.abs(a), Math.abs(b));
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
      buildMs,
      renderMs,
    },
  };
}
