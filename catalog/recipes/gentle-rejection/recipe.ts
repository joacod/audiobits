import { defineSound, type Recipe } from "audiobits";

/** A restrained descending pair for an unavailable action. */
export const gentleRejection: Omit<
  Extract<Recipe, { kind: "one-shot" }>,
  "parameters"
> = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.2,
  layers: [
    {
      id: "answer",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: {
          points: [
            [0, 420],
            [0.15, 300],
          ],
          curve: "exponential",
        },
      },
      gainDb: -19,
      envelope: { attack: 0.008, decay: 0.13, sustain: 0.1, release: 0.055 },
    },
    {
      id: "undertone",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: {
          points: [
            [0, 630],
            [0.16, 450],
          ],
          curve: "exponential",
        },
      },
      gainDb: -28,
      envelope: { attack: 0.014, decay: 0.15, sustain: 0.04, release: 0.06 },
    },
  ],
  effects: [{ type: "filter", filter: "lowpass", frequency: 1800, q: 0.7 }],
});
