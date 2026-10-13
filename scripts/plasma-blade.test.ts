import { expect, test, vi } from "vitest";
import {
  validateRecipe,
  type AudioEngine,
  type Voice,
  type Recipe,
} from "audiobits";
import * as recipes from "../catalog/experiences/plasma-blade/recipe";
import { createPlasmaBlade } from "../catalog/experiences/plasma-blade/controller";
import {
  motionLevel,
  smoothMotion,
  segmentDistance,
} from "../catalog/experiences/plasma-blade/motion";
import { compile } from "../packages/audiobits/src/compiler/plan";

test("all five original recipes round-trip and compile at control/seed extrema", () => {
  for (const recipe of Object.values(recipes)) {
    expect(validateRecipe(recipe).ok).toBe(true);
    expect(validateRecipe(JSON.parse(JSON.stringify(recipe))).ok).toBe(true);
    for (const edge of ["min", "default", "max"] as const) {
      const controls = Object.fromEntries(
        Object.entries("parameters" in recipe ? recipe.parameters : {}).map(
          ([name, p]) => [name, p[edge]],
        ),
      );
      for (const seed of [0, 42, 0xffffffff])
        expect(compile(recipe, controls, seed)).toEqual(
          compile(recipe, controls, seed),
        );
    }
  }
  const rest = compile(recipes.plasmaBlade, {
    motion: 0,
    drift: 0.5,
    sweep: 0,
  });
  const fast = compile(recipes.plasmaBlade, {
    motion: 1,
    drift: 0.5,
    sweep: 1,
  });
  const returning = compile(recipes.plasmaBlade, {
    motion: 1,
    drift: 0.5,
    sweep: -1,
  });
  expect(rest.layers[0].layer.source).toMatchObject({
    frequency: expect.closeTo(96, 10),
  });
  expect(fast.layers[0].layer.source).toMatchObject({
    frequency: expect.closeTo(115.2, 10),
  });
  expect(returning.layers[0].layer.source).toMatchObject({ frequency: 80 });
  expect(fast.layers[0].layer.gainDb).toBeGreaterThan(
    rest.layers[0].layer.gainDb,
  );
  expect(() => compile(recipes.plasmaBlade, { motion: 1.01 })).toThrow();
  expect(() => compile(recipes.plasmaBlade, { sweep: -1.01 })).toThrow();
});

test("motion bounds, frame-independent smoothing, recovery, and swept geometry", () => {
  expect([NaN, Infinity, -4, 0, 600, 1200, 9000].map(motionLevel)).toEqual([
    0, 0, 0, 0, 0.5, 1, 1,
  ]);
  const once = smoothMotion(0, 1, 32);
  expect(smoothMotion(smoothMotion(0, 1, 16), 1, 16)).toBeCloseTo(once, 10);
  expect(smoothMotion(1, 0, 32)).toBeGreaterThan(1 - once);
  expect(smoothMotion(0.5, 1, -16)).toBe(0.5);
  expect(smoothMotion(0.5, 1, NaN)).toBe(0.5);
  expect(smoothMotion(0, 1, 10000)).toBe(smoothMotion(0, 1, 64));
  expect(
    segmentDistance({ x: 50, y: 3 }, { x: 0, y: 0 }, { x: 100, y: 0 }),
  ).toBe(3);
  expect(
    segmentDistance({ x: -4, y: 0 }, { x: 0, y: 0 }, { x: 100, y: 0 }),
  ).toBe(4);
  expect(segmentDistance({ x: 3, y: 4 }, { x: 0, y: 0 }, { x: 0, y: 0 })).toBe(
    5,
  );
});

test("return strokes bend the existing hum and rearm bounded swing accents without stopping", async () => {
  const s = setup();
  s.control.ignite();
  s.resolve();
  await settle();
  for (let i = 0; i < 20; i++) s.control.update(1500, 16, 1);
  expect(s.records[2].play).toHaveBeenCalledTimes(1);
  expect(s.voices[1].set).toHaveBeenLastCalledWith(
    expect.objectContaining({ sweep: expect.closeTo(1, 5) }),
  );
  s.control.update(1500, 16, -1);
  expect(s.records[2].play).toHaveBeenCalledTimes(2);
  expect(s.voices[1].set).toHaveBeenLastCalledWith(
    expect.objectContaining({ sweep: expect.closeTo(-1, 5) }),
  );
  // A reversal inside the cooldown is remembered, but cannot flood accents.
  s.control.update(1500, 16, 1);
  expect(s.records[2].play).toHaveBeenCalledTimes(2);
  for (let i = 0; i < 14; i++) s.control.update(1500, 16, 1);
  expect(s.records[2].play).toHaveBeenCalledTimes(3);
  for (let i = 0; i < 30; i++) s.control.update(0, 16, 1);
  expect(s.control.motion).toBeLessThan(0.01);
  expect(s.records[0].play).toHaveBeenCalledTimes(1);
  s.control.update(NaN, 16, Infinity);
  expect(s.voices[1].set).toHaveBeenLastCalledWith(
    expect.objectContaining({ sweep: 0 }),
  );
  s.control.stop();
  s.control.ignite();
  await settle();
  expect(s.records[0].play).toHaveBeenLastCalledWith(
    expect.objectContaining({
      parameters: { motion: 0, drift: 0.5, sweep: 0 },
    }),
  );
  s.control.dispose();
});

function setup() {
  let resolve!: () => void, reject!: (cause: Error) => void;
  const activation = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = (cause: Error) => {
      listener("suspended");
      no(cause);
    };
  });
  const records: {
    recipe: Recipe;
    play: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
  }[] = [];
  const voices: (Pick<Voice, "stop" | "ended" | "state" | "set"> & {
    finish(): void;
  })[] = [];
  let listener!: (state: string) => void;
  const unsubscribe = vi.fn();
  const audio = {
    state: "running",
    start: vi.fn(() => activation),
    sound(recipe: Recipe) {
      const play = vi.fn(() => {
        let finish!: () => void;
        const voice = {
          state: "active" as const,
          set: vi.fn(),
          stop: vi.fn(),
          ended: new Promise<void>((done) => {
            finish = done;
          }),
          finish: () => finish(),
        };
        voices.push(voice);
        return voice;
      });
      const record = { recipe, play, dispose: vi.fn() };
      records.push(record);
      return record;
    },
    subscribe(fn: typeof listener) {
      listener = fn;
      return unsubscribe;
    },
  } as unknown as AudioEngine;
  const feedback = { state: vi.fn(), error: vi.fn(), impact: vi.fn() };
  return {
    control: createPlasmaBlade(audio, feedback),
    resolve,
    reject,
    records,
    voices,
    audio,
    feedback,
    unsubscribe,
    interrupt: () => listener("interrupted"),
  };
}
const settle = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

test("one hum survives motion updates, swings rearm, target and global cooldowns bound accents", async () => {
  const s = setup();
  s.control.ignite();
  s.control.ignite();
  s.resolve();
  await settle();
  expect(s.audio.start).toHaveBeenCalledTimes(1);
  expect(s.records[0].play).toHaveBeenCalledTimes(1);
  for (let i = 0; i < 20; i++) s.control.update(3000, 16);
  expect(s.records[2].play).toHaveBeenCalledTimes(1);
  for (let i = 0; i < 20; i++) s.control.update(3000, 16);
  expect(s.records[2].play).toHaveBeenCalledTimes(1);
  expect(s.control.impact(0, 9)).toBe(true);
  expect(s.records[3].play).toHaveBeenLastCalledWith(
    expect.objectContaining({ parameters: { force: 1 } }),
  );
  expect(s.control.impact(0, 0.8)).toBe(false);
  expect(s.control.impact(1, 0.8)).toBe(false);
  s.control.update(0, 64);
  s.control.update(0, 64);
  expect(s.control.impact(1, 0.8)).toBe(true);
  for (let i = 0; i < 14; i++) s.control.update(0, 64);
  expect(s.control.impact(0, -4)).toBe(true);
  expect(s.records[3].play).toHaveBeenLastCalledWith(
    expect.objectContaining({ parameters: { force: 0 } }),
  );
  expect(s.control.impact(4, 1)).toBe(false);
  expect(s.control.impact(1, NaN)).toBe(false);
  for (let i = 0; i < 5; i++) s.control.update(3000, 16);
  expect(s.records[2].play).toHaveBeenCalledTimes(2);
  expect(s.records[0].play).toHaveBeenCalledTimes(1);
  expect(s.voices[1].set).toHaveBeenCalled();
  s.control.retract();
  expect(s.records[4].play).toHaveBeenCalledTimes(1);
  expect(s.voices[1].stop).toHaveBeenCalledTimes(1);
  s.control.retract();
  expect(s.records[4].play).toHaveBeenCalledTimes(1);
  s.control.dispose();
  s.control.dispose();
  expect(s.unsubscribe).toHaveBeenCalledTimes(1);
  for (const r of s.records) expect(r.dispose).toHaveBeenCalledTimes(1);
});

for (const action of ["stop", "retract", "dispose"] as const)
  test(`${action} invalidates pending activation`, async () => {
    const s = setup();
    s.control.ignite();
    s.control[action]();
    s.resolve();
    await settle();
    expect(s.voices).toHaveLength(0);
    expect(s.control.state).toBe("stopped");
    s.control.dispose();
  });

test("rapid restart, old ended callbacks, interruption, and post-disposal calls", async () => {
  const s = setup();
  for (let i = 0; i < 8; i++) {
    s.control.ignite();
    s.control.stop();
  }
  s.control.ignite();
  s.resolve();
  await settle();
  expect(s.records[0].play).toHaveBeenCalledTimes(1);
  const first = s.voices[1];
  s.control.stop();
  s.control.ignite();
  await settle();
  first.finish();
  await settle();
  expect(s.control.state).toBe("running");
  s.interrupt();
  expect(s.control.state).toBe("stopped");
  s.control.dispose();
  s.control.ignite();
  s.control.update(1000, 16);
  s.control.impact(0, 1);
  expect(s.records[0].play).toHaveBeenCalledTimes(2);
});

test("activation failure is visible and leaves the controller retryable", async () => {
  const s = setup();
  s.control.ignite();
  s.reject(new Error("denied"));
  await settle();
  expect(s.control.state).toBe("stopped");
  expect(s.feedback.error).toHaveBeenCalled();
  expect(s.voices).toHaveLength(0);
  s.control.dispose();
});
