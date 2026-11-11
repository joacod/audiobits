import { defineSound } from "../../packages/audiobits/src/index";
import { compile } from "../../packages/audiobits/src/compiler/plan";
import { createGraph } from "../../packages/audiobits/src/compiler/graph";

const rate = 48000;
const at = 0.025;
const gate = 0.16;
const attack = 0.004;
const release = 0.02;
const gain = 10 ** (-24 / 20);

async function render(
  offset: number | undefined,
  tail: boolean,
  stop?: number,
  live = false,
  reference = false,
) {
  const context = new OfflineAudioContext(1, rate, rate);
  const onset = at + (offset ?? 0);
  const recipe = defineSound({
    schemaVersion: 1,
    kind: "one-shot",
    duration: gate,
    parameters: {
      intensity: { min: 0, max: 1, default: 0, mode: "live", smoothing: 0.02 },
    },
    layers: [
      {
        id: "late",
        ...(offset === undefined ? {} : { startOffset: offset }),
        source: {
          type: "oscillator",
          waveform: "sine",
          frequency: live
            ? { control: "intensity", range: [220, 660], scale: "linear" }
            : {
                points: [
                  [0, 880],
                  [0.035, 220],
                ],
                curve: "linear",
              },
        },
        gainDb: live
          ? { control: "intensity", range: [-24, -6], scale: "linear" }
          : -24,
        envelope: { attack, decay: 0.012, sustain: 0.5, release },
        effects: [
          {
            type: "filter",
            filter: "lowpass",
            frequency: {
              points: [
                [0, 8000],
                [0.05, 400],
              ],
              curve: "linear",
            },
            q: 0.7,
          },
        ],
      },
    ],
    effects: [
      {
        type: "filter",
        filter: "lowpass",
        frequency: {
          points: [
            [0, 5000],
            [0.08, 1200],
          ],
          curve: "linear",
        },
        q: 0.7,
      },
      ...(tail
        ? [{ type: "delay", time: 0.04, feedback: 0, mix: 0.4 } as const]
        : []),
    ],
  });
  let finished = 0;
  let graph: ReturnType<typeof createGraph> | undefined;
  if (!reference) {
    graph = createGraph(
      context,
      context.destination,
      compile(recipe),
      at,
      0,
      0,
      () => {
        finished++;
      },
    );
    if (stop !== undefined) graph.stop(undefined, stop);
  } else {
    // Independently authored native graph, including layer and root time origins.
    const source = context.createOscillator();
    source.type = "sine";
    source.frequency.setValueAtTime(live ? 220 : 880, onset);
    source.frequency.linearRampToValueAtTime(
      live ? 396 : 220,
      onset + (live ? 0.02 : 0.035),
    );
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 0.7;
    filter.frequency.setValueAtTime(8000, onset);
    filter.frequency.linearRampToValueAtTime(400, onset + 0.05);
    const envelope = context.createGain();
    const level = live ? 1 : gain;
    envelope.gain.setValueAtTime(0, onset);
    if (stop !== undefined && stop <= onset) {
      envelope.gain.cancelScheduledValues(0);
      envelope.gain.setValueAtTime(0, 0);
    } else if (stop !== undefined) {
      // This reference stop falls halfway through the 4 ms attack.
      envelope.gain.linearRampToValueAtTime(
        (level * (stop - onset)) / attack,
        stop,
      );
      envelope.gain.linearRampToValueAtTime(0, stop + release);
    } else {
      envelope.gain.linearRampToValueAtTime(level, onset + attack);
      envelope.gain.linearRampToValueAtTime(
        level * 0.5,
        onset + attack + 0.012,
      );
      envelope.gain.setValueAtTime(level * 0.5, at + gate);
      envelope.gain.linearRampToValueAtTime(0, at + gate + release);
    }
    source.connect(filter).connect(envelope);
    const dynamic = context.createGain();
    dynamic.gain.setValueAtTime(live ? gain : 1, onset);
    if (live)
      dynamic.gain.linearRampToValueAtTime(10 ** (-16.8 / 20), onset + 0.02);
    const root = context.createBiquadFilter();
    root.type = "lowpass";
    root.Q.value = 0.7;
    root.frequency.setValueAtTime(5000, at);
    root.frequency.linearRampToValueAtTime(1200, at + 0.08);
    envelope.connect(dynamic).connect(root);
    const output = context.createGain();
    if (tail) {
      const dry = context.createGain();
      const wet = context.createGain();
      const delay = context.createDelay(0.04);
      delay.delayTime.value = 0.04;
      delay.channelCount = 1;
      delay.channelCountMode = "explicit";
      dry.gain.value = 0.6;
      wet.gain.value = 0.4;
      root.connect(dry).connect(output);
      root.connect(delay).connect(wet).connect(output);
    } else root.connect(output);
    const end = (stop ?? at + gate) + release + (tail ? 0.19 : 0.05);
    const fade = tail ? 0.05 : 0.005;
    output.gain.setValueAtTime(
      1,
      stop !== undefined && !tail ? stop : end - fade,
    );
    output.gain.linearRampToValueAtTime(0, end);
    const pan = context.createStereoPanner();
    output.connect(pan).connect(context.destination);
    source.start(onset);
    source.stop(
      stop !== undefined && stop <= onset
        ? stop
        : (stop ?? at + gate) + release,
    );
  }
  let checkpoint: Promise<void> | undefined;
  if (live && graph)
    checkpoint = context.suspend(0.04).then(async () => {
      graph!.set({ intensity: 0.9 });
      graph!.set({ intensity: 0.4 });
      await context.resume();
    });
  const data = (await context.startRendering()).getChannelData(0);
  await checkpoint;
  if (graph) {
    // Ended callbacks are asynchronous after offline rendering completes.
    const deadline = performance.now() + 1000;
    while (finished === 0 && performance.now() < deadline)
      await new Promise((resolve) => setTimeout(resolve, 10));
    if (finished !== 1)
      throw new Error("Delayed graph did not finalize exactly once");
  }
  return data;
}
function difference(a: Float32Array, b: Float32Array) {
  let peak = 0;
  for (let i = 0; i < a.length; i++) {
    if (!Number.isFinite(a[i])) throw new Error("Nonfinite delayed output");
    peak = Math.max(peak, Math.abs(a[i] - b[i]));
  }
  return peak;
}
async function timing() {
  const errors = [];
  for (const tail of [false, true]) {
    const omitted = await render(undefined, tail);
    const zero = await render(0, tail);
    if (difference(omitted, zero) !== 0)
      throw new Error("Explicit zero changed playback");
    const offset = 0.045;
    for (const stop of [
      undefined,
      at + offset - 0.005,
      at + offset,
      at + offset + attack / 2,
    ]) {
      const actual = await render(offset, tail, stop);
      const expected = await render(offset, tail, stop, false, true);
      const error = difference(actual, expected);
      if (error > 2e-6)
        throw new Error(`Offset reference mismatch ${tail}/${stop}: ${error}`);
      if (
        !actual
          .slice(0, Math.floor((at + offset) * rate))
          .every((value) => value === 0)
      )
        throw new Error("Output before delayed onset");
      const energy = actual.reduce((sum, sample) => sum + sample ** 2, 0);
      if (stop !== undefined && stop <= at + offset) {
        if (energy !== 0) throw new Error("Cancelled layer became audible");
      } else if (energy === 0) throw new Error("Silent delayed layer");
      if (!actual.slice(Math.ceil(0.6 * rate)).every((value) => value === 0))
        throw new Error("Delayed tail survived cleanup");
      errors.push(error);
    }
  }
  return { errors };
}
async function live() {
  const actual = await render(0.07, true, undefined, true);
  const expected = await render(0.07, true, undefined, true, true);
  const error = difference(actual, expected);
  if (error > 2e-6) throw new Error(`Pending live ramp mismatch: ${error}`);
  return { error };
}
export const startOffsetChecks = { timing, live };
Object.assign(globalThis, { startOffsetChecks });
