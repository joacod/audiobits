import { describe, expect, it } from "vitest";
import { defineSound, validateRecipe } from "../src/recipe/validate";
import { confirmation } from "../src/recipes";
import { compile, envelopeAt } from "../src/compiler/plan";
import { checkNyquist } from "../src/compiler/graph";

const fixture = () => JSON.parse(JSON.stringify(confirmation));
function issues(input: unknown) {
  const result = validateRecipe(input);
  if (result.ok) throw new Error("Expected rejection");
  return result.issues;
}
describe("pure recipe contract", () => {
  it("runs without browser globals and produces deterministic immutable snapshots", () => {
    expect(typeof globalThis.AudioContext).toBe("undefined");
    const data = fixture();
    const defined = defineSound(data);
    const before = JSON.stringify(compile(defined));
    data.layers[0].source.frequency.points[0][1] = 900;
    expect(JSON.stringify(compile(defined))).toBe(before);
    expect(Object.isFrozen(defined.layers[0].source.frequency)).toBe(true);
    const reversed = Object.fromEntries(Object.entries(fixture()).reverse());
    expect(JSON.stringify(defineSound(reversed))).toBe(JSON.stringify(defined));
  });
  it("rejects unknown versions, fields and all deferred forms with stable paths", () => {
    const data = fixture();
    data.schemaVersion = 2;
    data.routing = {};
    expect(issues(data).map(({ code, path }) => ({ code, path }))).toEqual([
      { code: "unknown-field", path: '$["routing"]' },
      { code: "version", path: '$["schemaVersion"]' },
    ]);
    for (const mutate of [
      (data: ReturnType<typeof fixture>) => {
        data.kind = "sequence";
      },
      (data: ReturnType<typeof fixture>) => {
        data.layers[0].source = { type: "noise", color: "pink" };
      },
      (data: ReturnType<typeof fixture>) => {
        data.layers[0].gainDb = { expression: "intensity * 2" };
      },
      (data: ReturnType<typeof fixture>) => {
        data.layers[0].source.frequency = {
          control: "throttle",
          range: [100, 200],
          scale: "linear",
        };
      },
      (data: ReturnType<typeof fixture>) => {
        data.effects[0].type = "delay";
      },
    ]) {
      const input = fixture();
      mutate(input);
      expect(issues(input).length).toBeGreaterThan(0);
    }
  });
  it("rejects cycles, nonfinite values, functions, accessors and prototype objects", () => {
    const cycle = fixture();
    cycle.layers.push(cycle);
    expect(issues(cycle)[0].code).toBe("cycle");
    for (const value of [NaN, Infinity, () => 1, new Date()]) {
      const data = fixture();
      data.duration = value;
      expect(issues(data).length).toBeGreaterThan(0);
    }
    const getter = Object.defineProperty({}, "duration", {
      enumerable: true,
      get() {
        throw new Error("Getter invoked");
      },
    });
    expect(issues(getter)[0].code).toBe("type");
  });
  it("caps traversal and diagnostics", () => {
    let deep: unknown = 1;
    for (let i = 0; i < 20; i++) deep = { child: deep };
    expect(issues(deep)[0].code).toBe("resource-limit");
    expect(issues(Array.from({ length: 10001 }, () => 1))[0].code).toBe(
      "resource-limit",
    );
    expect(
      issues(
        Object.fromEntries(
          Array.from({ length: 500 }, (_, i) => [`field${i}`, undefined]),
        ),
      ),
    ).toHaveLength(100);
  });
  it("enforces semantic and aggregate budgets", () => {
    const cases = [
      (data: ReturnType<typeof fixture>) => {
        data.layers[1].id = data.layers[0].id;
      },
      (data: ReturnType<typeof fixture>) => {
        data.layers[0].envelope.attack = 0.2;
      },
      (data: ReturnType<typeof fixture>) => {
        data.layers[0].source.frequency.points[0][0] = 0.01;
      },
      (data: ReturnType<typeof fixture>) => {
        data.layers[0].source.frequency.points[1][0] = 0;
      },
      (data: ReturnType<typeof fixture>) => {
        data.layers[0].source.frequency.points[1][0] = 0.3;
      },
      (data: ReturnType<typeof fixture>) => {
        data.layers[0].effects = Array(8).fill(data.effects[0]);
      },
      (data: ReturnType<typeof fixture>) => {
        for (const layer of data.layers)
          layer.source.frequency = {
            curve: "linear",
            points: Array.from({ length: 100 }, (_, i) => [i / 1000, 500]),
          };
      },
      (data: ReturnType<typeof fixture>) => {
        data.layers = Array(17).fill(data.layers[0]);
      },
    ];
    for (const mutate of cases) {
      const data = fixture();
      mutate(data);
      expect(issues(data).length).toBeGreaterThan(0);
    }
  });
  it("checks Nyquist before allocation and models attack/decay/release", () => {
    const plan = compile(confirmation);
    expect(() => checkNyquist(plan, 6400)).toThrow(/Nyquist/);
    const layer = plan.layers[0];
    expect(envelopeAt(layer, 0.18, 0)).toBe(0);
    expect(envelopeAt(layer, 0.18, 0.002)).toBeCloseTo(layer.gain / 2);
    expect(envelopeAt(layer, 0.18, 0.064)).toBeCloseTo(layer.gain * 0.54);
    expect(envelopeAt(layer, 0.18, 0.2)).toBeCloseTo(layer.gain * 0.04);
    expect(envelopeAt(layer, 0.18, 0.3)).toBe(0);
  });
});

it("keeps public schema immutable and rejects array properties and holes", async () => {
  const { recipeSchema } = await import("../src/recipe/generated");
  expect(Object.isFrozen(recipeSchema)).toBe(true);
  expect(Object.isFrozen(recipeSchema.$defs)).toBe(true);
  const extra = fixture();
  extra.layers.foo = true;
  expect(issues(extra)[0].code).toBe("type");
  const hole = fixture();
  delete hole.layers[0];
  expect(issues(hole).some((issue) => issue.code === "type")).toBe(true);
});
it("preserves a continuous onset for zero decay", () => {
  const data = fixture();
  data.layers[0].envelope.decay = 0;
  data.layers[0].envelope.sustain = 0.5;
  const planned = compile(defineSound(data)).layers[0];
  expect(envelopeAt(planned, 0.18, planned.attack / 2)).toBeCloseTo(
    planned.gain * 0.25,
  );
  expect(envelopeAt(planned, 0.18, planned.attack)).toBeCloseTo(
    planned.gain * 0.5,
  );
});
