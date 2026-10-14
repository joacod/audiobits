import { expect, test, vi } from "vitest";
import {
  validateRecipe,
  type AudioEngine,
  type AudioState,
  type PlayOptions,
  type Recipe,
} from "audiobits";
import * as recipes from "../catalog/experiences/echo-probe/recipe";
import { createEchoProbe } from "../catalog/experiences/echo-probe/controller";
import { compile } from "../packages/audiobits/src/compiler/plan";

test("all acoustic definitions round-trip and compile deterministically at extrema", () => {
  for (const recipe of Object.values(recipes)) {
    expect(validateRecipe(recipe).ok).toBe(true);
    expect(validateRecipe(JSON.parse(JSON.stringify(recipe))).ok).toBe(true);
    for (const surface of [0, 0.5, 1])
      for (const seed of [0, 42, 0xffffffff]) {
        const controls = "parameters" in recipe ? { surface } : {};
        expect(compile(recipe, controls, seed)).toEqual(
          compile(recipe, controls, seed),
        );
      }
  }
});

function setup() {
  let time = 10;
  let state: AudioState = "running";
  const calls: {
    recipe: Recipe;
    options: PlayOptions;
    stop: ReturnType<typeof vi.fn>;
    finish(): void;
  }[] = [];
  const disposals: ReturnType<typeof vi.fn>[] = [];
  let listener!: (state: AudioState) => void;
  const unsubscribe = vi.fn();
  let fail = false;
  const audio = {
    get state() {
      return state;
    },
    native: {
      context: {
        get currentTime() {
          return time;
        },
      },
    },
    sound(recipe: Recipe) {
      const dispose = vi.fn();
      disposals.push(dispose);
      return {
        play(options: PlayOptions) {
          if (fail && calls.length === 2) throw new Error("graph failed");
          let finish!: () => void;
          const ended = new Promise<void>((done) => {
            finish = done;
          });
          const stop = vi.fn();
          calls.push({ recipe, options, stop, finish });
          return { stop, ended };
        },
        dispose,
      };
    },
    subscribe(fn: typeof listener) {
      listener = fn;
      return unsubscribe;
    },
  } as unknown as AudioEngine;
  return {
    control: createEchoProbe(audio),
    calls,
    disposals,
    unsubscribe,
    advance() {
      time += 0.2;
    },
    interrupt() {
      state = "interrupted";
      listener(state);
    },
    fail() {
      fail = true;
    },
    finish() {
      calls.forEach((call) => call.finish());
    },
  };
}
const wall = { distance: 0.5, pan: -0.8, intensity: 0.9, surface: 0.8 };

test("audio-clock scheduling, normalized values, zero returns, and repeatable seeds", async () => {
  const s = setup();
  const event = s.control.emit(
    [wall, { distance: 9, pan: Infinity, intensity: -2, surface: NaN }],
    { seed: 7 },
  )!;
  expect(event.at).toBeCloseTo(10.012, 10);
  expect(event.reflections).toHaveLength(1);
  expect(event.reflections[0]).toMatchObject(wall);
  expect(event.reflections[0].at).toBeCloseTo(event.at + 0.54, 10);
  expect(s.calls.map((call) => call.options.at)).toEqual([
    event.at,
    event.reflections[0].at,
    event.reflections[0].at + 0.037 + 0.5 * 0.045,
  ]);
  expect(s.calls[1].options.parameters).toEqual({
    surface: 0.8 * (1 - 0.55 * 0.5),
  });
  const options = s.calls.map((call) => call.options);
  s.finish();
  await event.ended;
  s.advance();
  s.control.emit([wall], { seed: 7 });
  expect(s.calls.slice(3).map((call) => ({ ...call.options, at: 0 }))).toEqual(
    options.map((value) => ({ ...value, at: 0 })),
  );
  s.control.dispose();
});

test("overlap, cooldown, stop tails, and repeated bursts stay bounded", async () => {
  const s = setup();
  const first = s.control.emit(Array(100).fill(wall))!;
  expect(first.reflections).toHaveLength(6);
  expect(s.calls).toHaveLength(13);
  expect(s.control.emit([wall])).toBeNull();
  s.advance();
  s.control.emit(Array(100).fill(wall));
  expect(s.calls).toHaveLength(26);
  s.advance();
  expect(s.control.emit([wall])).toBeNull();
  s.control.stop();
  for (const call of s.calls) expect(call.stop).toHaveBeenCalled();
  expect(s.control.active).toBe(2);
  expect(s.control.emit([wall])).toBeNull();
  s.finish();
  await first.ended;
  await Promise.resolve();
  expect(s.control.active).toBe(0);
  for (let index = 0; index < 100; index++) {
    s.advance();
    const event = s.control.emit([wall])!;
    event.stop();
    s.finish();
    await event.ended;
    expect(s.control.active).toBe(0);
  }
});

test("invalid extrema, silence, interruption, rollback, and disposal own only this controller", async () => {
  const s = setup();
  expect(s.control.emit([wall], { strength: NaN })).toBeNull();
  const event = s.control.emit(
    [{ distance: NaN, pan: -99, intensity: 99, surface: Infinity }],
    { strength: 99, seed: Infinity },
  )!;
  expect(event.reflections[0]).toMatchObject({
    distance: 0,
    pan: -1,
    intensity: 1,
    surface: 0,
  });
  s.interrupt();
  expect(s.control.emit([wall])).toBeNull();
  for (const call of s.calls) expect(call.stop).toHaveBeenCalled();
  s.control.dispose();
  s.control.dispose();
  expect(s.unsubscribe).toHaveBeenCalledOnce();
  for (const dispose of s.disposals) expect(dispose).toHaveBeenCalledOnce();
  expect(s.control.emit([])).toBeNull();
  const broken = setup();
  broken.fail();
  expect(() => broken.control.emit([wall])).toThrow("graph failed");
  for (const call of broken.calls) expect(call.stop).toHaveBeenCalledOnce();
  broken.finish();
  await Promise.resolve();
  await Promise.resolve();
  expect(broken.control.active).toBe(0);
});
