import { afterEach, expect, test, vi } from "vitest";
import {
  createAudio,
  type AudioEngine,
  type AudioState,
  type Recipe,
} from "audiobits";
import { mountEnergyCharge } from "../catalog/experiences/energy-charge/host";
import { mountThruster } from "../catalog/experiences/reactive-thruster/host";
import { mountLightsaber } from "../catalog/experiences/lightsaber/host";

vi.mock("audiobits", async (original) => ({
  ...(await original<typeof import("audiobits")>()),
  createAudio: vi.fn(),
}));
afterEach(() => vi.unstubAllGlobals());

function setup(kind: "charge" | "thruster" | "blade") {
  const document = Object.assign(new EventTarget(), { hidden: false });
  const window = new EventTarget();
  const surface = Object.assign(new EventTarget(), {
    hasPointerCapture: () => false,
    releasePointerCapture: vi.fn(),
  });
  vi.stubGlobal("document", document);
  vi.stubGlobal("window", window);
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn(() => 1),
  );
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  let resolve!: () => void, reject!: (cause: unknown) => void;
  const activation = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  const voices: {
    stop: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
  }[] = [];
  const sounds: {
    recipe: Recipe;
    play: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
  }[] = [];
  const listeners = new Set<(state: AudioState) => void>();
  const audio = {
    state: "running",
    counts: { active: 0, retiring: 0 },
    start: vi.fn(() => activation),
    bus: vi.fn(() => ({})),
    stopAll: vi.fn(),
    suspend: vi.fn(async () => {}),
    dispose: vi.fn(async () => {}),
    subscribe(fn: (state: AudioState) => void) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    sound(recipe: Recipe) {
      const sound = {
        recipe,
        play: vi.fn(() => {
          const voice = {
            state: "active",
            set: vi.fn(),
            stop: vi.fn(),
            ended: new Promise<void>(() => {}),
          };
          voices.push(voice);
          return voice;
        }),
        dispose: vi.fn(),
      };
      sounds.push(sound);
      return sound;
    },
  };
  vi.mocked(createAudio).mockReturnValue(audio as unknown as AudioEngine);
  const feedback = {
    state: vi.fn(),
    error: vi.fn(),
    throttle: vi.fn(),
    output: vi.fn(),
  };
  const host =
    kind === "charge"
      ? mountEnergyCharge(feedback)
      : kind === "thruster"
        ? mountThruster(surface as unknown as HTMLElement, feedback)
        : mountLightsaber(feedback);
  return {
    host,
    start: (value = 0.2) =>
      "start" in host ? host.start(value) : host.ignite(),
    update: (value: number) =>
      "setCharge" in host
        ? host.setCharge(value)
        : "setThrottle" in host
          ? host.setThrottle(value)
          : host.control.update(value, 16),
    release: () => ("release" in host ? host.release() : host.retract()),
    resolve,
    reject,
    audio,
    feedback,
    voices,
    sounds,
    document,
    window,
    listeners,
  };
}
const settle = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

for (const kind of ["charge", "thruster", "blade"] as const) {
  for (const action of [
    "stop",
    "release",
    "dispose",
    "hide",
    "blur",
    "pagehide",
  ] as const) {
    test(`${kind}: ${action} cancels activation and disposal removes owned resources`, async () => {
      const s = setup(kind);
      expect(s.audio.start).not.toHaveBeenCalled();
      s.start();
      expect(s.audio.start).toHaveBeenCalledTimes(1);
      expect(s.feedback.state).toHaveBeenLastCalledWith("starting");
      if (action === "stop") s.host.stop();
      else if (action === "release") s.release();
      else if (action === "dispose") await s.host.dispose();
      else if (action === "hide") {
        s.document.hidden = true;
        s.document.dispatchEvent(new Event("visibilitychange"));
      } else s.window.dispatchEvent(new Event(action));
      s.resolve();
      await settle();
      expect(s.voices).toHaveLength(0);
      await s.host.dispose();
      await s.host.dispose();
      expect(s.audio.dispose).toHaveBeenCalledTimes(1);
      expect(s.listeners.size).toBe(0);
      for (const sound of s.sounds)
        expect(sound.dispose).toHaveBeenCalledTimes(1);
      s.document.hidden = false;
      s.start();
      expect(s.audio.start).toHaveBeenCalledTimes(1);
    });
  }
  test(`${kind}: only the latest pending start plays, then repeated start/stop stays usable`, async () => {
    const s = setup(kind);
    for (let i = 0; i < 8; i++) {
      s.start(i / 10);
      s.host.stop();
    }
    s.start(0.9);
    s.update(0.6);
    s.start(0.1);
    s.resolve();
    await settle();
    expect(s.voices).toHaveLength(kind === "blade" ? 2 : 1);
    if (kind !== "blade") {
      const sound = s.sounds.find(
        (sound) => sound.recipe.kind === "sustained",
      )!;
      expect(sound.play).toHaveBeenLastCalledWith(
        expect.objectContaining({
          parameters: { [kind === "charge" ? "charge" : "throttle"]: 0.6 },
        }),
      );
    }
    expect(s.feedback.state).toHaveBeenLastCalledWith("running");
    s.host.stop();
    for (const voice of s.voices) expect(voice.stop).toHaveBeenCalledTimes(1);
    s.start();
    await settle();
    expect(s.feedback.state).toHaveBeenLastCalledWith("running");
    await s.host.dispose();
  });
  test(`${kind}: activation failures report errors and permit a new gesture`, async () => {
    const s = setup(kind);
    s.start();
    s.reject(new Error("denied"));
    await settle();
    expect(s.feedback.state).toHaveBeenLastCalledWith("stopped");
    expect(s.feedback.error).toHaveBeenCalledWith(
      expect.objectContaining({ message: "denied" }),
    );
    expect(s.voices).toHaveLength(0);
    s.audio.start.mockResolvedValue();
    s.start();
    await settle();
    expect(s.feedback.state).toHaveBeenLastCalledWith("running");
    await s.host.dispose();
  });
}
