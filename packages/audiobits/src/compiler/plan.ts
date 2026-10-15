import type { Recipe, Layer, Filter, Effect, Value } from "../recipe/generated";

import { controlsFor, randomFor, resolveValue } from "./values";
import type { Controls } from "./values";
type ResolvedValue = ReturnType<typeof resolveValue>;
export type ResolvedFilter = Omit<Filter, "frequency"> & {
  readonly frequency: ResolvedValue;
};
export interface ResolvedDelay {
  readonly type: "delay";
  readonly time: number;
  readonly feedback: number;
  readonly mix: number;
}
export type ResolvedEffect = ResolvedFilter | ResolvedDelay;
// Bound a complete serial path, even with eight high-feedback delays.
export const MAX_DELAY_TAIL = 30;
export function effectTail(effects: readonly ResolvedEffect[]): number {
  return effects.reduce((tail, effect) => {
    if (effect.type === "filter") return tail + 0.05;
    if (effect.mix === 0) return tail;
    const repeats =
      effect.feedback === 0
        ? 1
        : 1 + Math.ceil(Math.log(0.001) / Math.log(effect.feedback));
    return tail + effect.time * repeats;
  }, 0);
}
export type ResolvedLayer = Omit<Layer, "source" | "gainDb" | "effects"> & {
  readonly source:
    | { readonly type: "noise"; readonly color: "white" }
    | {
        readonly type: "oscillator";
        readonly waveform: OscillatorType;
        readonly frequency: ResolvedValue;
      };
  readonly gainDb: number;
  readonly effects?: readonly ResolvedEffect[];
};
export interface PlannedLayer {
  readonly layer: ResolvedLayer;
  readonly definition: Layer;
  readonly noiseSeed: number;
  readonly attack: number;
  readonly gain: number;
  readonly tail: number;
}
export interface Plan {
  readonly recipe: Recipe;
  readonly controls: Controls;
  // Filter-only projection retained for the existing development audition bench.
  readonly effects: readonly ResolvedFilter[];
  readonly effectChain: readonly ResolvedEffect[];
  readonly hasDelay: boolean;
  readonly duration: number;
  readonly layers: readonly PlannedLayer[];
  readonly lifetime: number;
  readonly filterTail: number;
}
export function compile(recipe: Recipe, input: Controls = {}, seed = 0): Plan {
  const controls = controlsFor(recipe, input);
  const random = randomFor(seed);
  const resolve = (value: Value) =>
    resolveValue(value, recipe, controls, random);
  const filters = (list: readonly Effect[] = []): ResolvedEffect[] =>
    list.map((effect) =>
      effect.type === "filter"
        ? { ...effect, frequency: resolve(effect.frequency) }
        : {
            type: "delay",
            time: resolve(effect.time) as number,
            feedback: resolve(effect.feedback ?? 0) as number,
            mix: resolve(effect.mix ?? 0.5) as number,
          },
    );
  // Stable traversal: root effects, then layers in array order; gain, filters,
  // source frequency and noise seed within each layer. Object insertion order is irrelevant.
  const effects = filters(recipe.effects);
  const layers = recipe.layers.map((definition) => {
    const gainDb = resolveValue(definition.gainDb, recipe, controls, random);
    const effects = filters(definition.effects);
    const source =
      definition.source.type === "oscillator"
        ? {
            ...definition.source,
            frequency: resolve(definition.source.frequency),
          }
        : definition.source;
    const noiseSeed =
      definition.source.type === "noise"
        ? Math.floor(random() * 0x100000000)
        : 0;
    const layer: ResolvedLayer = { ...definition, gainDb, effects, source };
    return Object.freeze({
      layer,
      definition,
      noiseSeed,
      attack: Math.max(0.002, layer.envelope.attack),
      gain: 10 ** (gainDb / 20),
      tail: Math.min(MAX_DELAY_TAIL, effectTail(effects)),
    });
  });
  const filterTail = [
    ...effects,
    ...layers.flatMap(({ layer }) => layer.effects ?? []),
  ].some((effect) => effect.type === "filter")
    ? 0.05
    : 0;
  const hasDelay = [
    ...effects,
    ...layers.flatMap(({ layer }) => layer.effects ?? []),
  ].some((effect) => effect.type === "delay" && effect.mix > 0);
  const duration = recipe.kind === "one-shot" ? recipe.duration : Infinity;
  return Object.freeze({
    recipe,
    controls,
    effects: Object.freeze(
      effects.filter(
        (effect): effect is ResolvedFilter => effect.type === "filter",
      ),
    ),
    effectChain: Object.freeze(effects),
    hasDelay,
    layers: Object.freeze(layers),
    duration,
    lifetime:
      duration +
      Math.max(
        ...layers.map(
          ({ layer, tail }) =>
            layer.envelope.release +
            (hasDelay
              ? Math.min(MAX_DELAY_TAIL, tail + effectTail(effects)) + 0.05
              : filterTail),
        ),
      ),
    filterTail,
  });
}
export function envelopeAt(
  layer: PlannedLayer,
  duration: number,
  elapsed: number,
): number {
  const { attack, gain } = layer;
  const { decay, sustain, release } = layer.layer.envelope;
  if (elapsed <= 0) return 0;
  if (elapsed < attack)
    return (gain * (decay === 0 ? sustain : 1) * elapsed) / attack;
  if (elapsed < attack + decay)
    return gain * (1 + ((sustain - 1) * (elapsed - attack)) / decay);
  if (elapsed < duration) return gain * sustain;
  return gain * sustain * Math.max(0, 1 - (elapsed - duration) / release);
}
