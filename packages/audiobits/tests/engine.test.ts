import { expect, it, vi } from "vitest";
import { createAudio, createEngine } from "../src/runtime/engine";
import { confirmation, impact, thruster } from "../src/recipes";

class Param {
  value = 0;
  calls: [string, number, number][] = [];
  setValueAtTime(value: number, time: number) {
    this.calls.push(["set", value, time]);
  }
  linearRampToValueAtTime(value: number, time: number) {
    this.calls.push(["linear", value, time]);
  }
  exponentialRampToValueAtTime(value: number, time: number) {
    this.calls.push(["exponential", value, time]);
  }
  cancelScheduledValues(time: number) {
    this.calls.push(["cancel", 0, time]);
  }
  cancelAndHoldAtTime(time: number) {
    this.calls.push(["hold", 0, time]);
  }
}
class Node {
  gain = new Param();
  frequency = new Param();
  Q = new Param();
  pan = new Param();
  type = "";
  buffer: { data: Float32Array } | null = null;
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  onended: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
  disconnect = vi.fn();
  connect = vi.fn();
}
function setup(options = {}) {
  const nodes: Node[] = [];
  const sources: Node[] = [];
  const make = () => {
    const node = new Node();
    nodes.push(node);
    return node;
  };
  const context = {
    currentTime: 1,
    sampleRate: 48000,
    state: "suspended",
    destination: new Node(),
    createGain: vi.fn(make),
    createStereoPanner: vi.fn(make),
    createBiquadFilter: vi.fn(make),
    createBuffer: vi.fn((_channels: number, length: number) => {
      const data = new Float32Array(length);
      return {
        data,
        copyToChannel(input: Float32Array) {
          data.set(input);
        },
      };
    }),
    createBufferSource: vi.fn(() => {
      const node = make();
      sources.push(node);
      return node;
    }),
    createOscillator: vi.fn(() => {
      const node = make();
      sources.push(node);
      return node;
    }),
    resume: vi.fn(async () => {
      context.state = "running";
    }),
    suspend: vi.fn(async () => {
      context.state = "suspended";
    }),
    close: vi.fn(async () => {
      context.state = "closed";
    }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  const factory = vi.fn(() => context as unknown as AudioContext);
  const audio = createEngine(options, factory);
  return { audio, context, factory, nodes, sources };
}
it("constructs without globals and rejects play until started", async () => {
  const pure = createAudio();
  expect(pure.state).toBe("idle");
  await pure.dispose();
  const { audio, factory, nodes } = setup();
  const sound = audio.sound(confirmation);
  expect(factory).not.toHaveBeenCalled();
  expect(() => sound.play()).toThrow(/start/);
  expect(nodes).toHaveLength(0);
  await audio.start();
  expect(factory).toHaveBeenCalledTimes(1);
  sound.play();
  await audio.dispose();
  expect(audio.counts).toEqual({ active: 0, retiring: 0 });
});
it("starts synchronously, shares the pending operation and retries failures", async () => {
  const { audio, context, factory } = setup();
  let release!: () => void;
  context.resume.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      }),
  );
  const first = audio.start();
  expect(factory).toHaveBeenCalledTimes(1);
  expect(context.resume).toHaveBeenCalledTimes(1);
  expect(audio.start()).toBe(first);
  release();
  await expect(first).rejects.toMatchObject({ code: "start-failed" });
  expect(audio.state).toBe("suspended");
  await audio.start();
  expect(audio.state).toBe("running");
  expect(factory).toHaveBeenCalledTimes(1);
  context.state = "suspended";
  await audio.suspend();
  context.resume.mockRejectedValueOnce(new Error("blocked"));
  await expect(audio.start()).rejects.toMatchObject({ code: "start-failed" });
  await audio.start();
  await audio.dispose();
});
it("invalidates pending resume and closes exactly once", async () => {
  const { audio, context } = setup();
  let release!: () => void;
  context.resume.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      }),
  );
  const pending = audio.start();
  const rejected = expect(pending).rejects.toMatchObject({ code: "disposed" });
  const disposal = audio.dispose();
  expect(audio.dispose()).toBe(disposal);
  await disposal;
  release();
  await rejected;
  expect(audio.state).toBe("disposed");
  expect(context.close).toHaveBeenCalledTimes(1);
  await expect(audio.start()).rejects.toMatchObject({ code: "disposed" });
});
it("creates independent graphs, schedules by context time and releases from current attack", async () => {
  const { audio, context, sources, nodes } = setup();
  await audio.start();
  const sound = audio.sound(confirmation);
  const a = sound.play();
  const b = sound.play({ at: 2 });
  expect(sources).toHaveLength(4);
  expect(sources[0].start).toHaveBeenCalledWith(1);
  expect(sources[2].start).toHaveBeenCalledWith(2);
  b.stop();
  await b.ended;
  expect(b.state).toBe("ended");
  expect(audio.counts.active).toBe(1);
  context.currentTime = 1.002;
  a.stop();
  const body = nodes.find((node) =>
    node.gain.calls.some(
      ([kind, value, time]) =>
        kind === "set" &&
        time === 1.002 &&
        Math.abs(value - 10 ** (-14 / 20) / 2) < 1e-8,
    ),
  );
  expect(body).toBeDefined();
  const previousCalls = sources[0].stop.mock.calls.length;
  a.stop();
  expect(sources[0].stop).toHaveBeenCalledTimes(previousCalls);
  for (const source of sources.slice(0, 2)) source.onended?.();
  await a.ended;
  expect(audio.counts).toEqual({ active: 0, retiring: 0 });
  expect(
    nodes
      .filter((node) => node !== nodes[0])
      .every((node) => node.disconnect.mock.calls.length > 0),
  ).toBe(true);
  await audio.dispose();
});
it("keeps active and retiring resources bounded under rapid retriggering", async () => {
  const { audio, sources } = setup({ maxVoices: 3, maxVoicesPerSound: 2 });
  await audio.start();
  const a = audio.sound(confirmation);
  const b = audio.sound(confirmation);
  const first = a.play();
  a.play();
  a.play();
  expect(first.state).toBe("retiring");
  const all = [first];
  for (let i = 0; i < 500; i++) {
    all.push((i % 2 ? a : b).play());
    expect(audio.counts.active).toBeLessThanOrEqual(3);
    expect(audio.counts.retiring).toBeLessThanOrEqual(1);
    expect(sources.filter((source) => source.onended !== null)).toHaveLength(
      (audio.counts.active + audio.counts.retiring) * 2,
    );
  }
  expect(first.state).toBe("ended");
  await audio.suspend();
  await Promise.all(all.map((voice) => voice.ended));
  expect(audio.counts).toEqual({ active: 0, retiring: 0 });
  await audio.dispose();
});
it("validates limits and options before nodes or retirement, and disposes sounds", async () => {
  for (const options of [
    { maxVoices: 0 },
    { maxVoices: 1.5 },
    { masterGainDb: 1 },
  ])
    expect(() => setup(options)).toThrow();
  const { audio, nodes, context } = setup();
  await audio.start();
  const sound = audio.sound(confirmation);
  const count = nodes.length;
  for (const options of [{ at: 0 }, { pan: 2 }, { gainDb: NaN }])
    expect(() => sound.play(options)).toThrow();
  context.sampleRate = 6400;
  expect(() => sound.play()).toThrow(/Nyquist/);
  expect(nodes).toHaveLength(count);
  context.sampleRate = 48000;
  const voice = sound.play();
  context.state = "suspended";
  sound.dispose();
  sound.dispose();
  await voice.ended;
  expect(() => sound.play()).toThrow(/disposed/);
  await audio.dispose();
});
it("finishes partial graphs when native allocation fails", async () => {
  const { audio, context, nodes } = setup();
  await audio.start();
  context.createOscillator.mockImplementationOnce(() => {
    throw new Error("allocation failed");
  });
  expect(() => audio.sound(confirmation).play()).toThrow(/allocation failed/);
  expect(audio.counts).toEqual({ active: 0, retiring: 0 });
  expect(
    nodes.slice(1).every((node) => node.disconnect.mock.calls.length === 1),
  ).toBe(true);
  await audio.dispose();
});

it("rejects pending starts immediately on disposal, without native resolution", async () => {
  const { audio, context } = setup();
  context.resume.mockImplementationOnce(() => new Promise<void>(() => {}));
  const pending = audio.start();
  const rejection = expect(pending).rejects.toMatchObject({ code: "disposed" });
  await audio.dispose();
  await rejection;
});
it("recovers from partial master allocation and finalizes native interruption", async () => {
  const { audio, context } = setup();
  context.createGain.mockImplementationOnce(() => {
    throw new Error("allocation");
  });
  await expect(audio.start()).rejects.toMatchObject({ code: "start-failed" });
  await audio.start();
  const voice = audio.sound(confirmation).play();
  context.state = "interrupted";
  const handler = context.addEventListener.mock.calls[0] as unknown as [
    string,
    () => void,
  ];
  handler[1]();
  expect(audio.state).toBe("interrupted");
  await voice.ended;
  expect(audio.counts.active).toBe(0);
  await audio.dispose();
});
it("normal stopAll retains reservations while release finishes, and mute ramps", async () => {
  const { audio, context, sources, nodes } = setup();
  await audio.start();
  const sound = audio.sound(confirmation);
  const a = sound.play();
  const b = sound.play();
  audio.stopAll();
  expect(a.state).toBe("stopping");
  expect(b.state).toBe("stopping");
  expect(audio.counts).toEqual({ active: 2, retiring: 0 });
  audio.setMuted(true);
  expect(nodes[0].gain.calls.at(-1)).toEqual([
    "linear",
    0,
    context.currentTime + 0.005,
  ]);
  audio.setMuted(false);
  expect(nodes[0].gain.calls.at(-1)?.[1]).toBeCloseTo(10 ** (-12 / 20));
  sources.forEach((source) => source.onended?.());
  await Promise.all([a.ended, b.ended]);
  await audio.dispose();
});

it("bounds a blocked resume and permits a new gesture retry without old playback", async () => {
  vi.useFakeTimers();
  try {
    const { audio, context } = setup();
    context.resume.mockImplementationOnce(() => new Promise<void>(() => {}));
    const sound = audio.sound(confirmation);
    const pending = audio.start();
    const rejected = expect(pending).rejects.toMatchObject({
      code: "start-failed",
    });
    expect(() => sound.play()).toThrow(/start/);
    await vi.advanceTimersByTimeAsync(2000);
    await rejected;
    expect(audio.state).toBe("suspended");
    await audio.start();
    expect(audio.state).toBe("running");
    expect(audio.counts.active).toBe(0);
    await audio.dispose();
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    vi.useRealTimers();
  }
});

it("validates play controls and seeds before allocation or stealing", async () => {
  const { audio, nodes, sources } = setup({ maxVoices: 1 });
  await audio.start();
  const sound = audio.sound(impact);
  const first = sound.play({ seed: 0, parameters: { intensity: 0 } });
  const count = nodes.length;
  for (const options of [
    { seed: -1 },
    { seed: 1.1 },
    { parameters: { intensity: 2 } },
    { parameters: { unknown: 0 } },
    { parameters: { intensity: NaN } },
  ]) {
    expect(() => sound.play(options)).toThrow();
    expect(nodes).toHaveLength(count);
    expect(first.state).toBe("active");
  }
  const second = sound.play({ seed: 42, parameters: { intensity: 1 } });
  expect(second.seed).toBe(42);
  expect(second.parameters).toEqual({ intensity: 1 });
  expect(first.seed).toBe(0);
  expect(first.state).toBe("retiring");
  expect(() => second.set({ intensity: 0 })).toThrow(/live/);
  expect(second.parameters).toEqual({ intensity: 1 });
  expect(sources.filter((source) => source.buffer !== null)).toHaveLength(2);
  await audio.dispose();
  expect(sources.every((source) => source.buffer === null)).toBe(true);
});
it("retargets live ramps from their current values atomically without new graphs", async () => {
  const { audio, context, sources, nodes } = setup();
  await audio.start();
  const voice = audio
    .sound(thruster)
    .play({ seed: 42, parameters: { throttle: 0 } });
  const source = sources[0];
  const count = nodes.length;
  expect(source.stop).not.toHaveBeenCalled();
  const noise = sources[1];
  const buffer = noise.buffer;
  expect(buffer!.data.byteLength).toBe(192000);
  expect(noise.loopStart).toBe(0.02);
  voice.set({ throttle: 1 });
  expect(source.frequency.calls.at(-1)).toEqual(["linear", 130, 1.04]);
  context.currentTime = 1.02;
  voice.set({ throttle: 0 });
  expect(source.frequency.calls.at(-2)).toEqual(["set", 87.5, 1.02]);
  const before = source.frequency.calls.length;
  expect(() => voice.set({ throttle: 1, unknown: 0 })).toThrow();
  expect(source.frequency.calls).toHaveLength(before);
  expect(voice.parameters).toEqual({ throttle: 0 });
  const accessor = Object.defineProperty({}, "throttle", {
    enumerable: true,
    get() {
      throw new Error("read getter");
    },
  });
  expect(() => voice.set(accessor)).toThrow(/Invalid/);
  for (let i = 0; i < 1000; i++) {
    context.currentTime += 0.001;
    voice.set({ throttle: i % 2 });
  }
  expect(nodes).toHaveLength(count);
  expect(sources).toHaveLength(2);
  expect(noise.buffer).toBe(buffer);
  expect(source.start).toHaveBeenCalledTimes(1);
  expect(audio.counts).toEqual({ active: 1, retiring: 0 });
  voice.stop();
  expect(() => voice.set({ throttle: 0.5 })).toThrow(/no longer active/);
  sources.forEach((source) => source.onended?.());
  await voice.ended;
  expect(noise.buffer).toBeNull();
  expect(audio.counts.active).toBe(0);
  await audio.dispose();
});
it("bounds sustained start/stop resources, cancelled onset and disposal", async () => {
  const { audio, context, sources } = setup({
    maxVoices: 2,
    maxVoicesPerSound: 2,
  });
  await audio.start();
  const sound = audio.sound(thruster);
  const future = sound.play({ at: 2 });
  future.set({ throttle: 1 });
  future.stop();
  await future.ended;
  expect(() => future.set({ throttle: 0 })).toThrow(/no longer active/);
  for (let i = 0; i < 200; i++) {
    const voice = sound.play();
    expect(Number.isInteger(voice.seed)).toBe(true);
    voice.set({ throttle: 1 });
    voice.stop();
    expect(audio.counts.active).toBeLessThanOrEqual(2);
    expect(audio.counts.retiring).toBeLessThanOrEqual(1);
    expect(
      sources.filter((source) => source.buffer !== null).length,
    ).toBeLessThanOrEqual(3);
  }
  context.state = "suspended";
  sound.dispose();
  expect(audio.counts).toEqual({ active: 0, retiring: 0 });
  expect(sources.every((source) => source.buffer === null)).toBe(true);
  await audio.dispose();
});
it("cleans noise graphs after buffer failure and rejects unsupported noise rates first", async () => {
  const { audio, context, nodes } = setup();
  await audio.start();
  const sound = audio.sound(thruster);
  context.sampleRate = 384000;
  expect(() => sound.play()).toThrow(/Noise/);
  expect(nodes).toHaveLength(1);
  context.sampleRate = 48000;
  context.createBuffer.mockImplementationOnce(() => {
    throw new Error("buffer allocation");
  });
  expect(() => sound.play()).toThrow(/buffer allocation/);
  expect(audio.counts).toEqual({ active: 0, retiring: 0 });
  expect(
    nodes.slice(1).every((node) => node.disconnect.mock.calls.length === 1),
  ).toBe(true);
  await audio.dispose();
});
