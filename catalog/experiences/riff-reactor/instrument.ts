import type { AudioEngine, PlayOptions, Recipe } from "audiobits";
import { noteToHz, type Pitch } from "./music";

export interface InstrumentNote extends Omit<PlayOptions, "parameters"> {
  readonly note?: Pitch;
  readonly velocity?: number;
}

/**
 * A recipe-backed instrument using conventional frequency/velocity controls.
 * The host owns activation, scheduling, returned voices and engine disposal.
 * One-shots retain their envelopes; sustained voices end with voice.stop().
 */
export function createInstrument(audio: AudioEngine, recipe: Recipe) {
  const sound = audio.sound(recipe);
  const declared = recipe.parameters ?? {};
  return {
    recipe,
    play({ note, velocity, ...options }: InstrumentNote = {}) {
      const parameters: Record<string, number> = {};
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
      return sound.play({ ...options, parameters });
    },
    dispose() {
      sound.dispose();
    },
  };
}
export type Instrument = ReturnType<typeof createInstrument>;
