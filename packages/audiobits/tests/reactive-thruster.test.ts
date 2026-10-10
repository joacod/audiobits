import { afterEach, expect, it, vi } from "vitest";
import type { AudioEngine, AudioState, Voice } from "../src/index";
import { validateRecipe, defineSound } from "../src/index";
import { compile } from "../src/compiler/plan";
import { noiseData } from "../src/compiler/values";
import { reactiveThruster } from "../../../catalog/reactive-thruster/recipe";
import {
  attachPointerThruster,
  velocityThrottle,
} from "../../../catalog/reactive-thruster/pointer";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("keeps one serializable validated recipe with cohesive live pitch, gain and filters", () => {
  const roundTrip = JSON.parse(JSON.stringify(reactiveThruster));
  expect(roundTrip).toEqual(reactiveThruster);
  expect(validateRecipe(roundTrip).ok).toBe(true);
  const low = compile(defineSound(reactiveThruster), { throttle: 0 }, 42);
  const high = compile(defineSound(reactiveThruster), { throttle: 1 }, 42);
  expect(reactiveThruster.parameters.throttle.mode).toBe("live");
  expect(reactiveThruster.parameters.throttle.smoothing).toBe(0.06);
  for (let i = 0; i < low.layers.length; i++) {
    expect(high.layers[i].layer.gainDb).toBeGreaterThan(
      low.layers[i].layer.gainDb as number,
    );
  }
  expect(low.layers[0].layer.source).toEqual({
    type: "oscillator",
    waveform: "triangle",
    frequency: 38,
  });
  expect(high.layers[0].layer.source).toEqual({
    type: "oscillator",
    waveform: "triangle",
    frequency: 160,
  });
  expect(high.layers[2].layer.effects![1].frequency).toBe(5200);
  expect(low.layers[2].layer.effects![1].frequency).toBe(220);
  const seed = high.layers[2].noiseSeed;
  const replay = compile(reactiveThruster, { throttle: 1 }, 42);
  const different = compile(reactiveThruster, { throttle: 1 }, 43);
  for (const rate of [44100, 48000]) {
    expect(noiseData(rate, seed)).toEqual(
      noiseData(rate, replay.layers[2].noiseSeed),
    );
    expect(noiseData(rate, seed)).not.toEqual(
      noiseData(rate, different.layers[2].noiseSeed),
    );
  }
  expect(low).not.toEqual(high);
  expect(() => compile(reactiveThruster, { throttle: 1.1 })).toThrow();
});
it("normalizes velocity rather than position, independent of event frequency", () => {
  expect(velocityThrottle(12, 10)).toBe(1);
  expect(velocityThrottle(6, 10)).toBe(0.5);
  expect(velocityThrottle(60, 100)).toBe(0.5);
  expect(velocityThrottle(0, 100)).toBe(0);
  for (const [distance, elapsed] of [
    [10000, 1],
    [1, 0],
    [Infinity, 10],
    [10, NaN],
    [-1, 10],
  ]) {
    const value = velocityThrottle(distance, elapsed);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(1);
  }
});

function setup() {
  const document = Object.assign(new EventTarget(), { hidden: false });
  const window = new EventTarget();
  let capture: number | undefined;
  const surface = Object.assign(new EventTarget(), {
    setPointerCapture: vi.fn((id: number) => {
      capture = id;
    }),
    hasPointerCapture: (id: number) => capture === id,
    releasePointerCapture: vi.fn(() => {
      capture = undefined;
    }),
  });
  const frames = new Map<number, FrameRequestCallback>();
  let frame = 0;
  let time = 0;
  vi.spyOn(performance, "now").mockImplementation(() => time);
  vi.stubGlobal("document", document);
  vi.stubGlobal("window", window);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++frame, callback);
    return frame;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => {
    frames.delete(id);
  });
  let resolve!: () => void;
  let reject!: (cause: unknown) => void;
  const activation = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  const voices: Voice<typeof reactiveThruster>[] = [];
  const play = vi.fn(() => {
    let end!: () => void;
    const voice = {
      state: "active" as Voice["state"],
      seed: 42,
      parameters: {},
      ended: new Promise<void>((done) => {
        end = done;
      }),
      set: vi.fn(),
      stop: vi.fn(() => {
        voice.state = "stopping";
      }),
      finish: () => {
        voice.state = "ended";
        end();
      },
    };
    voices.push(voice);
    return voice;
  });
  const soundDispose = vi.fn();
  let stateListener!: (state: AudioState) => void;
  const unsubscribe = vi.fn();
  const audio = {
    sound: vi.fn(() => ({ play, dispose: soundDispose })),
    start: vi.fn(() => activation),
    bus: vi.fn(() => ({})),
    subscribe: (listener: typeof stateListener) => {
      stateListener = listener;
      return unsubscribe;
    },
  } as unknown as AudioEngine;
  const feedback = { state: vi.fn(), error: vi.fn(), throttle: vi.fn() };
  const interaction = attachPointerThruster(
    surface as unknown as HTMLElement,
    audio,
    feedback,
  );
  const event = (type: string, props = {}) => {
    surface.dispatchEvent(
      Object.assign(new Event(type), {
        pointerId: 1,
        isPrimary: true,
        button: 0,
        clientX: 0,
        clientY: 0,
        ...props,
      }),
    );
  };
  const tick = (ms: number) => {
    time = ms;
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach((callback) => callback(ms));
  };
  return {
    interaction,
    audio,
    feedback,
    play,
    voices,
    resolve,
    reject,
    document,
    window,
    event,
    tick,
    frames,
    surface,
    soundDispose,
    unsubscribe,
    stateListener: (state: AudioState) => stateListener(state),
    setTime: (ms: number) => {
      time = ms;
    },
  };
}
const settle = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

it("cancels pending activation and allows only the latest restart to play", async () => {
  const s = setup();
  s.interaction.start(0.2);
  expect(s.audio.start).toHaveBeenCalledTimes(1);
  s.interaction.stop();
  s.interaction.start(0.8);
  s.interaction.start(1);
  s.resolve();
  await settle();
  expect(s.play).toHaveBeenCalledTimes(1);
  expect(s.play).toHaveBeenCalledWith(
    expect.objectContaining({ parameters: { throttle: 0.8 } }),
  );
  s.interaction.stop();
  expect(s.voices[0].stop).toHaveBeenCalledTimes(1);
  s.interaction.dispose();
});
it("reports activation failure and permits a fresh gesture", async () => {
  const s = setup();
  s.interaction.start(0);
  s.stateListener("suspended");
  s.reject(new Error("Blocked"));
  await settle();
  expect(s.feedback.error).toHaveBeenCalledWith(
    expect.objectContaining({ message: "Blocked" }),
  );
  expect(s.play).not.toHaveBeenCalled();
  s.interaction.start(0.5);
  expect(s.audio.start).toHaveBeenCalledTimes(2);
  s.interaction.dispose();
  await settle();
});
it("coalesces rapid movement, bounds updates, decays stationary motion, and releases capture", async () => {
  const s = setup();
  s.event("pointerdown");
  s.resolve();
  await settle();
  for (let i = 1; i <= 100; i++) {
    s.setTime(i);
    s.event("pointermove", { clientX: i * 20 });
  }
  expect(s.voices[0].set).not.toHaveBeenCalled();
  s.tick(100);
  expect(s.voices[0].set).toHaveBeenCalledTimes(1);
  expect(s.feedback.throttle.mock.lastCall![0]).toBeGreaterThan(0.8);
  s.tick(1000);
  expect(s.feedback.throttle.mock.lastCall![0]).toBeLessThan(0.001);
  s.event("pointerup");
  expect(s.surface.releasePointerCapture).toHaveBeenCalledWith(1);
  expect(s.voices[0].stop).toHaveBeenCalledTimes(1);
  expect(s.frames.size).toBe(0);
  s.interaction.dispose();
});
for (const action of [
  "pointercancel",
  "lostpointercapture",
  "hide",
  "blur",
  "pagehide",
  "dispose",
] as const) {
  it(`prevents stale playback after ${action} and removes resources on disposal`, async () => {
    const s = setup();
    s.event("pointerdown");
    if (action === "hide") {
      s.document.hidden = true;
      s.document.dispatchEvent(new Event("visibilitychange"));
    } else if (action === "blur" || action === "pagehide")
      s.window.dispatchEvent(new Event(action));
    else if (action === "dispose") s.interaction.dispose();
    else s.event(action);
    s.resolve();
    await settle();
    expect(s.play).not.toHaveBeenCalled();
    expect(s.frames.size).toBe(0);
    s.interaction.dispose();
    s.interaction.dispose();
    expect(s.soundDispose).toHaveBeenCalledTimes(1);
    expect(s.unsubscribe).toHaveBeenCalledTimes(1);
    s.event("pointerdown");
    s.interaction.start(1);
    expect(s.audio.start).toHaveBeenCalledTimes(1);
  });
}
it("does not let an old voice completion stop a new voice, and handles engine interruption", async () => {
  const s = setup();
  s.interaction.start(0.2);
  s.resolve();
  await settle();
  s.interaction.stop();
  s.interaction.start(0.5);
  await settle();
  (s.voices[0] as Voice & { finish(): void }).finish();
  await settle();
  expect(s.voices[1].stop).not.toHaveBeenCalled();
  s.stateListener("interrupted");
  expect(s.voices[1].stop).toHaveBeenCalledTimes(1);
  s.interaction.dispose();
});

for (const action of ["pointercancel", "lostpointercapture"] as const) {
  it(`releases an active voice on ${action}`, async () => {
    const s = setup();
    s.event("pointerdown");
    s.resolve();
    await settle();
    s.event(action);
    expect(s.voices[0].stop).toHaveBeenCalledTimes(1);
    expect(s.frames.size).toBe(0);
    s.interaction.dispose();
  });
}
