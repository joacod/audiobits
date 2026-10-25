import type {
  AudioEngine,
  PlayOptions,
  Recipe,
  RecipeControls,
} from "audiobits";
import { noteToHz, type Pitch } from "./music";

export interface InstrumentNote<
  R extends Recipe = Recipe,
> extends PlayOptions<R> {
  readonly note?: Pitch;
  readonly velocity?: number;
}

/**
 * A recipe-backed instrument using conventional frequency/velocity controls.
 * The host owns activation, scheduling, returned voices and engine disposal.
 * Explicit note/velocity override parameters.frequency/velocity; other controls pass through.
 * Velocity is normalized to 0..1, including zero; it never means note-off.
 * One-shots retain their envelopes; sustained voices end with voice.stop().
 */
export function createInstrument<const R extends Recipe>(
  audio: AudioEngine,
  recipe: R,
) {
  const sound = audio.sound(recipe);
  const declared = sound.recipe.parameters ?? {};
  return {
    recipe: sound.recipe,
    play({
      note,
      velocity,
      parameters: input,
      ...options
    }: InstrumentNote<R> = {}) {
      const parameters: Record<string, number | undefined> = { ...input };
      if (note !== undefined) {
        if (!("frequency" in declared))
          throw new TypeError("This instrument has no frequency control");
        parameters.frequency = noteToHz(note);
      }
      if (velocity !== undefined) {
        if (!Number.isFinite(velocity) || velocity < 0 || velocity > 1)
          throw new RangeError("Velocity must be in 0..1");
        if ("velocity" in declared) parameters.velocity = velocity;
      }
      return sound.play({
        ...options,
        parameters: parameters as RecipeControls<R>,
      });
    },
    dispose() {
      sound.dispose();
    },
  };
}
export type Instrument<R extends Recipe = Recipe> = ReturnType<
  typeof createInstrument<R>
>;
