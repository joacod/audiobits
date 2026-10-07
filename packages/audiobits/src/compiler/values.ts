import type { Mapping, PointValue, Recipe, Value } from "../recipe/generated";
import { AudioBitsError } from "../recipe/validate";

export type Controls = Readonly<Record<string, number>>;
export function validateControls(
  recipe: Recipe,
  input: Controls = {},
  live = false,
): Controls {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    (Object.getPrototypeOf(input) !== Object.prototype &&
      Object.getPrototypeOf(input) !== null)
  )
    throw new AudioBitsError(
      "invalid-control",
      "Controls must be a plain data object.",
    );
  const result: Record<string, number> = Object.create(null);
  const keys = Reflect.ownKeys(input);
  if (keys.length > 16)
    throw new AudioBitsError(
      "invalid-control",
      "At most 16 controls are supported.",
    );
  for (const key of keys) {
    const property = Object.getOwnPropertyDescriptor(input, key)!;
    const declaration =
      typeof key === "string" && Object.hasOwn(recipe.parameters ?? {}, key)
        ? recipe.parameters![key]
        : undefined;
    if (
      !declaration ||
      !("value" in property) ||
      !property.enumerable ||
      typeof property.value !== "number" ||
      !Number.isFinite(property.value) ||
      property.value < declaration.min ||
      property.value > declaration.max ||
      (live && declaration.mode !== "live")
    )
      throw new AudioBitsError(
        "invalid-control",
        `Invalid ${live ? "live " : ""}control: ${String(key)}.`,
      );
    result[key as string] = property.value;
  }
  return Object.freeze(result);
}
export function controlsFor(recipe: Recipe, input: Controls = {}): Controls {
  const supplied = validateControls(recipe, input);
  return Object.freeze(
    Object.fromEntries(
      Object.entries(recipe.parameters ?? {}).map(([name, parameter]) => [
        name,
        Object.hasOwn(supplied, name) ? supplied[name] : parameter.default,
      ]),
    ),
  );
}
export function validateSeed(seed: number): number {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw new AudioBitsError(
      "invalid-seed",
      "Seed must be an unsigned 32-bit integer.",
    );
  return seed;
}
/** xorshift32; public seed zero maps to the nonzero state 0x6d2b79f5. */
export function randomFor(seed: number): () => number {
  let state = validateSeed(seed) || 0x6d2b79f5;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}
export function mapControl(
  mapping: Mapping,
  recipe: Recipe,
  controls: Controls,
): number {
  const declaration = recipe.parameters![mapping.control];
  const t =
    (controls[mapping.control] - declaration.min) /
    (declaration.max - declaration.min);
  const [low, high] = mapping.range;
  return mapping.scale === "linear"
    ? low + (high - low) * t
    : low * (high / low) ** t;
}
export function resolveValue(
  value: PointValue,
  recipe: Recipe,
  controls: Controls,
  random: () => number,
): number;
export function resolveValue(
  value: Value,
  recipe: Recipe,
  controls: Controls,
  random: () => number,
):
  | number
  | {
      readonly points: readonly (readonly [number, number])[];
      readonly curve: "linear" | "exponential";
    };
export function resolveValue(
  value: Value,
  recipe: Recipe,
  controls: Controls,
  random: () => number,
):
  | number
  | {
      readonly points: readonly (readonly [number, number])[];
      readonly curve: "linear" | "exponential";
    } {
  function point(input: PointValue): number {
    if (typeof input === "number") return input;
    if ("random" in input)
      return input.random[0] + random() * (input.random[1] - input.random[0]);
    return mapControl(input, recipe, controls);
  }
  return typeof value !== "number" && "points" in value
    ? {
        points: value.points.map(
          ([time, input]) => [time, point(input)] as const,
        ),
        curve: value.curve,
      }
    : point(value);
}
export const NOISE_SECONDS = 1;
export const NOISE_MAX_SAMPLE_RATE = 192000;
export function checkNoiseRate(sampleRate: number): void {
  if (
    !Number.isInteger(sampleRate) ||
    sampleRate < 8000 ||
    sampleRate > NOISE_MAX_SAMPLE_RATE
  )
    throw new AudioBitsError(
      "noise-rate",
      "Noise supports integer sample rates from 8000 to 192000 Hz.",
    );
}
/** Crossfade the last 20 ms into the first 20 ms; loop resumes after that prefix. */
export function noiseData(
  sampleRate: number,
  seed: number,
): Float32Array<ArrayBuffer> {
  checkNoiseRate(sampleRate);
  const random = randomFor(seed);
  const data = new Float32Array(sampleRate * NOISE_SECONDS);
  for (let i = 0; i < data.length; i++) data[i] = random() * 2 - 1;
  const seam = Math.round(sampleRate * 0.02);
  for (let i = 0; i < seam; i++) {
    const t = i / (seam - 1);
    const index = data.length - seam + i;
    data[index] = data[index] * (1 - t) + data[i] * t;
  }
  return data;
}
