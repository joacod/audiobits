import { createAudio, defineSound, validateRecipe } from "../src/index";
import type { Recipe } from "../src/index";
import { confirmation, impact, thruster } from "../src/recipes/index";

const authored = defineSound({
  schemaVersion: 1,
  kind: "sustained",
  parameters: {
    intensity: { min: 0, max: 1, default: 0.5, mode: "play" },
    throttle: { min: 0, max: 1, default: 0.2, mode: "live", smoothing: 0.04 },
  },
  layers: [
    {
      id: "body",
      source: { type: "oscillator", waveform: "sine", frequency: 220 },
      gainDb: -20,
      envelope: { attack: 0.01, decay: 0.02, sustain: 0.5, release: 0.1 },
    },
  ],
});
const audio = createAudio();
const voice = audio
  .sound(authored)
  .play({ parameters: { intensity: 0.8, throttle: 0.3 } });
voice.set({ throttle: 0.8 });
// @ts-expect-error Misspelled authoring parameter
audio.sound(authored).play({ parameters: { intensitty: 0.8 } });
// @ts-expect-error Play-only control cannot be mutated
voice.set({ intensity: 0.2 });
// @ts-expect-error Unknown live control
voice.set({ throttlle: 0.7 });
audio.sound(impact).play({ parameters: { intensity: 0.8 } });
// @ts-expect-error Curated recipes preserve parameter names
audio.sound(impact).play({ parameters: { intensitty: 0.8 } });
// @ts-expect-error Impact has no live controls
audio.sound(impact).play().set({ intensity: 0.2 });
// @ts-expect-error Confirmation has no parameters
audio.sound(confirmation).play({ parameters: { intensity: 1 } });
audio.sound(thruster).play().set({ throttle: 1 });
const external: unknown = JSON.parse("{}");
const result = validateRecipe(external);
if (result.ok)
  audio.sound(result.recipe).play({ parameters: { hostControl: 0.5 } });
const broad: Recipe = authored;
audio.sound(broad).play({ parameters: { dynamic: 0.5 } });

// @ts-expect-error External data must be validated before typed authoring
defineSound(external);
// @ts-expect-error Invalid schema is rejected at the authoring boundary
defineSound({ schemaVersion: 2, kind: "one-shot", layers: [] });
