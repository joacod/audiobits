import { expect, it } from "vitest";
import { defineSound, validateRecipe } from "../src/recipe/validate";
import { impact } from "../../../catalog/recipes/impact/recipe";
import { thruster } from "../../../catalog/recipes/thruster/recipe";
import { compile } from "../src/compiler/plan";
import { checkNyquist } from "../src/compiler/graph";
import { randomFor, noiseData, controlsFor } from "../src/compiler/values";

const clone = (input: unknown) => JSON.parse(JSON.stringify(input));
it("accepts dynamic snapshots and rejects all possible invalid mapping values", () => {
  expect(validateRecipe(impact).ok).toBe(true);
  expect(validateRecipe(thruster).ok).toBe(true);
  const mutations = [
    (data: ReturnType<typeof clone>) => {
      data.duration = 1;
    },
    (data: ReturnType<typeof clone>) => {
      data.parameters.throttle.default = 2;
    },
    (data: ReturnType<typeof clone>) => {
      data.parameters.throttle.max = 0;
    },
    (data: ReturnType<typeof clone>) => {
      data.parameters.throttle.smoothing = 0;
    },
    (data: ReturnType<typeof clone>) => {
      data.layers[0].source.frequency.range[1] = 20001;
    },
    (data: ReturnType<typeof clone>) => {
      data.layers[0].gainDb.range[1] = 1;
    },
    (data: ReturnType<typeof clone>) => {
      data.layers[0].source.frequency.control = "missing";
    },
    (data: ReturnType<typeof clone>) => {
      data.layers[0].source.frequency = { random: [440, 20001] };
    },
    (data: ReturnType<typeof clone>) => {
      data.layers[0].source.frequency = { random: [500, 200] };
    },
    (data: ReturnType<typeof clone>) => {
      data.layers[0].gainDb = {
        control: "throttle",
        range: [-30, -18],
        scale: "exponential",
      };
    },
    (data: ReturnType<typeof clone>) => {
      data.layers[0].source.frequency = {
        points: [[0, data.layers[0].source.frequency]],
        curve: "linear",
      };
    },
    (data: ReturnType<typeof clone>) => {
      data.parameters = Object.fromEntries(
        Array.from({ length: 17 }, (_, i) => [
          `p${i}`,
          { min: 0, max: 1, default: 0, mode: "play" },
        ]),
      );
    },
    (data: ReturnType<typeof clone>) => {
      data.parameters["bad-name"] = data.parameters.throttle;
    },
  ];
  for (const mutate of mutations) {
    const data = clone(thruster);
    mutate(data);
    expect(validateRecipe(data).ok, JSON.stringify(data)).toBe(false);
  }
  const extrema = clone(thruster);
  extrema.layers[0].source.frequency.range[1] = 20000;
  expect(() =>
    checkNyquist(compile(defineSound(extrema), { throttle: 0 }), 32000),
  ).toThrow(/Nyquist/);
});
it("supports bounded onset automation for sustained sources and filters", () => {
  const data = clone(thruster);
  data.layers[0].source.frequency = {
    points: [
      [0, 100],
      [60, 200],
    ],
    curve: "exponential",
  };
  data.layers[1].effects[0].frequency = {
    points: [
      [0, 200],
      [60, 300],
    ],
    curve: "linear",
  };
  expect(validateRecipe(data).ok).toBe(true);
  data.layers[0].source.frequency.points[1][0] = 61;
  expect(validateRecipe(data).ok).toBe(false);
});
it("pins xorshift32 vectors including the public zero seed mapping", () => {
  const random = randomFor(1);
  expect(Array.from({ length: 5 }, () => random() * 0x100000000)).toEqual([
    270369, 67634689, 2647435461, 307599695, 2398689233,
  ]);
  const zero = randomFor(0);
  const mapped = randomFor(0x6d2b79f5);
  expect(Array.from({ length: 8 }, () => zero())).toEqual(
    Array.from({ length: 8 }, () => mapped()),
  );
  for (const seed of [-1, 0x100000000, 1.1, NaN, Infinity])
    expect(() => randomFor(seed)).toThrow(/Seed/);
});
it("resolves variation deterministically despite object insertion order", () => {
  const data = clone(impact);
  data.layers[1].gainDb = { random: [-26, -22] };
  const recipe = defineSound(data);
  const reordered = defineSound(
    Object.fromEntries(Object.entries(data).reverse()),
  );
  const plan = compile(recipe, { intensity: 1 }, 42);
  expect(compile(reordered, { intensity: 1 }, 42)).toEqual(plan);
  expect(compile(recipe, { intensity: 1 }, 43)).not.toEqual(plan);
  expect(plan.layers[1].layer.gainDb).toBeGreaterThanOrEqual(-26);
  expect(plan.layers[1].layer.gainDb).toBeLessThanOrEqual(-22);
  expect(Object.isFrozen(recipe.parameters)).toBe(true);
  const constructor = defineSound({
    ...thruster,
    parameters: { constructor: { min: 0, max: 1, default: 0.5, mode: "play" } },
    layers: [{ ...impact.layers[1], effects: [] }],
  });
  expect(controlsFor(constructor)).toEqual({ constructor: 0.5 });
});
it("generates reproducible bounded seam-treated noise at both core sample rates", () => {
  for (const rate of [44100, 48000]) {
    const data = noiseData(rate, 42);
    expect(data).toEqual(noiseData(rate, 42));
    expect(data).not.toEqual(noiseData(rate, 43));
    expect(data.byteLength).toBe(rate * 4);
    expect(
      data.every((sample) => Number.isFinite(sample) && Math.abs(sample) <= 1),
    ).toBe(true);
    const seam = Math.round(rate * 0.02);
    // Loop boundary equals an ordinary adjacent pair from the seeded prefix.
    expect(data.at(-1)).toBe(data[seam - 1]);
    expect(data[seam] - data.at(-1)!).toBe(data[seam] - data[seam - 1]);
  }
  for (const rate of [7999, 192001, Infinity])
    expect(() => noiseData(rate, 1)).toThrow(/Noise/);
});

it("bounds independent detune across the entire contour and declared control ranges", () => {
  const recipe = clone(thruster);
  recipe.layers = [recipe.layers[0]];
  recipe.layers[0].source.frequency = {
    points: [
      [0, 1000],
      [0.2, { random: [2000, 8000] }],
    ],
    curve: "exponential",
  };
  recipe.layers[0].source.detune = {
    control: "throttle",
    range: [-1200, 1200],
    scale: "linear",
  };
  expect(validateRecipe(recipe).ok).toBe(true);
  const plan = compile(defineSound(recipe), { throttle: 0 });
  expect(() => checkNyquist(plan, 32000)).toThrow(/Nyquist/);
  expect(() => checkNyquist(plan, 44100)).not.toThrow();
  for (const detune of [
    4801,
    -4801,
    NaN,
    { random: [0, 100] },
    { points: [[0, 0]], curve: "linear" },
    { control: "missing", range: [0, 100], scale: "linear" },
    { control: "throttle", range: [-200, 200], scale: "exponential" },
    { control: "throttle", range: [0, 4801], scale: "linear" },
    2400,
  ]) {
    expect(
      validateRecipe({
        ...recipe,
        layers: [
          {
            ...recipe.layers[0],
            source: { ...recipe.layers[0].source, detune },
          },
        ],
      }).ok,
    ).toBe(false);
  }
  recipe.layers[0].source.frequency.points[0][1] = 30;
  expect(validateRecipe(recipe).ok).toBe(false);
  recipe.layers[0].source.frequency.points[0][1] = {
    control: "throttle",
    range: [1000, 2000],
    scale: "linear",
  };
  const result = validateRecipe(recipe);
  expect(result.ok).toBe(false);
  if (!result.ok)
    expect(result.issues.some((issue) => issue.code === "mode")).toBe(true);
});

it("absent and zero detune preserve resolved values and seeded traversal", () => {
  const original = compile(impact, { intensity: 0.5 }, 42);
  const data = clone(impact);
  for (const layer of data.layers)
    if (layer.source.type === "oscillator") layer.source.detune = 0;
  const neutral = compile(defineSound(data), { intensity: 0.5 }, 42);
  expect(
    neutral.layers.map(({ layer, noiseSeed }) => ({ layer, noiseSeed })),
  ).toEqual(
    original.layers.map(({ layer, noiseSeed }) => ({ layer, noiseSeed })),
  );
});
