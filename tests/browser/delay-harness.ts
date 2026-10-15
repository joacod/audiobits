import { defineSound, type Recipe } from "../../packages/audiobits/src/index";
import { compile } from "../../packages/audiobits/src/compiler/plan";
import { createGraph } from "../../packages/audiobits/src/compiler/graph";
import { createEngine } from "../../packages/audiobits/src/runtime/engine";

const pulse = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.01,
  layers: [
    {
      id: "pulse",
      source: { type: "oscillator", waveform: "sine", frequency: 1000 },
      gainDb: -18,
      envelope: { attack: 0.002, decay: 0, sustain: 1, release: 0.005 },
    },
  ],
});
function require(value: boolean, message: string): void {
  if (!value) throw new Error(message);
}
function meter(data: Float32Array, from = 0, to = data.length) {
  let peak = 0,
    energy = 0;
  for (let i = from; i < to; i++) {
    require(Number.isFinite(data[i]), "Nonfinite delay output");
    peak = Math.max(peak, Math.abs(data[i]));
    energy += data[i] ** 2;
  }
  return { peak, energy };
}
async function render(
  recipe: Recipe,
  rate: number,
  seconds = 1.5,
  action?: "stop" | "cut" | "cancel" | "tail-stop" | "tail-cut",
) {
  const context = new OfflineAudioContext(1, Math.ceil(rate * seconds), rate);
  let finish!: () => void;
  const ended = new Promise<void>((resolve) => {
    finish = resolve;
  });
  let finished = false;
  const plan = compile(recipe);
  const graph = createGraph(
    context,
    context.destination,
    plan,
    action === "cancel" ? 0.05 : 0,
    0,
    0,
    () => {
      finished = true;
      finish();
    },
  );
  let stoppedAt = 0;
  let checkpoint: Promise<void> | undefined;
  if (action === "cancel") graph.stop();
  else if (action)
    checkpoint = context
      .suspend(action.startsWith("tail-") ? 0.12 : 0.04)
      .then(async () => {
        stoppedAt = context.currentTime;
        require(!finished, "Voice ended before its delay tail");
        graph.stop(action.endsWith("cut") ? 0.005 : undefined);
        graph.stop(action.endsWith("cut") ? 0.005 : undefined);
        await context.resume();
      });
  const rendered = await context.startRendering();
  await checkpoint;
  await ended;
  return {
    data: rendered.getChannelData(0),
    lifetime: plan.lifetime,
    stoppedAt,
    finished,
  };
}
function difference(a: Float32Array, b: Float32Array) {
  let peak = 0;
  for (let i = 0; i < a.length; i++)
    peak = Math.max(peak, Math.abs(a[i] - b[i]));
  return peak;
}
async function rawPulse(rate: number, seconds: number, duration = 0.01) {
  const context = new OfflineAudioContext(1, Math.ceil(rate * seconds), rate);
  const source = context.createOscillator();
  source.frequency.value = 1000;
  const envelope = context.createGain();
  const level = 10 ** (-18 / 20);
  envelope.gain.setValueAtTime(0, 0);
  envelope.gain.linearRampToValueAtTime(level, 0.002);
  envelope.gain.setValueAtTime(level, duration);
  envelope.gain.linearRampToValueAtTime(0, duration + 0.005);
  const panner = context.createStereoPanner();
  source.connect(envelope).connect(panner).connect(context.destination);
  source.start();
  source.stop(duration + 0.005);
  return (await context.startRendering()).getChannelData(0);
}
function echoes(
  input: Float32Array,
  rate: number,
  time: number,
  feedback: number,
  mix: number,
) {
  const output = new Float32Array(input.length);
  const offset = Math.round(time * rate);
  for (let i = 0; i < output.length; i++) {
    output[i] = (1 - mix) * input[i];
    for (let repeat = 1; repeat * offset <= i; repeat++)
      output[i] += mix * feedback ** (repeat - 1) * input[i - repeat * offset];
  }
  return output;
}
async function signal(rate: number) {
  const dry = await render(pulse, rate);
  const cases = [];
  for (const feedback of [0, 0.5, 0.8]) {
    for (const mix of [0, 0.25, 1]) {
      const effect = { type: "delay", time: 0.08, feedback, mix } as const;
      const wet = await render({ ...pulse, effects: [effect] }, rate, 3);
      const baseline =
        mix === 0 ? new Float32Array(wet.data.length) : await rawPulse(rate, 3);
      if (mix === 0) baseline.set(dry.data);
      const expected = echoes(baseline, rate, effect.time, feedback, mix);
      // Independent expected impulse response, including the documented cutoff.
      if (mix > 0)
        for (let i = 0; i < expected.length; i++)
          expected[i] *= Math.max(
            0,
            Math.min(1, (wet.lifetime - i / rate) / 0.05),
          );
      const error = difference(wet.data, expected);
      require(error <
        1e-6, `Delay response mismatch ${feedback}/${mix}: ${error}`);
      require(meter(wet.data, Math.ceil(wet.lifetime * rate)).peak ===
        0, "Output survived tail deadline");
      const layer = await render(
        { ...pulse, layers: [{ ...pulse.layers[0], effects: [effect] }] },
        rate,
        3,
      );
      require(difference(layer.data, wet.data) <
        1e-6, "Layer echo was gated by source envelope");
      cases.push({
        feedback,
        mix,
        error,
        lifetime: wet.lifetime,
        ...meter(wet.data),
      });
    }
  }
  const serial = await render(
    {
      ...pulse,
      effects: [{ type: "delay", time: 0.08, mix: 1 }],
      layers: [
        {
          ...pulse.layers[0],
          effects: [{ type: "delay", time: 0.04, mix: 1 }],
        },
      ],
    },
    rate,
  );
  require(difference(
    serial.data,
    echoes(await rawPulse(rate, 1.5), rate, 0.12, 0, 1),
  ) < 1e-6, "Layer/root delays did not compose serially");
  const twoLayers = await render(
    {
      ...pulse,
      layers: [
        pulse.layers[0],
        {
          ...pulse.layers[0],
          id: "echo",
          effects: [{ type: "delay", time: 0.08, mix: 1 }],
        },
      ],
    },
    rate,
  );
  const raw = await rawPulse(rate, 1.5);
  const expectedLayers = echoes(raw, rate, 0.08, 0, 1).map(
    (value, index) => value + raw[index],
  );
  require(difference(twoLayers.data, expectedLayers) <
    1e-6, "Layer delay affected another layer");
  const cancelled = await render(
    { ...pulse, effects: [{ type: "delay", time: 0.1, feedback: 0.5 }] },
    rate,
    1.5,
    "cancel",
  );
  require(meter(cancelled.data).peak === 0, "Cancelled delay became audible");
  return cases;
}
async function release() {
  const rate = 48000;
  const effect = { type: "delay", time: 0.1, feedback: 0.5, mix: 1 } as const;
  const sustained: Recipe = {
    schemaVersion: 1,
    kind: "sustained",
    layers: pulse.layers,
    effects: [effect],
  };
  const allow = await render(sustained, rate, 1.5, "stop");
  const cut = await render(sustained, rate, 1.5, "tail-cut");
  const tail = await render(
    { ...pulse, effects: [effect] },
    rate,
    1.5,
    "tail-stop",
  );
  require(meter(allow.data, rate * 0.1, rate * 0.15).energy >
    0.01, "Normal stop discarded first echo");
  require(meter(allow.data, rate * 0.2, rate * 0.25).energy >
    0.001, "Normal stop discarded feedback");
  require(meter(cut.data, rate * 0.1, rate * 0.12).energy >
    0.01, "Cut fixture had no audible tail");
  require(meter(cut.data, Math.ceil((cut.stoppedAt + 0.005) * rate)).peak ===
    0, "Cut retained tail");
  require(meter(tail.data, rate * 0.2, rate * 0.22).energy >
    0.001, "Stop in tail discarded echoes");
  return {
    allow: meter(allow.data),
    cut: meter(cut.data),
    tail: meter(tail.data),
  };
}
async function ordering() {
  const rate = 48000;
  const delay = { type: "delay", time: 0.1, mix: 1 } as const;
  const filter = {
    type: "filter",
    filter: "lowpass",
    q: 0.7,
    frequency: {
      points: [
        [0, 10000],
        [0.12, 200],
      ],
      curve: "exponential",
    },
  } as const;
  const recipe = { ...pulse, duration: 0.15 };
  const before = await render({ ...recipe, effects: [filter, delay] }, rate);
  const after = await render({ ...recipe, effects: [delay, filter] }, rate);
  require(difference(before.data, after.data) >
    0.01, "Effect ordering was lost");
  // Independent reference: delay the dry samples first, then automate a native filter.
  const dry = await rawPulse(rate, 1.5, 0.15);
  const context = new OfflineAudioContext(1, dry.length, rate);
  const buffer = context.createBuffer(1, dry.length, rate);
  buffer.copyToChannel(echoes(dry, rate, 0.1, 0, 1), 0);
  const source = context.createBufferSource();
  source.buffer = buffer;
  const native = context.createBiquadFilter();
  native.type = "lowpass";
  native.Q.value = 0.7;
  native.frequency.setValueAtTime(10000, 0);
  native.frequency.exponentialRampToValueAtTime(200, 0.12);
  source.connect(native).connect(context.destination);
  source.start();
  const reference = await context.startRendering();
  require(difference(after.data, reference.getChannelData(0)) <
    1e-6, "Ordered filter/delay differs from native reference");
  return {
    orderDifference: difference(before.data, after.data),
    referenceError: difference(after.data, reference.getChannelData(0)),
  };
}
async function lifecycle() {
  const context = new AudioContext();
  const owned = new Set<AudioNode>();
  const counts: Record<string, number> = {};
  const capacities: number[] = [];
  for (const name of [
    "createGain",
    "createOscillator",
    "createConstantSource",
    "createDelay",
    "createStereoPanner",
    "createBiquadFilter",
  ] as const) {
    const native = context[name].bind(context);
    Object.assign(context, {
      [name]: (...args: [number?]) => {
        const node = native(...args);
        owned.add(node);
        counts[name] = (counts[name] ?? 0) + 1;
        if (name === "createDelay") capacities.push(args[0]!);
        const disconnect = node.disconnect.bind(node);
        node.disconnect = () => {
          owned.delete(node);
          disconnect();
        };
        return node;
      },
    });
  }
  const audio = createEngine(
    { maxVoices: 4, maxVoicesPerSound: 4 },
    () => context,
  );
  await audio.start();
  const recipe = {
    ...pulse,
    effects: [{ type: "delay", time: 0.08, feedback: 0.5, mix: 0.25 }],
  } as const;
  const sound = audio.sound(recipe);
  const first = sound.play();
  const perVoice = owned.size - 2;
  const firstCounts = { ...counts };
  await first.ended;
  require(owned.size === 2, "Natural tail did not disconnect all nodes");
  const future = sound.play({ at: context.currentTime + 1 });
  future.stop();
  await future.ended;
  require(owned.size === 2, "Cancelled onset retained delay resources");
  let maxNodes = 0;
  const timing: number[] = [];
  for (let i = 0; i < 1000; i++) {
    const started = performance.now();
    const voice = sound.play();
    voice.stop();
    timing.push(performance.now() - started);
    maxNodes = Math.max(maxNodes, owned.size);
    require(audio.counts.active <= 4 &&
      audio.counts.retiring <= 1, "Delay tails escaped voice budget");
    require(owned.size <= 2 + 5 * perVoice, "Delay nodes escaped voice budget");
  }
  audio.stopAll({ tails: "cut" });
  await audio.suspend();
  require(owned.size === 2 &&
    audio.counts.active === 0 &&
    audio.counts.retiring === 0, "Suspension retained tails");
  await audio.start();
  const sustained = audio
    .sound({
      schemaVersion: 1,
      kind: "sustained",
      layers: pulse.layers,
      effects: recipe.effects,
    })
    .play();
  audio.stopAll({ tails: "cut" });
  await sustained.ended;
  require(owned.size === 2, "Cut did not finalize on native clock");
  sound.play();
  await audio.dispose();
  require(owned.size === 0 &&
    context.state === "closed", "Disposal retained resources");
  timing.sort((a, b) => a - b);
  return {
    perVoice,
    firstCounts,
    maxNodes,
    finalNodes: owned.size,
    voices: audio.counts,
    delayCapacitySeconds: capacities[0] + capacities[1],
    estimatedDelaySampleBytes:
      Math.ceil((capacities[0] + capacities[1]) * context.sampleRate) * 4,
    p50Ms: timing[500],
    p95Ms: timing[950],
    maxMs: timing[999],
  };
}
async function boundaries() {
  const rate = 48000;
  const short = await render(
    {
      ...pulse,
      effects: [{ type: "delay", time: 0.01, feedback: 0.8, mix: 1 }],
    },
    rate,
  );
  const maximum = await render(
    { ...pulse, effects: [{ type: "delay", time: 2, feedback: 0.8, mix: 1 }] },
    rate,
    31,
  );
  require(Math.abs(maximum.lifetime - 30.065) <
    1e-8, "Maximum tail exceeded policy");
  require(meter(maximum.data, 30 * rate, 30.015 * rate).energy >
    0, "Long delay lost final repeat");
  require(meter(maximum.data, Math.ceil(maximum.lifetime * rate)).peak ===
    0, "Maximum tail survived cutoff");
  const lowRate = await render(
    {
      ...pulse,
      effects: [{ type: "delay", time: 256 / 8000, feedback: 0.5, mix: 1 }],
    },
    8000,
  );
  const expected = echoes(await rawPulse(8000, 1.5), 8000, 256 / 8000, 0.5, 1);
  for (let i = 0; i < expected.length; i++)
    expected[i] *= Math.max(
      0,
      Math.min(1, (lowRate.lifetime - i / 8000) / 0.05),
    );
  require(difference(lowRate.data, expected) <
    1e-6, "Minimum feedback time did not match repeat spacing");
  const context = new OfflineAudioContext(1, rate * 2, rate);
  const master = context.createGain();
  master.gain.value = 10 ** (-12 / 20);
  master.connect(context.destination);
  let finished = 0;
  const plan = compile({
    ...pulse,
    effects: [{ type: "delay", time: 0.08, feedback: 0.5, mix: 0.25 }],
  });
  let resolve!: () => void;
  const ended = new Promise<void>((done) => {
    resolve = done;
  });
  for (let i = 0; i < 8; i++)
    createGraph(context, master, plan, 0, 0, 0, () => {
      if (++finished === 8) resolve();
    });
  const overlap = meter((await context.startRendering()).getChannelData(0));
  await ended;
  require(overlap.peak > 0 &&
    overlap.peak < 1, "Eight-voice delay output lost headroom");
  return {
    short: meter(short.data),
    maximum: meter(maximum.data),
    maximumLifetime: maximum.lifetime,
    lowRateError: difference(lowRate.data, expected),
    overlap,
  };
}
export const delayChecks = { signal, release, ordering, lifecycle, boundaries };
Object.assign(globalThis, { delayChecks });
