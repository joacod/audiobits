import { expect, test, vi } from "vitest";
import {
  validateRecipe,
  type AudioEngine,
  type AudioState,
  type PlayOptions,
  type Recipe,
} from "audiobits";
import * as recipes from "../catalog/experiences/echo-probe/controller";
import * as installed from "../catalog/experiences/echo-probe/recipe";
import * as baseline from "../catalog/experiences/echo-probe/baseline";
import { createEchoProbe } from "../catalog/experiences/echo-probe/controller";
import { compile } from "../packages/audiobits/src/compiler/plan";
import { checkNyquist } from "../packages/audiobits/src/compiler/graph";

const wall = { distance: 0.5, pan: -0.8, intensity: 0.9, surface: 0.8 };

const sounds = [
  recipes.echoProbe,
  ...Object.values(recipes.probeReturns),
  ...Object.values(recipes.probeEchoes),
];
const ids = Object.keys(recipes.materials) as recipes.MaterialId[];

test("the installed recipe module exports only valid recipes", () => {
  // Package installs validate every recipe.ts export as a recipe.
  for (const recipe of Object.values(installed))
    expect(validateRecipe(recipe).ok).toBe(true);
});

test("definitions validate, round-trip, and compile deterministically", () => {
  for (const recipe of [...sounds, ...Object.values(baseline)]) {
    expect(validateRecipe(recipe).ok).toBe(true);
    expect(validateRecipe(JSON.parse(JSON.stringify(recipe))).ok).toBe(true);
    for (const distance of [0, 1])
      for (const seed of [0, 42, 0xffffffff]) {
        const controls =
          "parameters" in recipe
            ? Object.fromEntries(
                Object.keys(recipe.parameters).map((k) => [
                  k,
                  k === "distance" ? distance : 0.5,
                ]),
              )
            : {};
        expect(compile(recipe, controls, seed)).toEqual(
          compile(recipe, controls, seed),
        );
      }
  }
  // The approved pulse keeps only its struck body and air edge.
  expect(recipes.echoProbe.layers.map((layer) => layer.id)).toEqual([
    "struck-body",
    "air-edge",
  ]);
});

test("distance damps propagation without retuning the material", () => {
  for (const id of ids) {
    const near = compile(recipes.probeReturns[id], { distance: 0 }, 7);
    const far = compile(recipes.probeReturns[id], { distance: 1 }, 7);
    expect(near.layers).toEqual(far.layers);
    expect(near.effects[0].frequency).toBeGreaterThan(
      far.effects[0].frequency as number,
    );
  }
});

test("each material has a distinct, ordered acoustic signature", () => {
  const signature = (id: recipes.MaterialId) => {
    const m = recipes.materials[id];
    const plan = compile(recipes.probeReturns[id], { distance: 0 }, 7);
    const modes = m.partials.map(([ratio, , , detune = 0]) =>
      Math.round(m.fundamental * ratio + detune),
    );
    return {
      exciter: m.exciter.id,
      modes,
      lowest: Math.min(...modes),
      ring: Math.max(...m.partials.map(([, , decay]) => decay)),
      lifetime: plan.lifetime,
      echo: m.echo,
    };
  };
  const wood = signature("wood"),
    glass = signature("glass"),
    metal = signature("metal");
  // No two materials share an exciter, a mode set, or an echo.
  for (const [a, b] of [
    [wood, glass],
    [wood, metal],
    [glass, metal],
  ]) {
    expect(a.exciter).not.toBe(b.exciter);
    expect(a.modes).not.toEqual(b.modes);
    expect(a.echo).not.toEqual(b.echo);
  }
  // Wood knocks short and dry, metal rings longest, glass sits highest.
  expect(wood.ring).toBeLessThan(glass.ring);
  expect(glass.ring).toBeLessThan(metal.ring);
  expect(wood.lifetime).toBeLessThan(glass.lifetime);
  expect(glass.lifetime).toBeLessThan(metal.lifetime);
  expect(glass.lowest).toBeGreaterThan(metal.lowest);
  expect(metal.lowest).toBeGreaterThan(wood.lowest);
  expect(wood.echo.feedback).toBeLessThan(glass.echo.feedback);
  expect(glass.echo.feedback).toBeLessThan(metal.echo.feedback);
  expect(wood.echo.time[1]).toBeLessThan(glass.echo.time[0]);
  expect(glass.echo.time[1]).toBeLessThan(metal.echo.time[0]);
  // Metal beats through detuned pairs; glass shimmers through one.
  const beating = (id: recipes.MaterialId) =>
    recipes.materials[id].partials.filter(([, , , detune = 0]) => detune > 0)
      .length;
  expect(beating("wood")).toBe(0);
  expect(beating("glass")).toBe(1);
  expect(beating("metal")).toBe(2);
});

test("every material frequency keeps a Nyquist margin at 32 kHz", () => {
  // Below 12 kHz leaves 25% headroom under a 16 kHz Nyquist.
  for (const recipe of sounds) {
    const plan = compile(
      recipe,
      "parameters" in recipe ? { distance: 0 } : {},
      7,
    );
    expect(() => checkNyquist(plan, 32000)).not.toThrow();
  }
  for (const id of ids) {
    const m = recipes.materials[id];
    const frequencies = [
      ...m.partials.map(
        ([ratio, , , detune = 0]) => m.fundamental * ratio + detune,
      ),
      ...m.damping,
      m.exciter.frequency,
    ];
    expect(Math.max(...frequencies)).toBeLessThan(12000);
  }
});

test("surface fallback maps to wood, metal, and glass at the documented thresholds", () => {
  expect(recipes.materialFor(0)).toBe("wood");
  expect(recipes.materialFor(0.29)).toBe("wood");
  expect(recipes.materialFor(0.3)).toBe("metal");
  expect(recipes.materialFor(0.74)).toBe("metal");
  expect(recipes.materialFor(0.75)).toBe("glass");
  expect(recipes.materialFor(1)).toBe("glass");
  for (const id of ids)
    expect(recipes.materialFor(recipes.materials[id].surface)).toBe(id);
});

test("controller plays the explicit material or falls back from surface", () => {
  const recipeFor = (
    reflection: Partial<typeof wall> & { material?: recipes.MaterialId },
  ) => {
    const s = setup();
    const event = s.control.emit([{ ...wall, ...reflection }], { seed: 7 })!;
    s.control.dispose();
    return {
      material: event.reflections[0].material,
      early: s.calls[1].recipe,
      late: s.calls.slice(2).map((call) => call.recipe),
    };
  };
  for (const [surface, id] of [
    [0.1, "wood"],
    [0.5, "metal"],
    [0.9, "glass"],
    [NaN, "wood"],
  ] as const) {
    const result = recipeFor({ surface });
    expect(result.material).toBe(id);
    expect(result.early).toBe(recipes.probeReturns[id]);
    for (const late of result.late) expect(late).toBe(recipes.probeEchoes[id]);
  }
  // An explicit material wins over a contradicting surface.
  const explicit = recipeFor({ surface: 0.05, material: "metal" });
  expect(explicit.material).toBe("metal");
  expect(explicit.early).toBe(recipes.probeReturns.metal);
});

test("retired early voices end inside the 90 ms reclaim and stay within budget", () => {
  for (const id of ids) {
    const early = compile(recipes.probeReturns[id], { distance: 0 }, 7);
    // Dry early returns: release plus filter tail, never a native delay tail.
    expect(early.hasDelay).toBe(false);
    expect(
      Math.max(...early.layers.map(({ layer }) => layer.envelope.release)) +
        early.filterTail,
    ).toBeLessThan(0.09);
    expect(compile(recipes.probeEchoes[id], { distance: 0 }, 7).hasDelay).toBe(
      true,
    );
  }
  // Worst case full group: pulse, six early and three late voices of metal.
  const sources = (recipe: Recipe) => recipe.layers.length;
  const group =
    sources(recipes.echoProbe) +
    6 * sources(recipes.probeReturns.metal) +
    3 * sources(recipes.probeEchoes.metal);
  expect(group).toBe(65);
  const delay =
    3 * Math.max(...ids.map((id) => recipes.materials[id].echo.time[1]));
  expect(delay).toBeCloseTo(0.96, 10);
});

function setup(preparationSeconds = 0) {
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
    get native() {
      if (state === "disposed") throw new Error("Engine no longer available");
      return {
        context: {
          get currentTime() {
            return time;
          },
        },
      };
    },
    sound(recipe: Recipe) {
      time += preparationSeconds;
      const own: typeof calls = [];
      const dispose = vi.fn(() => own.forEach((call) => call.finish()));
      disposals.push(dispose);
      return {
        play(options: PlayOptions) {
          if (options.at! < time) throw new Error("scheduled in the past");
          if (fail && calls.length === 2) throw new Error("graph failed");
          let finish!: () => void;
          const ended = new Promise<void>((done) => {
            finish = done;
          });
          const call = { recipe, options, stop: vi.fn(), finish };
          calls.push(call);
          own.push(call);
          return { stop: call.stop, ended };
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
    setTime(seconds: number) {
      time = seconds;
    },
    advance(seconds = 0.12) {
      time += seconds;
    },
    interrupt() {
      state = "interrupted";
      listener(state);
    },
    shutdown() {
      state = "disposed";
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

test("audio-clock returns and sparse late cluster use independent bounded controls", async () => {
  const s = setup();
  const event = s.control.emit(
    [wall, { distance: 9, pan: Infinity, intensity: -2, surface: NaN }],
    { seed: 7 },
  )!;
  expect(event.at).toBeCloseTo(10.012, 10);
  expect(event.reflections).toHaveLength(1);
  expect(event.reflections[0]).toMatchObject(wall);
  expect(event.reflections[0].at).toBeCloseTo(event.at + 0.54, 10);
  expect(s.calls).toHaveLength(5);
  expect(s.calls[1].options).toMatchObject({
    at: event.reflections[0].at,
    seed: 7,
    pan: wall.pan,
    parameters: { distance: wall.distance },
  });
  for (const call of s.calls.slice(2)) {
    expect(call.options.at).toBeGreaterThan(event.reflections[0].at + 0.11);
    expect(call.options.gainDb).toBeLessThan(s.calls[1].options.gainDb!);
  }
  expect(new Set(s.calls.slice(2).map((c) => c.options.seed)).size).toBe(3);
  expect(s.calls[2].options.pan).toBeLessThan(0);
  expect(s.calls[3].options.pan).toBeGreaterThan(0);
  const options = s.calls.map((call) => call.options);
  s.finish();
  await event.ended;
  s.advance();
  s.control.emit([wall], { seed: 7 });
  expect(s.calls.slice(5).map((call) => ({ ...call.options, at: 0 }))).toEqual(
    options.map((value) => ({ ...value, at: 0 })),
  );
  s.control.dispose();
  for (const dispose of s.disposals) expect(dispose).toHaveBeenCalledOnce();
});

test("scheduling reads the audio clock after sound preparation", () => {
  const s = setup(0.02);
  try {
    const event = s.control.emit([wall])!;
    expect(event.at).toBeCloseTo(10.072, 10);
    expect(s.calls[0].options.at).toBe(event.at);
    expect(event.reflections[0].at - event.at).toBeCloseTo(0.54, 10);
    expect(s.control.active).toBe(1);
  } finally {
    s.control.dispose();
  }
});

test("strength and direction affect only gain or pan, never timing or material", () => {
  const capture = (changes: Partial<typeof wall>, strength = 0.8) => {
    const s = setup();
    s.control.emit([{ ...wall, ...changes }], { seed: 7, strength });
    s.control.dispose();
    return s.calls[1].options;
  };
  const first = capture({});
  expect(capture({ pan: 1 })).toEqual({ ...first, pan: 1 });
  const quiet = capture({ intensity: 0.2 });
  expect(quiet.gainDb).toBeLessThan(first.gainDb!);
  expect({ ...quiet, gainDb: 0 }).toEqual({ ...first, gainDb: 0 });
  expect(capture({}, 0.3).gainDb).toBeLessThan(first.gainDb!);
});

test("cooldown uses the controller clock, not a caller sample before emit", () => {
  const s = setup();
  const callerTime = 10;
  const controllerTime = callerTime + 128 / 48000;
  s.setTime(controllerTime);
  expect(s.control.emit([wall])).not.toBeNull();
  s.setTime(callerTime + 0.12);
  expect(s.control.emit([wall])).toBeNull();
  // Only one group exists: rejection is cooldown, not the three-group bound.
  expect(s.control.active).toBe(1);
  s.setTime(controllerTime + 0.12 - 0.000001);
  expect(s.control.emit([wall])).toBeNull();
  s.setTime(controllerTime + 0.12);
  expect(s.control.emit([wall])).not.toBeNull();
  s.control.dispose();
});

test("120 ms bursts admit new pulses, cancel late energy first, and bound delayed cleanup", async () => {
  const s = setup();
  const first = s.control.emit(Array(100).fill(wall))!;
  expect(first.reflections).toHaveLength(6);
  expect(s.calls).toHaveLength(10);
  expect(s.control.emit([wall])).toBeNull();
  s.advance();
  expect(s.control.emit(Array(6).fill(wall))).not.toBeNull();
  for (const call of s.calls.slice(0, 7))
    expect(call.stop).not.toHaveBeenCalled();
  expect(s.disposals[2]).toHaveBeenCalledOnce();
  expect(s.disposals[0]).not.toHaveBeenCalled();
  expect(s.disposals[1]).not.toHaveBeenCalled();
  // Deliberately withhold ended delivery. Audio-clock expiry must bound ownership.
  for (let index = 0; index < 100; index++) {
    s.advance();
    expect(s.control.emit(Array(6).fill(wall))).not.toBeNull();
    expect(s.control.active).toBeLessThanOrEqual(3);
  }
  expect(s.calls[0].stop).toHaveBeenCalledOnce();
  s.control.stop();
  s.finish();
  await first.ended;
  await Promise.resolve();
  expect(s.control.active).toBe(0);
  s.control.dispose();
  for (const dispose of s.disposals) expect(dispose).toHaveBeenCalledOnce();
});

test("Stop at the same audio time cannot allocate an unbounded number of retiring groups", () => {
  const s = setup();
  for (let i = 0; i < 3; i++) {
    expect(s.control.emit([wall])).not.toBeNull();
    s.control.stop();
  }
  expect(s.control.active).toBe(3);
  expect(s.control.emit([wall])).toBeNull();
  s.advance(0.091);
  expect(s.control.emit([])).not.toBeNull();
  expect(s.control.active).toBe(1);
  s.control.dispose();
});

test("silence, normalization, interruption, rollback, and disposal own only this controller", async () => {
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
  expect(broken.control.active).toBe(0);
  for (const dispose of broken.disposals)
    expect(dispose).toHaveBeenCalledOnce();
  await event.ended;
});

test("cleanup remains safe when the application disposes the engine first", async () => {
  const s = setup();
  const event = s.control.emit([wall])!;
  s.shutdown();
  expect(() => s.control.stop()).not.toThrow();
  expect(() => s.control.dispose()).not.toThrow();
  expect(() => event.stop()).not.toThrow();
  await event.ended;
  expect(s.control.active).toBe(0);
});

test("cancellation time is immediate, immutable, and distinguishes sounded from pending returns", async () => {
  const s = setup();
  const first = s.control.emit([{ ...wall, distance: 0 }, wall])!;
  const scheduled = first.reflections;
  expect(first.cancelledAt).toBeNull();
  expect(Object.isFrozen(first)).toBe(true);
  s.advance();
  const second = s.control.emit([wall])!;
  expect(first.cancelledAt).toBeNull(); // Cancelling only late energy leaves early returns valid.
  s.advance();
  const third = s.control.emit([wall])!;
  expect(first.cancelledAt).toBeCloseTo(10.24, 10);
  expect(first.reflections).toBe(scheduled);
  expect(first.reflections[0].at).toBeLessThan(first.cancelledAt!);
  expect(first.reflections[1].at).toBeGreaterThan(first.cancelledAt!);
  for (const call of s.calls.slice(0, 3))
    expect(call.stop).toHaveBeenCalledOnce();
  expect(second.cancelledAt).toBeNull();
  expect(third.cancelledAt).toBeNull();
  s.advance();
  first.stop();
  s.control.stop();
  expect(first.cancelledAt).toBeCloseTo(10.24, 10);
  expect(second.cancelledAt).toBeCloseTo(10.36, 10);
  expect(third.cancelledAt).toBeCloseTo(10.36, 10);
  s.control.dispose();
  await first.ended;
  expect(first.cancelledAt).toBeCloseTo(10.24, 10);
});

test("natural completion does not mark cancellation; interruption and disposal do immediately", async () => {
  const natural = setup();
  const completed = natural.control.emit([wall])!;
  natural.finish();
  await completed.ended;
  completed.stop();
  expect(completed.cancelledAt).toBeNull();
  natural.control.dispose();
  const interrupted = setup();
  const pending = interrupted.control.emit([wall])!;
  interrupted.advance(0.04);
  interrupted.interrupt();
  expect(pending.cancelledAt).toBeCloseTo(10.04, 10);
  interrupted.control.dispose();
  const disposed = setup();
  const emission = disposed.control.emit([wall])!;
  disposed.advance(0.03);
  disposed.control.dispose();
  expect(emission.cancelledAt).toBeCloseTo(10.03, 10);
  await emission.ended;
});

test("native late repeats retain the material voice and use its own echo", () => {
  for (const id of ids) {
    const m = recipes.materials[id];
    for (const distance of [0, 1]) {
      const wet = compile(recipes.probeEchoes[id], { distance }, 42);
      const dry = compile(recipes.probeReturns[id], { distance }, 42);
      expect(wet.layers).toEqual(dry.layers);
      expect(wet.effectChain.slice(0, -1)).toEqual(dry.effectChain);
      const effect = wet.effectChain.at(-1)!;
      if (effect.type !== "delay") throw new Error("Missing late delay");
      expect(effect).toMatchObject({
        feedback: m.echo.feedback,
        mix: m.echo.mix,
      });
      expect(effect.time).toBeCloseTo(m.echo.time[distance]);
      expect(wet.lifetime).toBeGreaterThan(dry.lifetime);
      expect(Number.isFinite(wet.lifetime)).toBe(true);
    }
  }
});
