import { expect, it } from "vitest";
import { defineSound, validateRecipe } from "../src/recipe/validate";
import { compile, envelopeAt } from "../src/compiler/plan";
import type { Recipe } from "../src/index";

const tone = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.125,
  layers: [
    {
      id: "late",
      startOffset: 0.0625,
      source: { type: "oscillator", waveform: "sine", frequency: 440 },
      gainDb: -18,
      envelope: {
        attack: 0.03125,
        decay: 0.03125,
        sustain: 0.5,
        release: 0.125,
      },
    },
  ],
});
const withOffset = <T>(startOffset: T) => ({
  ...tone,
  layers: [{ ...tone.layers[0], startOffset }],
});
it("accepts fixed offsets and rejects invalid numbers and deferred forms", () => {
  expect(validateRecipe(JSON.parse(JSON.stringify(tone))).ok).toBe(true);
  for (const offset of [
    -1,
    NaN,
    Infinity,
    61,
    "0.01",
    null,
    { random: [0, 0.01] },
    { control: "offset", range: [0, 0.01], scale: "linear" },
  ])
    expect(validateRecipe(withOffset(offset)).ok, JSON.stringify(offset)).toBe(
      false,
    );
  for (const offset of [0, 0.0625])
    expect(validateRecipe(withOffset(offset)).ok).toBe(true);
  expect(validateRecipe(withOffset(0.0626)).ok).toBe(false);
  // Authored zero attack still requires the runtime's effective 2 ms attack.
  expect(
    validateRecipe({
      ...tone,
      layers: [
        {
          ...tone.layers[0],
          startOffset: 0.124,
          envelope: { ...tone.layers[0].envelope, attack: 0, decay: 0 },
        },
      ],
    }).ok,
  ).toBe(false);
});
it("bounds layer source and filter automation by the remaining shared timeline", () => {
  for (const kind of ["one-shot", "sustained"] as const) {
    for (const target of ["source", "filter"] as const) {
      const offset = kind === "one-shot" ? 0.0625 : 59.9375;
      const frequency = {
        points: [
          [0, 440],
          [0.0625, 220],
        ],
        curve: "linear",
      } as const;
      const layer = {
        ...tone.layers[0],
        startOffset: offset,
        ...(target === "source"
          ? { source: { ...tone.layers[0].source, frequency } }
          : {
              effects: [
                { type: "filter", filter: "lowpass", frequency, q: 0.7 },
              ],
            }),
      };
      const recipe = {
        schemaVersion: 1,
        kind,
        ...(kind === "one-shot" ? { duration: tone.duration } : {}),
        layers: [layer],
      };
      expect(validateRecipe(recipe).ok).toBe(true);
      const invalid = structuredClone(recipe);
      invalid.layers[0].startOffset += 0.001;
      expect(validateRecipe(invalid).ok).toBe(false);
    }
  }
  const sustained: Recipe = {
    schemaVersion: 1,
    kind: "sustained",
    layers: [{ ...tone.layers[0], startOffset: 60 }],
  };
  expect(validateRecipe(sustained).ok).toBe(true);
  // Root automation keeps voice time zero, independent of the delayed layer.
  expect(
    validateRecipe({
      ...tone,
      effects: [
        {
          type: "filter",
          filter: "lowpass",
          q: 0.7,
          frequency: {
            points: [
              [0, 440],
              [tone.duration, 220],
            ],
            curve: "linear",
          },
        },
      ],
    }).ok,
  ).toBe(true);
});
it("evaluates delayed attacks and releases without extending the shared gate or tail", () => {
  const plan = compile(tone);
  const layer = plan.layers[0];
  const gain = 10 ** (-18 / 20);
  expect(envelopeAt(layer, plan.duration, 0.05)).toBe(0);
  expect(envelopeAt(layer, plan.duration, 0.0625)).toBe(0);
  expect(envelopeAt(layer, plan.duration, 0.078125)).toBeCloseTo(gain / 2);
  expect(envelopeAt(layer, plan.duration, 0.125)).toBeCloseTo(gain / 2);
  expect(envelopeAt(layer, plan.duration, 0.1875)).toBeCloseTo(gain / 4);
  expect(plan.lifetime).toBe(0.25);
  const zero = compile(defineSound(withOffset(0)));
  const { startOffset: omitted, ...withoutOffset } = tone.layers[0];
  expect(omitted).toBe(0.0625);
  const original = compile(defineSound({ ...tone, layers: [withoutOffset] }));
  for (const elapsed of [0, 0.01, 0.05, 0.125, 0.2, 0.3])
    expect(envelopeAt(zero.layers[0], zero.duration, elapsed)).toBe(
      envelopeAt(original.layers[0], original.duration, elapsed),
    );
  expect(zero.lifetime).toBe(original.lifetime);
});
