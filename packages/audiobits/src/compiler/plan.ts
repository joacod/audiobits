import type { Recipe, Layer } from "../recipe/generated";

export interface PlannedLayer {
  readonly layer: Layer;
  readonly attack: number;
  readonly gain: number;
}
export interface Plan {
  readonly recipe: Recipe;
  readonly layers: readonly PlannedLayer[];
  readonly lifetime: number;
  readonly filterTail: number;
}
export function compile(recipe: Recipe): Plan {
  const filterTail =
    recipe.effects?.length ||
    recipe.layers.some((layer) => layer.effects?.length)
      ? 0.05
      : 0;
  return Object.freeze({
    recipe,
    layers: Object.freeze(
      recipe.layers.map((layer) =>
        Object.freeze({
          layer,
          attack: Math.max(0.002, layer.envelope.attack),
          gain: 10 ** (layer.gainDb / 20),
        }),
      ),
    ),
    lifetime:
      recipe.duration +
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
