import { expect, it, vi } from "vitest";
import { createAudio, createEngine } from "../src/runtime/engine";
import { confirmation } from "../../../catalog/recipes/confirmation/recipe";
import { impact } from "../../../catalog/recipes/impact/recipe";
import { thruster } from "../../../catalog/recipes/thruster/recipe";

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
  delayTime = new Param();
  type = "";
  buffer: { data: Float32Array } | null = null;
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  onended: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
  disconnect = vi.fn();
  connect = vi.fn(() => this);
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
    // Voice/graph tests use output that needs no activation. Startup tests
    // below explicitly suspend it to exercise the native activation path.
    state: "running",
    destination: new Node(),
    createGain: vi.fn(make),
    createDelay: vi.fn(make),
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
    createConstantSource: vi.fn(() => {
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
  context.state = "suspended";
  let release!: () => void;
  context.resume.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      }),
  );
  context.resume.mockImplementationOnce(() => new Promise<void>(() => {}));
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
it("retries a pending native resume synchronously on a later gesture", async () => {
  const { audio, context } = setup();
  context.state = "suspended";
  context.resume.mockImplementationOnce(() => new Promise<void>(() => {}));
  const first = audio.start();
  expect(audio.state).toBe("starting");
  const retry = audio.start();
  expect(retry).toBe(first);
  expect(context.resume).toHaveBeenCalledTimes(2);
  expect(context.state).toBe("running");
  await retry;
  expect(audio.state).toBe("running");
  await audio.dispose();
});
it("prepares a suspended engine without scheduling a source or playing a voice", async () => {
  const { audio, context, sources } = setup();
  context.state = "suspended";
  const starting = audio.start();
  expect(context.resume).toHaveBeenCalledOnce();
  expect(sources).toHaveLength(0);
  expect(audio.counts).toEqual({ active: 0, retiring: 0 });
  await starting;
  expect(audio.state).toBe("running");
  await audio.dispose();
});
it("suspends a late activation retry after startup was cancelled", async () => {
  const { audio, context } = setup();
  context.state = "suspended";
  let resume!: () => void;
  context.resume.mockImplementationOnce(() => new Promise<void>(() => {}));
  context.resume.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        resume = () => {
          context.state = "running";
          resolve();
        };
      }),
  );
  const first = audio.start();
  const rejected = expect(first).rejects.toMatchObject({
    code: "start-cancelled",
  });
  expect(audio.start()).toBe(first);
  await audio.suspend();
  resume();
  await rejected;
  expect(context.state).toBe("suspended");
  expect(audio.state).toBe("suspended");
  await audio.dispose();
});
it("invalidates pending resume and closes exactly once", async () => {
  const { audio, context } = setup();
  context.state = "suspended";
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
      .filter((node) => node !== nodes[0] && node !== nodes[1])
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
    nodes.slice(2).every((node) => node.disconnect.mock.calls.length === 1),
  ).toBe(true);
  await audio.dispose();
});

it("rejects pending starts immediately on disposal, without native resolution", async () => {
  const { audio, context, sources } = setup();
  context.state = "suspended";
  context.resume.mockImplementationOnce(() => new Promise<void>(() => {}));
  const pending = audio.start();
  const rejection = expect(pending).rejects.toMatchObject({ code: "disposed" });
  await audio.dispose();
  await rejection;
  expect(context.close).toHaveBeenCalledOnce();
  expect(sources).toHaveLength(0);
});
it("recovers from partial master allocation and finalizes native interruption", async () => {
  const { audio, context, nodes, sources } = setup();
  context.createGain.mockImplementationOnce(() => {
    throw new Error("allocation");
  });
  await expect(audio.start()).rejects.toMatchObject({ code: "start-failed" });
  await audio.start();
  const bus = audio.bus("effects");
  const voice = audio.sound(confirmation).play({ bus });
  context.state = "interrupted";
  const handler = context.addEventListener.mock.calls[0] as unknown as [
    string,
    () => void,
  ];
  handler[1]();
  expect(audio.state).toBe("interrupted");
  await voice.ended;
  expect(audio.counts.active).toBe(0);
  expect(sources.every((source) => source.onended === null)).toBe(true);
  expect(
    nodes.slice(4).every((node) => node.disconnect.mock.calls.length > 0),
  ).toBe(true);
  context.state = "running";
  handler[1]();
  await Promise.resolve();
  expect(context.state).toBe("suspended");
  await audio.start();
  expect(audio.state).toBe("running");
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
  expect(nodes[1].gain.calls.at(-1)).toEqual([
    "linear",
    0,
    context.currentTime + 0.005,
  ]);
  audio.setMuted(false);
  expect(nodes[1].gain.calls.at(-1)?.[1]).toBeCloseTo(1);
  sources.forEach((source) => source.onended?.());
  await Promise.all([a.ended, b.ended]);
  await audio.dispose();
});

it("bounds a blocked resume and permits a new gesture retry without old playback", async () => {
  vi.useFakeTimers();
  try {
    const { audio, context } = setup();
    context.state = "suspended";
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
  expect(nodes).toHaveLength(2);
  context.sampleRate = 48000;
  context.createBuffer.mockImplementationOnce(() => {
    throw new Error("buffer allocation");
  });
  expect(() => sound.play()).toThrow(/buffer allocation/);
  expect(audio.counts).toEqual({ active: 0, retiring: 0 });
  expect(
    nodes.slice(2).every((node) => node.disconnect.mock.calls.length === 1),
  ).toBe(true);
  await audio.dispose();
});

it("routes by identity, rejects cycles/foreign buses atomically and disposes subtrees", async () => {
  const { audio, nodes } = setup();
  const other = setup();
  await Promise.all([audio.start(), other.audio.start()]);
  const a = audio.bus("a");
  const b = audio.bus("b", a);
  expect(audio.bus("a")).toBe(a);
  const before = nodes.length;
  expect(() => a.setParent(b)).toThrow(/cycle/);
  expect(a.parent).toBe(audio.master);
  expect(() => a.setParent(other.audio.master)).toThrow(/engine/);
  expect(() =>
    audio.sound(confirmation).play({ bus: other.audio.master }),
  ).toThrow(/engine/);
  expect(nodes).toHaveLength(before);
  b.setParent(audio.master);
  expect(b.parent).toBe(audio.master);
  b.setParent(a);
  const voice = audio.sound(thruster).play({ bus: b });
  a.dispose();
  a.dispose();
  await voice.ended;
  expect(() => b.setMuted(true)).toThrow(/disposed/);
  expect(() => audio.master.dispose()).toThrow(/engine/);
  expect(audio.bus("a")).not.toBe(a);
  await Promise.all([audio.dispose(), other.audio.dispose()]);
});
it("keeps mute independent from gain automation and duplicate parent calls inert", async () => {
  const { audio, nodes } = setup();
  await audio.start();
  const bus = audio.bus("mix");
  const gain = nodes[2];
  const mute = nodes[3];
  bus.setGainDb(-6, 1);
  const volume = [...gain.gain.calls];
  bus.setMuted(true);
  bus.setMuted(false);
  expect(gain.gain.calls).toEqual(volume);
  expect(mute.gain.calls.at(-1)).toEqual(["linear", 1, 1.005]);
  const routes = mute.connect.mock.calls.length;
  bus.setParent(audio.master);
  expect(mute.connect).toHaveBeenCalledTimes(routes);
  for (const call of [
    () => bus.setGainDb(1),
    () => bus.setGainDb(-6, NaN),
    () => bus.setMuted(1 as unknown as boolean),
  ])
    expect(call).toThrow();
  await audio.dispose();
});
it("invalidates blocked resume on suspension without waiting for native resolution", async () => {
  const { audio, context } = setup();
  context.state = "suspended";
  let resolve!: () => void;
  context.resume.mockImplementationOnce(
    () =>
      new Promise<void>((done) => {
        resolve = done;
      }),
  );
  const pending = audio.start();
  const handled = expect(pending).rejects.toMatchObject({
    code: "start-cancelled",
  });
  await audio.suspend();
  await handled;
  expect(audio.state).toBe("suspended");
  context.state = "running";
  resolve();
  await Promise.resolve();
  await Promise.resolve();
  expect(context.state).toBe("suspended");
  await audio.start();
  expect(audio.state).toBe("running");
  await audio.dispose();
});
it("native taps reject foreign contexts and duplicate destination routes before connecting", async () => {
  const { audio, context } = setup();
  expect(() => audio.native).toThrow(/start/);
  await audio.start();
  const tap = new Node();
  Object.assign(tap, { context });
  const nativeNode = tap as unknown as AudioNode;
  expect(() =>
    audio.native.connect(new Node() as unknown as AudioNode),
  ).toThrow(/context/);
  expect(() =>
    audio.native.connect(context.destination as unknown as AudioNode),
  ).toThrow(/destination/);
  const remove = audio.native.connect(nativeNode);
  expect(() => audio.native.connect(nativeNode)).toThrow(/already/);
  remove();
  remove();
  audio.native.connect(nativeNode);
  await audio.dispose();
  expect(context.close).toHaveBeenCalledOnce();
});

it("cut keeps retirees separate from active capacity during mixed stress", async () => {
  const { audio } = setup({ maxVoices: 2, maxVoicesPerSound: 2 });
  await audio.start();
  const a = audio.sound(thruster);
  const b = audio.sound(confirmation);
  for (let i = 0; i < 100; i++) {
    a.play();
    b.play();
    audio.stopAll({ tails: "cut" });
    expect(audio.counts.active).toBeLessThanOrEqual(2);
    expect(audio.counts.retiring).toBeLessThanOrEqual(1);
  }
  await audio.dispose();
});

it("route replacement removes the old output exactly once", async () => {
  const { audio, nodes, sources, context } = setup();
  await audio.start();
  const first = audio.bus("first");
  const second = audio.bus("second");
  const child = audio.bus("child", first);
  const voice = audio.sound(confirmation).play({ bus: child });
  sources.slice(0, 2).forEach((source) => source.onended?.());
  await voice.ended;
  context.currentTime += 0.05;
  child.setParent(second);
  child.setParent(first);
  expect(nodes[7].disconnect).toHaveBeenCalledWith(nodes[2]);
  await audio.dispose();
});

it("owns delay tails separately from sources, cuts repeated stops and releases every node", async () => {
  const { audio, context, sources, nodes } = setup();
  await audio.start();
  const sound = audio.sound({
    ...confirmation,
    effects: [{ type: "delay", time: 0.2, feedback: 0.5, mix: 0.25 }],
  });
  const voice = sound.play();
  const clock = sources.at(-1)!;
  expect(context.createDelay).toHaveBeenCalledWith(
    0.2 - 128 / context.sampleRate,
  );
  expect(context.createDelay).toHaveBeenCalledWith(128 / context.sampleRate);
  expect(context.createConstantSource).toHaveBeenCalledTimes(1);
  expect(sources[0].stop.mock.calls[0][0]).toBeLessThan(
    clock.stop.mock.calls[0][0],
  );
  sources.slice(0, -1).forEach((source) => source.onended?.());
  expect(voice.state).toBe("active");
  context.currentTime = 1.02;
  voice.stop();
  const deadline = clock.stop.mock.calls.at(-1)![0];
  expect(deadline).toBeGreaterThan(3);
  voice.stop();
  expect(clock.stop.mock.calls.at(-1)![0]).toBe(deadline);
  context.currentTime = 1.04;
  audio.stopAll({ tails: "cut" });
  expect(clock.stop.mock.calls.at(-1)![0]).toBeCloseTo(1.045);
  context.currentTime = 1.042;
  audio.stopAll({ tails: "cut" });
  expect(clock.stop.mock.calls.at(-1)![0]).toBeCloseTo(1.045);
  clock.onended?.();
  await voice.ended;
  expect(
    nodes.slice(2).every((node) => node.disconnect.mock.calls.length === 1),
  ).toBe(true);
  expect(audio.counts).toEqual({ active: 0, retiring: 0 });
  await audio.dispose();
});

it("cleans partial delay graphs, cancellation and suspended tails without audio clock progress", async () => {
  const { audio, context, nodes } = setup();
  await audio.start();
  const sound = audio.sound({
    ...confirmation,
    effects: [{ type: "delay", time: 2, feedback: 0.8 }],
  });
  context.createConstantSource.mockImplementationOnce(() => {
    throw new Error("clock allocation");
  });
  expect(() => sound.play()).toThrow(/clock allocation/);
  expect(
    nodes.slice(2).every((node) => node.disconnect.mock.calls.length === 1),
  ).toBe(true);
  expect(audio.counts.active).toBe(0);
  const future = sound.play({ at: 10 });
  future.stop();
  await future.ended;
  const voice = sound.play();
  voice.stop();
  await audio.suspend();
  await voice.ended;
  expect(audio.counts).toEqual({ active: 0, retiring: 0 });
  await audio.dispose();
  expect(nodes.every((node) => node.disconnect.mock.calls.length > 0)).toBe(
    true,
  );
});

it("keeps live source, gain and ordered filter controls working alongside static delay", async () => {
  const { audio, context, sources, nodes } = setup();
  await audio.start();
  const voice = audio
    .sound({
      schemaVersion: 1,
      kind: "sustained",
      parameters: {
        tone: { min: 0, max: 1, default: 0, mode: "live", smoothing: 0.05 },
      },
      layers: [
        {
          id: "tone",
          source: {
            type: "oscillator",
            waveform: "sine",
            frequency: { control: "tone", range: [100, 400], scale: "linear" },
          },
          gainDb: { control: "tone", range: [-30, -12], scale: "linear" },
          envelope: { attack: 0.002, decay: 0, sustain: 1, release: 0.05 },
          effects: [
            { type: "delay", time: 0.1, feedback: 0.4 },
            {
              type: "filter",
              filter: "lowpass",
              frequency: {
                control: "tone",
                range: [300, 2000],
                scale: "linear",
              },
              q: 0.7,
            },
          ],
        },
      ],
      effects: [{ type: "filter", filter: "highpass", frequency: 80, q: 0.7 }],
    })
    .play();
  const count = nodes.length;
  voice.set({ tone: 1 });
  expect(nodes).toHaveLength(count);
  expect(sources[0].frequency.calls.at(-1)).toEqual(["linear", 400, 1.05]);
  const filter = context.createBiquadFilter.mock.results[1].value;
  expect(filter.frequency.calls.at(-1)).toEqual(["linear", 2000, 1.05]);
  expect(
    nodes.some((node) =>
      node.gain.calls.some(
        ([kind, value, time]) =>
          kind === "linear" && value === 10 ** (-12 / 20) && time === 1.05,
      ),
    ),
  ).toBe(true);
  voice.stop();
  expect(() => voice.set({ tone: 0 })).toThrow(/no longer active/);
  await audio.dispose();
  await voice.ended;
});

it("schedules the earliest release while accepting live controls until its audio deadline", async () => {
  const { audio, context, sources } = setup();
  await audio.start();
  const voice = audio.sound(thruster).play();
  const settled = vi.fn();
  void voice.ended.then(settled);
  for (const at of [
    -1,
    NaN,
    Infinity,
    Number.MAX_SAFE_INTEGER + 1,
    null,
    "2",
  ]) {
    expect(() => voice.stop({ at: at as number })).toThrow(/at must/);
  }
  expect(sources[0].stop).not.toHaveBeenCalled();
  voice.stop({ at: 3 });
  const deadline = sources[0].stop.mock.calls.at(-1)![0];
  voice.stop({ at: 4 });
  voice.stop({ at: 3 });
  expect(sources[0].stop).toHaveBeenCalledTimes(1);
  expect(voice.state).toBe("active");
  context.currentTime = 1.5;
  voice.set({ throttle: 1 });
  voice.stop({ at: 2 });
  expect(sources[0].stop.mock.calls.at(-1)![0]).toBeLessThan(deadline);
  context.currentTime = 1.999;
  voice.set({ throttle: 0.5 });
  expect(voice.state).toBe("active");
  context.currentTime = 2;
  expect(voice.state).toBe("stopping");
  expect(() => voice.set({ throttle: 0 })).toThrow(/no longer active/);
  const calls = sources[0].stop.mock.calls.length;
  voice.stop();
  voice.stop({ at: 1 });
  expect(sources[0].stop).toHaveBeenCalledTimes(calls);
  await Promise.resolve();
  expect(settled).not.toHaveBeenCalled();
  await audio.suspend();
  await voice.ended;
  expect(settled).toHaveBeenCalledTimes(1);
  expect(audio.counts.active).toBe(0);
  await audio.dispose();
});

it("replaces future release from the original attack or decay, with immediate overrides", async () => {
  for (const earlier of [1.1, 1.3]) {
    const { audio, context, nodes, sources } = setup();
    await audio.start();
    const voice = audio
      .sound({
        schemaVersion: 1,
        kind: "sustained",
        layers: [
          {
            id: "tone",
            gainDb: 0,
            source: { type: "oscillator", waveform: "sine", frequency: 440 },
            envelope: { attack: 0.2, decay: 0.2, sustain: 0.5, release: 0.1 },
          },
        ],
      })
      .play();
    const envelope = nodes.find((n) =>
      n.gain.calls.some(
        ([kind, value, time]) =>
          kind === "linear" && value === 1 && time === 1.2,
      ),
    )!.gain;
    voice.stop({ at: 2 });
    voice.stop({ at: earlier });
    expect(envelope.calls.at(-2)![1]).toBeCloseTo(earlier === 1.1 ? 0.5 : 0.75);
    expect(envelope.calls.at(-2)![2]).toBe(earlier);
    expect(envelope.calls.at(-1)).toEqual(["linear", 0, earlier + 0.1]);
    context.currentTime = 1.05;
    voice.stop();
    expect(voice.state).toBe("stopping");
    expect(envelope.calls.at(-2)![1]).toBeCloseTo(0.25);
    expect(sources[0].stop.mock.calls.at(-1)![0]).toBeCloseTo(1.15);
    await audio.dispose();
  }
});

it("cancels reserved onsets, accepts past release, and never stretches a natural gate", async () => {
  const { audio, context, sources } = setup();
  await audio.start();
  const sound = audio.sound(confirmation);
  for (const deadline of [2, 3]) {
    const future = sound.play({ at: 3 });
    future.stop({ at: deadline });
    await future.ended;
    expect(future.state).toBe("ended");
  }
  const atOnset = sound.play({ at: 3 });
  context.currentTime = 3;
  atOnset.stop();
  await atOnset.ended;
  expect(atOnset.state).toBe("ended");
  const voice = sound.play();
  const source = sources.at(-1)!;
  const calls = source.stop.mock.calls.length;
  voice.stop({ at: 10 });
  expect(source.stop).toHaveBeenCalledTimes(calls);
  context.currentTime = 3.002;
  voice.stop({ at: 0 });
  expect(voice.state).toBe("stopping");
  expect(source.stop.mock.calls.at(-1)![0]).toBeLessThan(
    source.stop.mock.calls[0][0],
  );
  await audio.dispose();
});

it("pending release retains tails and is overridden by cuts, stealing and explicit owners", async () => {
  for (const cleanup of [
    "tail",
    "cut",
    "steal",
    "sound",
    "bus",
    "suspend",
    "dispose",
  ] as const) {
    const { audio, context, sources } = setup({ maxVoices: 1 });
    await audio.start();
    const bus = audio.bus("release");
    const sound = audio.sound({
      ...thruster,
      effects: [{ type: "delay", time: 0.2, feedback: 0.5, mix: 0.25 }],
    });
    const voice = sound.play({ bus });
    voice.stop({ at: 3 });
    const clock = sources.at(-1)!;
    expect(clock.stop.mock.calls.at(-1)![0]).toBeGreaterThan(3.2);
    context.currentTime = 1.1;
    if (cleanup === "tail") {
      context.currentTime = 3.1;
      sources.slice(0, -1).forEach((s) => s.onended?.());
      expect(voice.state).toBe("stopping");
      expect(audio.counts.active).toBe(1);
      clock.onended?.();
    } else if (cleanup === "cut" || cleanup === "steal") {
      if (cleanup === "cut") audio.stopAll({ tails: "cut" });
      else sound.play();
      expect(clock.stop.mock.calls.at(-1)![0]).toBeCloseTo(1.105);
      clock.onended?.();
    } else {
      context.state = "suspended";
      if (cleanup === "sound") sound.dispose();
      if (cleanup === "bus") bus.dispose();
      if (cleanup === "suspend") await audio.suspend();
      if (cleanup === "dispose") await audio.dispose();
    }
    await voice.ended;
    expect(voice.state).toBe("ended");
    await audio.dispose();
  }
});
