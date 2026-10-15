import { probeReflection as referenceReflection } from "../../catalog/experiences/echo-probe/baseline";
import {
  benchDefaults,
  renderProbeComparison,
} from "../../catalog/experiences/echo-probe/bench";
import {
  echoProbe,
  probeReflection,
  probeDiffusion,
} from "../../catalog/experiences/echo-probe/recipe";
import { compile } from "../../packages/audiobits/src/compiler/plan";
import { createGraph } from "../../packages/audiobits/src/compiler/graph";
import { createAudio } from "audiobits";
import { createEchoProbe } from "../../catalog/experiences/echo-probe/controller";
import { thruster } from "../../catalog/recipes/thruster/recipe";

/** Native acoustic bench used before presentation work and for regression evidence. */
async function probeSignal(
  kind: "emission" | "reflection" | "reference-reflection" | "diffusion",
  surface = 0.5,
  pan = 0,
  gainDb = 0,
  seed = 42,
  count = 1,
  rate = 48000,
) {
  const recipe =
    kind === "emission"
      ? echoProbe
      : kind === "reference-reflection"
        ? referenceReflection
        : kind === "reflection"
          ? probeReflection
          : probeDiffusion;
  const context = new OfflineAudioContext(2, rate, rate);
  const master = context.createGain();
  master.gain.value = 10 ** (-12 / 20);
  master.connect(context.destination);
  for (let index = 0; index < count; index++)
    createGraph(
      context,
      master,
      compile(recipe, kind === "emission" ? {} : { surface }, seed),
      0.02,
      gainDb,
      pan,
      () => {},
    );
  const buffer = await context.startRendering();
  let peak = 0,
    energy = 0,
    left = 0,
    right = 0,
    slope = 0,
    tail = 0,
    onset = -1;
  const a = buffer.getChannelData(0),
    b = buffer.getChannelData(1);
  for (let index = 0; index < a.length; index++) {
    if (!Number.isFinite(a[index]) || !Number.isFinite(b[index]))
      throw new Error("Nonfinite Echo Probe sample");
    const power = a[index] ** 2 + b[index] ** 2;
    peak = Math.max(peak, Math.abs(a[index]), Math.abs(b[index]));
    energy += power;
    left += a[index] ** 2;
    right += b[index] ** 2;
    if (index)
      slope += (a[index] - a[index - 1]) ** 2 + (b[index] - b[index - 1]) ** 2;
    if (index > rate * 0.8)
      tail = Math.max(tail, Math.abs(a[index]), Math.abs(b[index]));
    if (onset < 0 && power > 1e-12) onset = index / rate;
  }
  return { peak, energy, left, right, brightness: slope / energy, tail, onset };
}
async function probeResources() {
  const audio = createAudio({ maxVoices: 32, maxVoicesPerSound: 16 });
  const probe = createEchoProbe(audio);
  const otherSound = audio.sound(thruster);
  await audio.start();
  const other = otherSound.play({ gainDb: -60 });
  let maximum = 0;
  const walls = Array.from({ length: 6 }, (_, index) => ({
    distance: index / 5,
    pan: index / 2.5 - 1,
    intensity: 1,
    surface: index / 5,
  }));
  for (let index = 0; index < 100; index++) {
    const emission = probe.emit(walls, { seed: index });
    if (!emission)
      throw new Error("Burst was incorrectly rejected after cleanup");
    maximum = Math.max(maximum, audio.counts.active);
    probe.stop();
    await emission.ended;
    if (audio.counts.active !== 1 || probe.active !== 0)
      throw new Error("Cancelled returns retained resources");
  }
  probe.emit(walls);
  probe.dispose();
  if (other.state !== "active" || audio.counts.active !== 1)
    throw new Error("Controller disposal touched shared audio");
  otherSound.dispose();
  await audio.dispose();
  return { maximum, emissions: 100, counts: audio.counts, state: audio.state };
}
Object.assign(globalThis, { probeSignal, probeResources });

async function probeComparisons() {
  const render = (changes: Partial<typeof benchDefaults>) =>
    renderProbeComparison({
      ...benchDefaults,
      matchLevel: false,
      space: "none",
      ...changes,
    });
  const baseline = await render({ composition: "baseline" });
  const pulse = await render({ composition: "pulse" });
  const hybrid = await render({ composition: "hybrid" });
  const delay = await render({ composition: "delay" });
  const resynthesis = await render({
    composition: "resynthesis",
    space: "cluster",
  });
  const replay = await render({ composition: "hybrid" });
  const variation = await render({ composition: "hybrid", seed: 99 });
  const near = await render({ distance: 0.1 });
  const far = await render({ distance: 0.9 });
  const felt = await render({ surface: 0 });
  const glass = await render({ surface: 1 });
  const left = await render({ pan: -0.9 });
  const right = await render({ pan: 0.9 });
  const weak = await render({ intensity: 0.2 });
  const cluster = await render({ space: "cluster" });
  const wash = await render({ space: "noise" });
  const metrics = Object.fromEntries(
    Object.entries({
      baseline,
      pulse,
      hybrid,
      delay,
      resynthesis,
      replay,
      variation,
      near,
      far,
      felt,
      glass,
      left,
      right,
      weak,
      cluster,
      wash,
    }).map(([name, result]) => [name, result.metrics]),
  );
  function correlation(a: AudioBuffer, b: AudioBuffer, lag = 0) {
    let ab = 0,
      aa = 0,
      bb = 0;
    for (let ch = 0; ch < 2; ch++) {
      const x = a.getChannelData(ch),
        y = b.getChannelData(ch);
      for (
        let i = Math.round(0.42 * a.sampleRate);
        i < Math.round(0.65 * a.sampleRate);
        i++
      ) {
        ab += x[i] * y[i + lag];
        aa += x[i] ** 2;
        bb += y[i + lag] ** 2;
      }
    }
    return ab / Math.sqrt(aa * bb);
  }
  // A real delay must preserve the actual captured signal, including oscillator
  // phase. Compare it to a shifted buffer through identical material filters.
  const emissionOnly = await render({ intensity: 0 });
  const reference = new OfflineAudioContext(2, 96000, 48000);
  const source = reference.createBufferSource();
  const mono = reference.createBuffer(1, 96000, 48000);
  const captured = emissionOnly.buffer.getChannelData(0);
  for (let i = 0; i < captured.length; i++)
    mono.getChannelData(0)[i] = captured[i] * Math.SQRT2;
  source.buffer = mono;
  let output: AudioNode = source;
  for (const effect of compile(
    probeReflection,
    { surface: benchDefaults.surface, distance: benchDefaults.distance },
    42,
  ).effects) {
    const filter = reference.createBiquadFilter();
    filter.type = effect.filter;
    filter.frequency.value = effect.frequency as number;
    filter.Q.value = effect.q;
    output.connect(filter);
    output = filter;
  }
  const level = reference.createGain(),
    panner = reference.createStereoPanner();
  level.gain.value =
    10 ** ((hybrid.plans.find((p) => p.role === "early")!.gainDb + 2.4) / 20);
  panner.pan.value = benchDefaults.pan;
  output.connect(level).connect(panner).connect(reference.destination);
  source.start(hybrid.plans.find((p) => p.role === "early")!.at - 0.012);
  const capturedReturn = await reference.startRendering();
  const matched = await render({ composition: "hybrid", matchLevel: true });
  const matchedResynthesis = await render({
    composition: "resynthesis",
    space: "cluster",
    matchLevel: true,
  });
  const matchedHybrid = await render({ space: "cluster", matchLevel: true });
  let earlyDifference = 0;
  const firstGrainAt = cluster.plans.find((plan) => plan.role === "late")!.at;
  for (let channel = 0; channel < 2; channel++) {
    const a = cluster.buffer.getChannelData(channel),
      b = resynthesis.buffer.getChannelData(channel);
    for (let i = 0; i < Math.floor(firstGrainAt * 48000); i++)
      earlyDifference = Math.max(earlyDifference, Math.abs(a[i] - b[i]));
  }
  return {
    earlyDifference,
    matchedClusterEnergies: [matchedResynthesis, matchedHybrid].map(
      (result) => result.metrics.returnEnergy * result.metrics.scale ** 2,
    ),
    metrics,
    matchedEnergy: matched.metrics.returnEnergy * matched.metrics.scale ** 2,
    coherence: {
      delay: correlation(capturedReturn, delay.buffer),
      resynthesis: correlation(hybrid.buffer, delay.buffer),
      baseline: correlation(hybrid.buffer, baseline.buffer),
      replay: correlation(hybrid.buffer, replay.buffer),
      variation: correlation(hybrid.buffer, variation.buffer),
    },
    clusterTimes: cluster.plans
      .filter((p) => p.role === "late")
      .map((p) => p.at),
    earlyAt: cluster.plans.find((p) => p.role === "early")!.at,
  };
}

async function probeRapid() {
  const audio = createAudio({ maxVoices: 32, maxVoicesPerSound: 16 });
  const control = createEchoProbe(audio);
  await audio.start();
  const walls = Array.from({ length: 6 }, (_, i) => ({
    distance: 0.4 + i * 0.1,
    surface: i / 5,
    intensity: 1,
    pan: i / 2.5 - 1,
  }));
  let maximum = 0,
    maximumSources = 0,
    accepted = 0,
    groups = 0;
  let last: ReturnType<typeof control.emit>;
  const context = audio.native.context;
  const meter = context.createAnalyser();
  const detach = audio.native.connect(meter);
  const samples = new Float32Array(meter.fftSize);
  let peak = 0;
  for (let i = 0; i < 40; i++) {
    const at = context.currentTime;
    last = control.emit(walls, { seed: 42 + i });
    if (last) accepted++;
    maximum = Math.max(maximum, audio.counts.active);
    const native = (
      globalThis as unknown as {
        thrusterProbe?: { sources: unknown[]; ended: number };
      }
    ).thrusterProbe;
    if (native)
      maximumSources = Math.max(
        maximumSources,
        native.sources.length - native.ended,
      );
    groups = Math.max(groups, control.active);
    // Wait for a specified audio-clock invariant, not a wall-clock timeout.
    await new Promise<void>((done) => {
      function check() {
        meter.getFloatTimeDomainData(samples);
        for (const sample of samples) {
          if (!Number.isFinite(sample))
            throw new Error("Nonfinite rapid sample");
          peak = Math.max(peak, Math.abs(sample));
        }
        if (context.currentTime >= at + 0.12) done();
        else requestAnimationFrame(check);
      }
      check();
    });
  }
  control.stop();
  await last!.ended;
  const afterStop = audio.counts;
  control.dispose();
  detach();
  meter.disconnect();
  await audio.dispose();
  return {
    maximum,
    maximumSources,
    accepted,
    groups,
    peak,
    afterStop,
    final: audio.counts,
  };
}
Object.assign(globalThis, {
  probeComparisons,
  probeRapid,
  renderProbeComparison,
});

/** Observe this stage's actual canvas draws and native pending-source cancellation. */
function installProbeVisualProbe() {
  const surface = document.querySelector<HTMLElement>(".echo-probe-stage")!;
  const canvas = surface.querySelector("canvas")!;
  const paint = canvas.getContext("2d")!;
  const clock = () =>
    (globalThis as unknown as { thrusterProbe: { contexts: AudioContext[] } })
      .thrusterProbe.contexts[0]?.currentTime ?? 0;
  type Point = readonly [number, number];
  const frames: {
    at: number;
    paths: { from: Point; to: Point }[];
    lights: Record<string, boolean>;
  }[] = [];
  const sources: { at: number; cancelledAt: number | null }[] = [];
  const records = new WeakMap<
    AudioScheduledSourceNode,
    (typeof sources)[number]
  >();
  const oscillatorStart = OscillatorNode.prototype.start;
  const bufferStart = AudioBufferSourceNode.prototype.start;
  const sourceStop = AudioScheduledSourceNode.prototype.stop;
  function record(source: AudioScheduledSourceNode, at: number) {
    const entry = { at, cancelledAt: null };
    records.set(source, entry);
    sources.push(entry);
  }
  OscillatorNode.prototype.start = function (at = 0) {
    record(this, at);
    oscillatorStart.call(this, at);
  };
  AudioBufferSourceNode.prototype.start = function (
    at = 0,
    offset = 0,
    duration?: number,
  ) {
    record(this, at);
    if (duration === undefined) bufferStart.call(this, at, offset);
    else bufferStart.call(this, at, offset, duration);
  };
  AudioScheduledSourceNode.prototype.stop = function (at = clock()) {
    const entry = records.get(this);
    if (entry && at < entry.at && entry.cancelledAt === null)
      entry.cancelledAt = clock();
    sourceStop.call(this, at);
  };
  let frame: (typeof frames)[number] | undefined;
  let from: Point | undefined,
    to: Point | undefined,
    lines = 0;
  const clear = paint.clearRect.bind(paint),
    begin = paint.beginPath.bind(paint),
    move = paint.moveTo.bind(paint),
    line = paint.lineTo.bind(paint),
    stroke = paint.stroke.bind(paint),
    text = paint.fillText.bind(paint);
  const previous = paint.fillStyle;
  paint.fillStyle = getComputedStyle(surface).getPropertyValue("--mute").trim();
  const muted = paint.fillStyle;
  paint.fillStyle = previous;
  paint.clearRect = (...args) => {
    frame = { at: clock(), paths: [], lights: {} };
    frames.push(frame);
    clear(...args);
  };
  paint.beginPath = () => {
    from = to = undefined;
    lines = 0;
    begin();
  };
  paint.moveTo = (x, y) => {
    from = [x, y];
    move(x, y);
  };
  paint.lineTo = (x, y) => {
    to = [x, y];
    lines++;
    line(x, y);
  };
  paint.stroke = () => {
    if (frame && lines === 1 && from && to) frame.paths.push({ from, to });
    stroke();
  };
  paint.fillText = (label, x, y, maxWidth?) => {
    if (frame) frame.lights[label] = paint.fillStyle !== muted;
    if (maxWidth === undefined) text(label, x, y);
    else text(label, x, y, maxWidth);
  };
  return { frames, sources };
}
Object.assign(globalThis, { installProbeVisualProbe });

// Exercise cancellation while a grain is sounding, before its delayed copy.
async function probeLateCancellation() {
  const audio = createAudio({ maxVoices: 32, maxVoicesPerSound: 16 });
  const control = createEchoProbe(audio);
  await audio.start();
  const context = audio.native.context;
  const delays: { disconnected: boolean }[] = [];
  const createDelay = context.createDelay.bind(context);
  context.createDelay = (...args) => {
    const delay = createDelay(...args);
    const record = { disconnected: false };
    delays.push(record);
    const disconnect = delay.disconnect.bind(delay);
    delay.disconnect = () => {
      record.disconnected = true;
      disconnect();
    };
    return delay;
  };
  const otherSound = audio.sound(thruster);
  const other = otherSound.play({ gainDb: -60 });
  const first = control.emit([
    { distance: 0, pan: -0.7, intensity: 1, surface: 1 },
  ])!;
  await new Promise<void>((done) => {
    const wait = () => {
      // The first grain starts 110-137 ms after the surface response; its
      // first copy starts at least 41 ms later. Observe the grain in between.
      if (context.currentTime >= first.reflections[0].at + 0.14) done();
      else requestAnimationFrame(wait);
    };
    wait();
  });
  const before = delays.filter((delay) => !delay.disconnected).length;
  const second = control.emit([])!;
  const cutOnNewEmission = delays.every((delay) => delay.disconnected);
  const earlyNotRetired = first.cancelledAt === null;
  control.stop();
  await Promise.all([first.ended, second.ended]);
  const remaining = audio.counts.active;
  const otherUnaffected = other.state === "active";
  control.dispose();
  otherSound.dispose();
  await audio.dispose();
  return {
    before,
    cutOnNewEmission,
    earlyNotRetired,
    remaining,
    otherUnaffected,
    final: audio.counts,
  };
}
Object.assign(globalThis, { probeLateCancellation });

async function probeGrainCopies() {
  const render = async (wet: boolean) => {
    const context = new OfflineAudioContext(2, 48000, 48000);
    const graph = createGraph(
      context,
      context.destination,
      compile(
        {
          ...probeDiffusion,
          effects: probeDiffusion.effects.filter(
            (effect) => wet || effect.type !== "delay",
          ),
        },
        { distance: 0, surface: 0.7 },
        42,
      ),
      0.02,
      -12,
      -0.6,
      () => {},
    );
    const buffer = await context.startRendering();
    graph.finish();
    return buffer;
  };
  const dry = await render(false),
    wet = await render(true);
  const lag = Math.round(0.041 * 48000);
  let error = 0,
    copyEnergy = 0,
    tail = 0;
  for (let channel = 0; channel < 2; channel++) {
    const a = dry.getChannelData(channel),
      b = wet.getChannelData(channel);
    for (let i = 0; i < a.length; i++) {
      if (!Number.isFinite(b[i])) throw new Error("Nonfinite late copy");
      const copy = i >= lag ? a[i - lag] * 0.22 : 0;
      error = Math.max(error, Math.abs(b[i] - (a[i] * 0.78 + copy)));
      copyEnergy += copy ** 2;
      if (i >= 48000 * 0.5) tail = Math.max(tail, Math.abs(b[i]));
    }
  }
  return { error, copyEnergy, tail };
}
Object.assign(globalThis, { probeGrainCopies });
