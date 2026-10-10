import { reactiveThruster } from "../../catalog/reactive-thruster/recipe";
// Browser-only test bundle. Internal compiler access does not add a public API.
import { compile } from "../../packages/audiobits/src/compiler/plan";
import { createGraph } from "../../packages/audiobits/src/compiler/graph";
import { createEngine } from "../../packages/audiobits/src/runtime/engine";
import {
  confirmation,
  impact,
  thruster,
} from "../../packages/audiobits/src/recipes";

async function waitForCleanup(ready: () => boolean) {
  const deadline = performance.now() + 1000;
  while (!ready()) {
    require(performance.now() <
      deadline, "Offline ended callbacks did not arrive");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
function require(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}
async function signal(count: number, action?: "cancel") {
  const context = new OfflineAudioContext(1, 48000, 48000);
  const master = context.createGain();
  master.gain.value = 10 ** (-12 / 20);
  master.connect(context.destination);
  let finished = 0;
  const plan = compile(confirmation);
  const graphs = Array.from({ length: count }, () =>
    createGraph(context, master, plan, 0.05, 0, 0, () => {
      finished++;
    }),
  );
  if (action === "cancel") graphs.forEach((graph) => graph.stop());
  const buffer = await context.startRendering();
  const data = buffer.getChannelData(0);
  let peak = 0,
    energy = 0,
    tail = 0,
    onset = 0,
    maxDelta = 0;
  for (let i = 0; i < data.length; i++) {
    require(Number.isFinite(data[i]), "Nonfinite output");
    peak = Math.max(peak, Math.abs(data[i]));
    energy += data[i] ** 2;
    if (i < 2400) onset = Math.max(onset, Math.abs(data[i]));
    if (i > 18000) tail = Math.max(tail, Math.abs(data[i]));
    if (i > 0) maxDelta = Math.max(maxDelta, Math.abs(data[i] - data[i - 1]));
  }
  await waitForCleanup(() => finished === count);
  require(finished === count, "Natural resources did not finish");
  return { peak, energy, tail, onset, maxDelta, finished };
}
async function stopSignal() {
  const recipe = {
    ...confirmation,
    duration: 0.3,
    layers: [
      {
        ...confirmation.layers[0],
        effects: [],
        source: { ...confirmation.layers[0].source, frequency: 520 },
        envelope: { attack: 0.2, decay: 0, sustain: 1, release: 0.05 },
      },
    ],
    effects: [],
  } as const;
  const plan = compile(recipe);
  const context = new OfflineAudioContext(1, 48000, 48000);
  const graph = createGraph(
    context,
    context.destination,
    plan,
    0,
    -12,
    0,
    () => {},
  );
  let stopTime = 0;
  const paused = context.suspend(0.04).then(() => {
    stopTime = context.currentTime;
    graph.stop();
    graph.stop();
    return context.resume();
  });
  const rendering = context.startRendering();
  await paused;
  const buffer = await rendering;
  const data = buffer.getChannelData(0);
  let energy = 0,
    releaseEnergy = 0,
    late = 0,
    delta = 0;
  for (let i = 0; i < data.length; i++) {
    energy += data[i] ** 2;
    if (i > 2500 && i < 4000) releaseEnergy += data[i] ** 2;
    if (i > 4800) late = Math.max(late, Math.abs(data[i]));
    if (i) delta = Math.max(delta, Math.abs(data[i] - data[i - 1]));
  }
  return { energy, releaseEnergy, late, delta, stopTime };
}
async function lifecycle() {
  let allocation = 0;
  const contexts: AudioContext[] = [];
  let blocked = true;
  const audio = createEngine({}, () => {
    allocation++;
    const context = new AudioContext();
    contexts.push(context);
    const native = context.resume.bind(context);
    context.resume = () =>
      blocked
        ? Promise.reject(new Error("simulated activation rejection"))
        : native();
    return context;
  });
  const sound = audio.sound(confirmation);
  require(allocation === 0, "Eager context allocation");
  let rejected = false;
  try {
    await audio.start();
  } catch {
    rejected = true;
  }
  require(rejected &&
    audio.state === "suspended", "Failed start was not observable");
  blocked = false;
  await audio.start();
  require(allocation === 1 && audio.state === "running", "Retry failed");
  const future = sound.play({ at: contexts[0].currentTime + 1 });
  future.stop();
  await future.ended;
  require(audio.counts.active === 0, "Future cancellation leaked");
  const first = sound.play();
  const second = sound.play();
  await Promise.all([first.ended, second.ended]);
  require(audio.counts.active === 0, "Natural overlap leaked");
  for (let i = 0; i < 300; i++) sound.play();
  require(audio.counts.active <= 8 &&
    audio.counts.retiring <= 1, "Stress exceeded limit");
  await audio.suspend();
  require(audio.counts.active === 0 &&
    audio.counts.retiring === 0, "Suspension leaked");
  await audio.start();
  sound.play();
  await contexts[0].suspend();
  await audio.dispose();
  require(contexts[0].state === "closed" &&
    audio.state === "disposed", "Dispose failed");
  // Dispose a native context while its resume promise is pending.
  const orphan = new AudioContext();
  let release!: () => void;
  orphan.resume = () =>
    new Promise<void>((resolve) => {
      release = resolve;
    });
  const raced = createEngine({}, () => orphan);
  const pending = raced.start();
  const handled = pending.catch(() => {});
  await raced.dispose();
  release();
  await handled;
  require(orphan.state === "closed" &&
    raced.state === "disposed", "Pending start left orphan");
  return { allocation, state: audio.state, counts: audio.counts };
}
// Property assignment keeps the test helper isolated from application globals.
Object.assign(globalThis, { audioChecks: { signal, stopSignal, lifecycle } });

async function blockedActivation() {
  const context = new AudioContext();
  const audio = createEngine({}, () => context);
  const sound = audio.sound(confirmation);
  let rejected = false;
  try {
    await audio.start();
  } catch {
    rejected = true;
  }
  const result = {
    rejected,
    state: audio.state,
    nativeState: context.state,
    counts: audio.counts,
  };
  Object.assign(globalThis, {
    retryActivation: async () => {
      await audio.start();
      const voice = sound.play();
      await voice.ended;
      await audio.dispose();
      return {
        state: audio.state,
        nativeState: context.state,
        counts: audio.counts,
      };
    },
  });
  return result;
}
Object.assign(globalThis, { blockedActivation });

async function dynamicSignal(
  rate: number,
  kind: "impact" | "thruster" | "reactive-thruster",
  control: number,
  update = false,
  cancel = false,
  count = 1,
  stopAt = 2.2,
) {
  const recipe =
    kind === "impact"
      ? impact
      : kind === "reactive-thruster"
        ? reactiveThruster
        : thruster;
  const name = kind === "impact" ? "intensity" : "throttle";
  const context = new OfflineAudioContext(1, rate * 3, rate);
  let finished = 0;
  const graphs = Array.from({ length: count }, () =>
    createGraph(
      context,
      context.destination,
      compile(recipe, { [name]: control }, 42),
      0.05,
      -12,
      0,
      () => {
        finished++;
      },
    ),
  );
  const graph = graphs[0];
  if (cancel) graphs.forEach((graph) => graph.stop());
  const pauses: Promise<void>[] = [];
  if (kind !== "impact" && !cancel) {
    if (update) {
      for (const [time, value] of [
        [0.4, 1],
        [0.42, 0],
        [0.44, 1],
        [0.6, 0.2],
      ]) {
        pauses.push(
          context.suspend(time).then(() => {
            graph.set({ throttle: value });
            return context.resume();
          }),
        );
      }
    }
    pauses.push(
      context.suspend(stopAt).then(() => {
        graph.stop();
        return context.resume();
      }),
    );
  }
  const rendering = context.startRendering();
  await Promise.all(pauses);
  const data = (await rendering).getChannelData(0);
  let peak = 0,
    energy = 0,
    tail = 0,
    onset = 0,
    delta = 0,
    seamDelta = 0,
    seamRms = 0,
    steadyRms = 0,
    differenceEnergy = 0,
    releaseEnergy = 0,
    afterRelease = 0;
  let checksum = 2166136261;
  const bits = new Uint32Array(data.buffer);
  for (let i = 0; i < data.length; i++) {
    require(Number.isFinite(data[i]), "Nonfinite dynamic output");
    peak = Math.max(peak, Math.abs(data[i]));
    energy += data[i] ** 2;
    if (i / rate > stopAt + 0.02 && i / rate < stopAt + 0.15)
      releaseEnergy += data[i] ** 2;
    if (i / rate > stopAt + 0.32)
      afterRelease = Math.max(afterRelease, Math.abs(data[i]));
    if (i < rate * 0.05) onset = Math.max(onset, Math.abs(data[i]));
    if (i > rate * 2.5) tail = Math.max(tail, Math.abs(data[i]));
    if (i) {
      delta = Math.max(delta, Math.abs(data[i] - data[i - 1]));
      differenceEnergy += (data[i] - data[i - 1]) ** 2;
    }
    // First loop wraps at onset + 1 s, subsequent loops have 0.98 s period.
    if (Math.abs(i / rate - 1.05) < 0.025) {
      if (i) seamDelta = Math.max(seamDelta, Math.abs(data[i] - data[i - 1]));
      seamRms += data[i] ** 2;
    }
    if (Math.abs(i / rate - 0.85) < 0.025) steadyRms += data[i] ** 2;
    checksum = Math.imul(checksum ^ bits[i], 16777619) >>> 0;
  }
  return {
    rate,
    count,
    kind,
    control,
    peak,
    energy,
    tail,
    onset,
    delta,
    seamDelta,
    seamRms: Math.sqrt(seamRms / (rate * 0.05)),
    steadyRms: Math.sqrt(steadyRms / (rate * 0.05)),
    checksum,
    brightness: energy > 0 ? differenceEnergy / energy : 0,
    releaseEnergy,
    afterRelease,
    finished,
  };
}
async function dynamicLifecycle() {
  const context = new AudioContext();
  const live = new Set<AudioNode>();
  const buffers: AudioBufferSourceNode[] = [];
  let created = 0;
  for (const name of [
    "createGain",
    "createOscillator",
    "createBufferSource",
    "createBiquadFilter",
    "createStereoPanner",
  ] as const) {
    const native = context[name].bind(context);
    Object.assign(context, {
      [name]: () => {
        const node = native();
        created++;
        live.add(node);
        if ("buffer" in node) buffers.push(node as AudioBufferSourceNode);
        const disconnect = node.disconnect.bind(node);
        node.disconnect = () => {
          live.delete(node);
          disconnect();
        };
        return node;
      },
    });
  }
  const audio = createEngine(
    { maxVoices: 2, maxVoicesPerSound: 2 },
    () => context,
  );
  await audio.start();
  const preparation: number[] = [];
  for (let i = 0; i < 100; i++) {
    const before = performance.now();
    const sound = audio.sound(impact);
    preparation.push(performance.now() - before);
    sound.dispose();
  }
  const sound = audio.sound(thruster);
  const impactSound = audio.sound(impact);
  const voice = sound.play({ seed: 42 });
  const nodesPerThruster = live.size - 2;
  const baseline = created;
  const originalBuffer = buffers.at(-1)!.buffer;
  for (let i = 0; i < 1000; i++) voice.set({ throttle: (i % 101) / 100 });
  require(created === baseline &&
    buffers.at(-1)!.buffer ===
      originalBuffer, "Live controls recreated resources");
  voice.stop();
  let endedError = false;
  try {
    voice.set({ throttle: 0 });
  } catch {
    endedError = true;
  }
  require(endedError, "Stopped voice accepted controls");
  await voice.ended;
  require(live.size === 2 &&
    buffers.every(
      (source) => source.buffer === null,
    ), "Release retained resources");
  const future = sound.play({ at: context.currentTime + 10 });
  future.stop();
  await future.ended;
  const scheduling: number[] = [];
  for (let i = 0; i < 100; i++) {
    const before = performance.now();
    impactSound.play({ seed: i });
    scheduling.push(performance.now() - before);
  }
  await audio.suspend();
  require(live.size === 2, "Suspension retained nodes");
  await audio.start();
  let maxNodes = 0,
    maxBytes = 0;
  for (let i = 0; i < 1000; i++) {
    const next = sound.play({ seed: i });
    next.set({ throttle: 1 });
    next.stop();
    maxNodes = Math.max(maxNodes, live.size);
    const bytes = buffers.reduce(
      (sum, source) => sum + (source.buffer ? source.buffer.length * 4 : 0),
      0,
    );
    maxBytes = Math.max(maxBytes, bytes);
    require(live.size <= 32 &&
      bytes <= context.sampleRate * 4 * 3, "Sustained stress exceeded bounds");
    require(audio.counts.active <= 2 &&
      audio.counts.retiring <= 1, "Voice stress exceeded bounds");
  }
  sound.play({ seed: 7 });
  sound.dispose();
  require(live.size === 2 &&
    buffers.every(
      (source) => source.buffer === null,
    ), "Sound disposal retained resources");
  audio.sound(thruster).play({ seed: 8 });
  await audio.dispose();
  require(live.size === 0, "Engine disposal retained nodes");
  const stats = (values: number[]) => {
    const firstMs = values[0];
    values.sort((a, b) => a - b);
    return {
      firstMs,
      medianMs: values[50],
      p95Ms: values[95],
      maxMs: values.at(-1),
    };
  };
  return {
    sampleRate: context.sampleRate,
    nodesPerThruster,
    maxNodes,
    maxBytes,
    preparation: stats(preparation),
    scheduling: stats(scheduling),
    finalNodes: live.size,
    counts: audio.counts,
  };
}
Object.assign(globalThis, { dynamicSignal, dynamicLifecycle });

// Native offline bus gain/mute checks are measurable signal evidence.
async function mixingSignal(rate: number, cut: boolean) {
  const { OwnedBus } = await import("../../packages/audiobits/src/runtime/bus");
  const context = new OfflineAudioContext(1, rate * 2, rate);
  const bus = new OwnedBus(
    "master",
    context as unknown as AudioContext,
    {},
    null,
    () => {},
    -12,
  );
  const source = context.createOscillator();
  source.connect(bus.input);
  source.start(0.05);
  source.stop(1);
  let cutAt: number | null = null;
  const pauses = [
    context.suspend(0.1).then(() => {
      bus.setGainDb(-18, 0.6);
      return context.resume();
    }),
  ];
  if (cut)
    pauses.push(
      context.suspend(0.4).then(() => {
        cutAt = context.currentTime;
        bus.setGainDb(-6, 0.2);
        bus.setMuted(true);
        return context.resume();
      }),
    );
  const rendering = context.startRendering();
  await Promise.all(pauses);
  const data = (await rendering).getChannelData(0);
  let fadeEnergy = 0,
    tailEnergy = 0,
    latePeak = 0,
    peak = 0;
  for (let i = 0; i < data.length; i++) {
    require(Number.isFinite(data[i]), "Nonfinite bus output");
    peak = Math.max(peak, Math.abs(data[i]));
    if (cutAt !== null && i > rate * cutAt && i < rate * (cutAt + 0.005))
      fadeEnergy += data[i] ** 2;
    if (i > rate * 0.5 && i < rate) tailEnergy += data[i] ** 2;
    if (i > rate * 1.1) latePeak = Math.max(latePeak, Math.abs(data[i]));
  }
  source.disconnect();
  bus.destroy();
  return { rate, cut, cutAt, fadeEnergy, tailEnergy, latePeak, peak };
}
async function mixingLifecycle() {
  const context = new AudioContext();
  const live = new Set<AudioNode>();
  let peakNodes = 0;
  for (const name of [
    "createGain",
    "createDelay",
    "createOscillator",
    "createBufferSource",
    "createBiquadFilter",
    "createStereoPanner",
  ] as const) {
    const native = context[name].bind(context);
    Object.assign(context, {
      [name]: (...args: number[]) => {
        const node = (native as (...args: number[]) => AudioNode)(...args);
        live.add(node);
        peakNodes = Math.max(peakNodes, live.size);
        const disconnect = node.disconnect.bind(node);
        node.disconnect = ((...targets: AudioNode[]) => {
          if (!targets.length) live.delete(node);
          if (targets.length) disconnect(targets[0]);
          else disconnect();
        }) as typeof node.disconnect;
        return node;
      },
    });
  }
  const audio = createEngine(
    { maxVoices: 2, maxVoicesPerSound: 2 },
    () => context,
  );
  await audio.start();
  const parent = audio.bus("effects");
  const child = audio.bus("child", parent);
  const analyser = context.createAnalyser();
  const remove = audio.native.connect(analyser);
  const sound = audio.sound(thruster);
  const finite = audio.sound(confirmation);
  for (let i = 0; i < 200; i++) {
    sound.play({ bus: child, seed: i });
    finite.play({ bus: parent });
    parent.setMuted(i % 2 === 0);
    parent.setGainDb(-6, 0.01);
    audio.stopAll({ tails: "cut" });
    require(audio.counts.active <= 2 &&
      audio.counts.retiring <= 1, "Mixed voice limit exceeded");
    require(live.size <= 45, "Mixed owned-node limit exceeded");
  }
  await audio.suspend();
  require(live.size === 6, "Suspended mixed resources retained");
  await audio.start();
  sound.play({ bus: child });
  parent.dispose();
  require(audio.counts.active === 0 && live.size === 2, "Subtree leaked");
  remove();
  analyser.disconnect();
  await audio.dispose();
  require(live.size === 0, "Engine leaked nodes");
  return { peakNodes, finalNodes: live.size, state: audio.state };
}
Object.assign(globalThis, { mixingSignal, mixingLifecycle });

// Comparison source is the exact standalone module displayed by the gallery.
async function comparisonSignal(
  rate: number,
  kind: "confirmation" | "impact" | "thruster",
  control: number,
  seed: number,
  action: "natural" | "early" | "live" | "cancel" = "natural",
) {
  const { playRaw } = await import("../../apps/www/lib/raw-example");
  async function render(raw: boolean) {
    const context = new OfflineAudioContext(1, rate * 2, rate);
    const recipe = { confirmation, impact, thruster }[kind];
    const graph = raw
      ? playRaw(context, kind, control, seed, 0.05)
      : createGraph(
          context,
          context.destination,
          compile(
            recipe,
            kind === "confirmation"
              ? {}
              : { [kind === "impact" ? "intensity" : "throttle"]: control },
            seed,
          ),
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
    else if (kind === "thruster" && action !== "cancel") {
      if (action === "live")
        for (const [time, value] of [
          [0.3, 1],
          [0.32, 0],
          [0.34, 0.75],
          [0.6, 0.2],
        ])
          pauses.push(
            context.suspend(time).then(() => {
              if ("setThrottle" in graph) graph.setThrottle(value);
              else graph.set({ throttle: value });
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
  const managed = await render(false),
    raw = await render(true);
  let difference = 0,
    energy = 0,
    latePeak = 0;
  for (let i = 0; i < managed.length; i++) {
    require(Number.isFinite(raw[i]) &&
      Number.isFinite(managed[i]), "Nonfinite comparison");
    difference = Math.max(difference, Math.abs(managed[i] - raw[i]));
    energy += raw[i] ** 2;
    if (i > rate * 1.6) latePeak = Math.max(latePeak, Math.abs(raw[i]));
  }
  return { difference, energy, latePeak };
}
Object.assign(globalThis, { comparisonSignal });

async function capabilitySignal(recipe: unknown) {
  const { defineSound } =
    await import("../../packages/audiobits/src/recipe/validate");
  const definition = defineSound(recipe);
  const context = new OfflineAudioContext(1, 48000, 48000);
  let finished = 0;
  const graph = createGraph(
    context,
    context.destination,
    compile(definition, {}, 42),
    0.02,
    -12,
    0,
    () => {
      finished++;
    },
  );
  const stopped =
    definition.kind === "sustained"
      ? context.suspend(0.3).then(() => {
          graph.stop();
          return context.resume();
        })
      : Promise.resolve();
  const rendering = context.startRendering();
  await stopped;
  const data = (await rendering).getChannelData(0);
  let energy = 0,
    tail = 0;
  for (let i = 0; i < data.length; i++) {
    require(Number.isFinite(data[i]), "Nonfinite advertised primitive");
    energy += data[i] ** 2;
    if (i > 48000 * 0.8) tail = Math.max(tail, Math.abs(data[i]));
  }
  await waitForCleanup(() => finished === 1);
  require(finished === 1, "Advertised primitive did not clean up");
  return { energy, tail, finished };
}
Object.assign(globalThis, { capabilitySignal });

async function curatedSignal(
  recipe: import("../../packages/audiobits/src/recipe/generated").Recipe,
  rate: number,
  values: Record<string, number>,
  count = 1,
  cancel = false,
) {
  const context = new OfflineAudioContext(1, rate * 2, rate);
  const plan = compile(recipe, values, 42);
  let finished = 0;
  const graphs = Array.from({ length: count }, (_, i) =>
    createGraph(
      context,
      context.destination,
      plan,
      0.05 + i * 0.008,
      -12,
      0,
      () => {
        finished++;
      },
    ),
  );
  if (cancel) graphs.forEach((graph) => graph.stop());
  const buffer = await context.startRendering();
  const samples = buffer.getChannelData(0);
  let peak = 0,
    energy = 0,
    tail = 0,
    onset = 0,
    delta = 0;
  for (let i = 0; i < samples.length; i++) {
    require(Number.isFinite(samples[i]), "Nonfinite curated output");
    peak = Math.max(peak, Math.abs(samples[i]));
    energy += samples[i] ** 2;
    if (i < rate * 0.05) onset = Math.max(onset, Math.abs(samples[i]));
    if (i > rate * 1.5) tail = Math.max(tail, Math.abs(samples[i]));
    if (i) delta = Math.max(delta, Math.abs(samples[i] - samples[i - 1]));
  }
  await waitForCleanup(() => finished === count);
  return { peak, energy, onset, tail, delta, finished };
}
Object.assign(globalThis, { curatedSignal });
