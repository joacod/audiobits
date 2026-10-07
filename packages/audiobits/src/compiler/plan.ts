import type { Recipe, Layer, Filter, Value } from "../recipe/generated";

import { controlsFor, randomFor, resolveValue } from "./values";
import type { Controls } from "./values";
type ResolvedValue = ReturnType<typeof resolveValue>;
export type ResolvedFilter = Omit<Filter, "frequency"> & {
  readonly frequency: ResolvedValue;
};
export type ResolvedLayer = Omit<Layer, "source" | "gainDb" | "effects"> & {
  readonly source:
    | { readonly type: "noise"; readonly color: "white" }
    | {
        readonly type: "oscillator";
        readonly waveform: OscillatorType;
        readonly frequency: ResolvedValue;
      };
  readonly gainDb: number;
  readonly effects?: readonly ResolvedFilter[];
};
export interface PlannedLayer {
  readonly layer: ResolvedLayer;
  readonly definition: Layer;
  readonly noiseSeed: number;
  readonly attack: number;
  readonly gain: number;
}
export interface Plan {
  readonly recipe: Recipe;
  readonly controls: Controls;
  readonly effects: readonly ResolvedFilter[];
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
  const filters = (list: readonly Filter[] = []) =>
    list.map((filter) => ({ ...filter, frequency: resolve(filter.frequency) }));
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
    });
  });
  const filterTail =
    effects.length || layers.some(({ layer }) => layer.effects?.length)
      ? 0.05
      : 0;
  const duration = recipe.kind === "one-shot" ? recipe.duration : Infinity;
  return Object.freeze({
    recipe,
    controls,
    effects: Object.freeze(effects),
    layers: Object.freeze(layers),
    duration,
    lifetime:
      duration +
      Math.max(...recipe.layers.map((layer) => layer.envelope.release)) +
      filterTail,
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
