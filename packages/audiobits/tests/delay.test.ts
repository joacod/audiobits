import { expect, it } from "vitest";
import {
  defineSound,
  validateRecipe,
  type Delay,
  type Recipe,
} from "../src/index";
import { compile } from "../src/compiler/plan";
import { checkNyquist } from "../src/compiler/graph";

const pulse = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.01,
  layers: [
    {
      id: "pulse",
      source: { type: "oscillator", waveform: "sine", frequency: 1000 },
      gainDb: -18,
      envelope: { attack: 0.002, decay: 0, sustain: 1, release: 0.005 },
    },
  ],
});
const delayed = (effect: Delay): Recipe => ({ ...pulse, effects: [effect] });

it("supports defaults, both effect scopes, frozen JSON and seeded play mappings", () => {
  const minimal = defineSound(delayed({ type: "delay", time: 0.24 }));
  expect(compile(minimal).effectChain).toEqual([
    { type: "delay", time: 0.24, feedback: 0, mix: 0.5 },
  ]);
  const input = {
    ...pulse,
    parameters: { space: { min: 0, max: 1, default: 0, mode: "play" } },
    layers: [{ ...pulse.layers[0], effects: [{ type: "delay", time: 0.1 }] }],
    effects: [
      {
        type: "delay",
        time: { control: "space", range: [0.01, 2], scale: "linear" },
        feedback: { random: [0, 0.8] },
        mix: 1,
      },
    ],
  } as const;
  const recipe = defineSound(input);
  expect(Object.isFrozen(recipe.effects[0])).toBe(true);
  expect(validateRecipe(JSON.parse(JSON.stringify(recipe))).ok).toBe(true);
  expect(compile(recipe, { space: 0 }, 42).effectChain[0]).toMatchObject({
    time: 0.01,
  });
  expect(compile(recipe, { space: 1 }, 42).effectChain[0]).toMatchObject({
    time: 2,
  });
  expect(compile(recipe, {}, 42)).toEqual(compile(recipe, {}, 42));
});

it("rejects invalid values, unknown fields, live references and all mapped extrema", () => {
  for (const [field, values] of Object.entries({
    time: [
      0.009,
      0,
      -1,
      2.01,
      NaN,
      Infinity,
      { random: [0, 1] },
      { points: [[0, 0.2]], curve: "linear" },
    ],
    feedback: [-0.1, 0.81, 1, Infinity, { random: [0.2, 0.9] }],
    mix: [-1, 1.01, NaN, { random: [0.2, 1.1] }],
    damping: [1000],
  })) {
    for (const value of values) {
      const result = validateRecipe({
        ...pulse,
        effects: [{ type: "delay", time: 0.2, [field]: value }],
      });
      expect(result.ok, `${field}: ${JSON.stringify(value)}`).toBe(false);
      if (!result.ok)
        expect(result.issues.some((issue) => issue.path.includes(field))).toBe(
          true,
        );
    }
  }
  for (const field of ["time", "feedback", "mix"]) {
    const result = validateRecipe({
      ...pulse,
      parameters: {
        space: { min: 0, max: 1, default: 0, mode: "live", smoothing: 0.05 },
      },
      effects: [
        {
          type: "delay",
          time: 0.2,
          [field]: { control: "space", range: [0.1, 0.5], scale: "linear" },
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "mode",
          path: `$["effects"][0]["${field}"]`,
        }),
      );
  }
  expect(
    validateRecipe({
      ...pulse,
      effects: Array.from({ length: 9 }, () => ({ type: "delay", time: 1 })),
    }).ok,
  ).toBe(false);
});

it("bounds cumulative tails and bypasses dry delays without extending existing lifetimes", () => {
  expect(compile(delayed({ type: "delay", time: 0.2, mix: 0 })).lifetime).toBe(
    compile(pulse).lifetime,
  );
  expect(
    compile(delayed({ type: "delay", time: 0.2, feedback: 0 })).lifetime,
  ).toBeCloseTo(0.265);
  const maximum = compile({
    ...pulse,
    effects: Array.from({ length: 8 }, () => ({
      type: "delay",
      time: 2,
      feedback: 0.8,
      mix: 1,
    })),
  });
  expect(maximum.lifetime).toBeCloseTo(30.065);
  const layered = compile({
    ...pulse,
    effects: [{ type: "delay", time: 0.3 }],
    layers: [{ ...pulse.layers[0], effects: [{ type: "delay", time: 0.2 }] }],
  });
  expect(layered.lifetime).toBeCloseTo(0.565);
});

it("rejects feedback below two native quanta before allocation but allows feedforward delay", () => {
  expect(() =>
    checkNyquist(
      compile(delayed({ type: "delay", time: 0.01, feedback: 0.3 })),
      8000,
    ),
  ).toThrow(/render quanta/);
  expect(() =>
    checkNyquist(
      compile(delayed({ type: "delay", time: 0.01, feedback: 0 })),
      8000,
    ),
  ).not.toThrow();
  expect(() =>
    checkNyquist(
      compile(delayed({ type: "delay", time: 0.01, feedback: 0.8 })),
      48000,
    ),
  ).not.toThrow();
});
