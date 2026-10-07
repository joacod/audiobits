/** Foundation marker used to verify local and packed package consumption. */
export const workspaceStatus: string = "AudioBits workspace ready";

export { defineSound, validateRecipe, AudioBitsError } from "./recipe/validate";
export type { RecipeIssue, ValidationResult } from "./recipe/validate";
export type {
  Recipe,
  Layer,
  Frequency,
  Filter,
  Envelope,
  Source,
  Value,
  PointValue,
  Mapping,
  Variation,
  Parameter,
  Parameters,
} from "./recipe/generated";
export { recipeSchema } from "./recipe/generated";
export { createAudio } from "./runtime/engine";
export type {
  AudioEngine,
  AudioOptions,
  AudioState,
  Sound,
  Voice,
  PlayOptions,
  RecipeControls,
  LiveControls,
} from "./runtime/engine";

export type { Bus, DelayOptions } from "./runtime/bus";
