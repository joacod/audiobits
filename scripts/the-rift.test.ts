import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { validateRecipe, type AudioEngine, type Recipe } from "audiobits";
import * as recipes from "../catalog/experiences/the-rift/recipe";
import {
  createRift,
  evolutionPeriod,
  nextPhase,
  type RiftEvent,
  type RiftPhase,
} from "../catalog/experiences/the-rift/controller";
import { compile } from "../packages/audiobits/src/compiler/plan";
import { checkNyquist } from "../packages/audiobits/src/compiler/graph";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const settle = async () => {
  for (let i = 0; i < 4; i++) await Promise.resolve();
};

function setup() {
  const clock = { currentTime: 0 };
  const sounds = new Map<Recipe, ReturnType<typeof fakeSound>>();
  const buses: {
    name: string;
    setGainDb: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
  }[] = [];
  let listener!: (state: string) => void;
  const unsubscribe = vi.fn();
  function fakeSound(recipe: Recipe) {
    const voices: {
      state: "active" | "stopping" | "ended";
      options: Record<string, unknown>;
      set: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
      ended: Promise<void>;
      finish(): void;
    }[] = [];
    const sound = {
      recipe,
      voices,
      dispose: vi.fn(),
      play: vi.fn((options: Record<string, unknown> = {}) => {
        let done!: () => void;
        const voice = {
          state: "active" as "active" | "stopping" | "ended",
          options,
          set: vi.fn(),
          stop: vi.fn(() => {
            voice.state = "stopping";
          }),
          ended: new Promise<void>((resolve) => {
            done = resolve;
          }),
          finish() {
            voice.state = "ended";
            done();
          },
        };
        voices.push(voice);
        return voice;
      }),
    };
    return sound;
  }
  const audio = {
    state: "running",
    native: { context: clock },
    sound(recipe: Recipe) {
      const sound = fakeSound(recipe);
      sounds.set(recipe, sound);
      return sound;
    },
    bus(name: string) {
      const bus = { name, setGainDb: vi.fn(), dispose: vi.fn() };
      buses.push(bus);
      return bus;
    },
    subscribe(fn: typeof listener) {
      listener = fn;
      return unsubscribe;
    },
  } as unknown as AudioEngine & { state: string };
  const phases: RiftPhase[] = [];
  const disturbances: unknown[] = [];
  const rift = createRift(audio, {
    phase: (value) => phases.push(value),
    disturbance: (value) => disturbances.push(value),
  });
  const of = (recipe: Recipe) => sounds.get(recipe)!;
  const advance = async (seconds: number) => {
    clock.currentTime += seconds;
    await vi.advanceTimersByTimeAsync(seconds * 1000);
  };
  return {
    rift,
    audio,
    clock,
    buses,
    phases,
    disturbances,
    unsubscribe,
    advance,
    field: () => of(recipes.riftField),
    of,
    interrupt: (state = "interrupted") => listener(state),
    played: () =>
      [...sounds.values()].reduce(
        (sum, sound) => sum + sound.play.mock.calls.length,
        0,
      ),
  };
}

test("the installed recipe module exports only valid recipes that compile at extrema", () => {
  for (const recipe of Object.values(recipes)) {
    expect(validateRecipe(recipe).ok).toBe(true);
    expect(validateRecipe(JSON.parse(JSON.stringify(recipe))).ok).toBe(true);
    for (const edge of ["min", "default", "max"] as const) {
      const controls = Object.fromEntries(
        Object.entries("parameters" in recipe ? recipe.parameters : {}).map(
          ([name, parameter]) => [name, parameter[edge]],
        ),
      );
      for (const seed of [0, 42, 0xffffffff])
        expect(compile(recipe, controls, seed)).toEqual(
          compile(recipe, controls, seed),
        );
    }
  }
});

test("every recipe keeps a Nyquist margin across seeds, extrema and sample rates", () => {
  for (const recipe of Object.values(recipes))
    for (const edge of ["min", "default", "max"] as const) {
      const controls = Object.fromEntries(
        Object.entries("parameters" in recipe ? recipe.parameters : {}).map(
          ([name, parameter]) => [name, parameter[edge]],
        ),
      );
      for (const seed of [0, 7, 42, 0xffffffff]) {
        const plan = compile(recipe, controls, seed);
        for (const rate of [22050, 32000, 44100, 48000])
          expect(() => checkNyquist(plan, rate)).not.toThrow();
      }
    }
});

test("each shape control moves its own acoustic responsibility", () => {
  const at = (controls: Record<string, number>) =>
    compile(recipes.riftField, {
      aperture: 0.5,
      tension: 0.35,
      instability: 0.2,
      drift: 0.5,
      breath: 0.5,
      ...controls,
    });
  const layer = (plan: ReturnType<typeof at>, id: string) =>
    plan.layers.find((entry) => entry.layer.id === id)!.layer;
  const frequency = (plan: ReturnType<typeof at>, id: string) => {
    const source = layer(plan, id).source;
    return source.type === "oscillator" ? (source.frequency as number) : 0;
  };
  // Aperture exposes mass without retuning the anchored low pressure.
  expect(layer(at({ aperture: 1 }), "mode-c").gainDb).toBeGreaterThan(
    layer(at({ aperture: 0 }), "mode-c").gainDb + 30,
  );
  expect(frequency(at({ aperture: 1 }), "pressure")).toBe(
    frequency(at({ aperture: 0 }), "pressure"),
  );
  // Tension stretches inharmonic mode ratios and speeds up beating.
  const ratio = (plan: ReturnType<typeof at>) =>
    frequency(plan, "mode-d") / frequency(plan, "membrane");
  expect(ratio(at({ tension: 1 }))).toBeGreaterThan(
    ratio(at({ tension: 0 })) + 0.7,
  );
  const beat = (plan: ReturnType<typeof at>) =>
    frequency(plan, "mode-c-strain") - frequency(plan, "mode-c");
  expect(beat(at({ tension: 1 }))).toBeGreaterThan(
    beat(at({ tension: 0 })) * 5,
  );
  // Instability adds roughness and turbulence, not pitch.
  expect(
    layer(at({ instability: 1 }), "rough-sideband").gainDb,
  ).toBeGreaterThan(
    layer(at({ instability: 0 }), "rough-sideband").gainDb + 40,
  );
  expect(frequency(at({ instability: 1 }), "membrane")).toBe(
    frequency(at({ instability: 0 }), "membrane"),
  );
});

test("the pure transition function owns the lifecycle", () => {
  const events: RiftEvent[] = [
    "open",
    "settle",
    "cancel",
    "collapse",
    "collapsed",
    "stop",
  ];
  const table: Record<RiftPhase, RiftPhase[]> = {
    idle: ["opening", "idle", "idle", "idle", "idle", "idle"],
    opening: ["opening", "active", "idle", "opening", "opening", "idle"],
    active: ["active", "active", "active", "collapsing", "active", "idle"],
    collapsing: [
      "collapsing",
      "collapsing",
      "collapsing",
      "collapsing",
      "idle",
      "idle",
    ],
  };
  for (const [phase, expected] of Object.entries(table))
    expect(events.map((event) => nextPhase(phase as RiftPhase, event))).toEqual(
      expected,
    );
});

test("Idle, Opening, Active, Collapsing, Idle with one live field voice", async () => {
  const s = setup();
  const opened = s.rift.open({ aperture: 0.2 });
  expect(opened?.at).toBeCloseTo(0.01);
  expect(s.rift.open()).toBeUndefined();
  expect(s.field().play).toHaveBeenCalledTimes(1);
  s.rift.update({ aperture: 0.7, tension: Infinity, instability: -3 });
  expect(s.field().voices[0].set).toHaveBeenLastCalledWith({
    aperture: 0.7,
    tension: 0.35,
    instability: 0,
  });
  s.rift.settle();
  expect(s.rift.phase).toBe("active");
  const timeline = s.rift.collapse()!;
  expect(timeline.implodeAt).toBeGreaterThan(timeline.at);
  expect(s.rift.collapse()).toBeUndefined();
  const updates = s.field().voices[0].set.mock.calls.length;
  s.rift.update({ aperture: 1 });
  expect(s.field().voices[0].set.mock.calls.length).toBe(updates);
  expect(s.of(recipes.riftImplosion).voices[0].options.at).toBe(
    timeline.implodeAt,
  );
  await s.advance(1.2);
  expect(s.field().voices[0].stop).toHaveBeenCalled();
  s.of(recipes.riftImplosion).voices[0].finish();
  await settle();
  expect(s.phases).toEqual(["opening", "active", "collapsing", "idle"]);
  expect(s.rift.open()).toBeDefined();
  expect(s.field().play).toHaveBeenCalledTimes(2);
  s.rift.dispose();
});

test("an old session's tails and timers change nothing after a new open", async () => {
  const s = setup();
  s.rift.open();
  s.rift.settle();
  s.rift.collapse();
  const oldField = s.field().voices[0];
  const oldImplosion = s.of(recipes.riftImplosion).voices[0];
  s.rift.stop();
  s.rift.open();
  s.rift.settle();
  const fresh = s.field().voices[1];
  const freshBuses = s.buses.slice(-2);
  const plays = s.played();
  const phases = [...s.phases];
  // The old collapse timers, field end and implosion end all fire late.
  oldField.finish();
  oldImplosion.finish();
  await settle();
  await s.advance(0.5);
  expect(s.rift.phase).toBe("active");
  expect(s.phases).toEqual(phases);
  expect(fresh.stop).not.toHaveBeenCalled();
  for (const bus of freshBuses) {
    expect(bus.dispose).not.toHaveBeenCalled();
    expect(bus.setGainDb).not.toHaveBeenCalledWith(-60, expect.anything());
  }
  expect(oldField.stop).not.toHaveBeenCalled();
  expect(s.played() - plays).toBeLessThanOrEqual(2);
  expect(s.of(recipes.riftImplosion).play).toHaveBeenCalledTimes(1);
  s.rift.dispose();
});

test("evolution refills on one timer with bounded audio-clock disturbances", async () => {
  const s = setup();
  s.rift.open({ aperture: 1, tension: 1, instability: 1 });
  s.rift.settle();
  s.of(recipes.riftOpening).voices[0].finish();
  await settle();
  for (let tick = 0; tick < 30; tick++) {
    const before = s.disturbances.length;
    await s.advance(evolutionPeriod);
    expect(s.disturbances.length - before).toBeLessThanOrEqual(2);
    expect(vi.getTimerCount()).toBe(1);
  }
  // Never-ending disturbances fill the four-voice budget and stop new ones.
  expect(s.disturbances.length).toBe(4);
  const sets = s.field().voices[0].set.mock.calls.map(([value]) => value);
  const drifts = sets
    .filter((value) => "drift" in value)
    .map((value) => value.drift);
  expect(new Set(drifts).size).toBeGreaterThan(10);
  for (const value of drifts) expect(value).toBeGreaterThanOrEqual(0);
  for (const event of s.disturbances as { at: number }[])
    expect(event.at).toBeGreaterThan(0);
  s.rift.stop();
  const ticks = s.field().voices[0].set.mock.calls.length;
  await s.advance(5);
  expect(s.field().voices[0].set.mock.calls.length).toBe(ticks);
  expect(vi.getTimerCount()).toBe(0);
  s.rift.dispose();
});

test("a collapse expires pending evolution so it cannot undo the contraction", async () => {
  const s = setup();
  s.rift.open();
  s.rift.settle();
  await s.advance(0.5);
  s.rift.collapse();
  const fieldBus = s.buses.find((bus) => bus.name.endsWith("-field"))!;
  const sets = s.field().voices[0].set.mock.calls.length;
  await s.advance(evolutionPeriod);
  expect(fieldBus.setGainDb).toHaveBeenLastCalledWith(-60, expect.any(Number));
  expect(s.field().voices[0].set.mock.calls.length).toBe(sets);
  s.rift.dispose();
});

test("the field ending during a collapse cannot cut the implosion short", async () => {
  // Guards the field's own generation check: its voice is still current here.
  const s = setup();
  s.rift.open();
  s.rift.settle();
  s.rift.collapse();
  s.field().voices[0].finish();
  await settle();
  expect(s.rift.phase).toBe("collapsing");
  expect(s.buses[0].setGainDb).not.toHaveBeenCalledWith(-60, 0.02);
  s.of(recipes.riftImplosion).voices[0].finish();
  await settle();
  expect(s.rift.phase).toBe("idle");
  s.rift.dispose();
});

test("cancel heals an incomplete opening and never collapses", async () => {
  const s = setup();
  s.rift.open();
  s.rift.cancel();
  expect(s.rift.phase).toBe("idle");
  expect(s.buses[0].setGainDb).toHaveBeenLastCalledWith(-60, 0.25);
  s.rift.open();
  s.rift.settle();
  s.rift.cancel();
  expect(s.rift.phase).toBe("active");
  expect(s.of(recipes.riftCollapse).play).not.toHaveBeenCalled();
  await s.advance(1);
  expect(s.buses[0].dispose).toHaveBeenCalledTimes(1);
  s.rift.dispose();
});

test("stop and dispose are repeatable and leave no timers, voices or buses", async () => {
  const s = setup();
  s.rift.open({ instability: 1 });
  s.rift.settle();
  await s.advance(3);
  s.rift.collapse();
  s.rift.stop();
  s.rift.stop();
  expect(s.rift.phase).toBe("idle");
  s.rift.open();
  s.rift.dispose();
  s.rift.dispose();
  s.rift.stop();
  expect(vi.getTimerCount()).toBe(0);
  for (const bus of s.buses.filter((bus) => !bus.name.endsWith("-field")))
    expect(bus.dispose).toHaveBeenCalledTimes(1);
  expect(s.unsubscribe).toHaveBeenCalledTimes(1);
  for (const recipe of Object.values(recipes))
    expect(s.of(recipe).dispose).toHaveBeenCalledTimes(1);
  expect(s.rift.open()).toBeUndefined();
  expect(s.rift.collapse()).toBeUndefined();
  expect(s.phases.at(-1)).toBe("idle");
});

test("interruption stops an open fracture; open requires a running engine", () => {
  const s = setup();
  s.rift.open();
  s.interrupt();
  expect(s.rift.phase).toBe("idle");
  s.audio.state = "suspended";
  expect(s.rift.open()).toBeUndefined();
  s.rift.dispose();
});
