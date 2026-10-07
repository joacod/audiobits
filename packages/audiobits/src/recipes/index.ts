import { defineSound } from "../recipe/validate";
import type { Recipe } from "../recipe/generated";

/** Development fixture; human listening acceptance is recorded separately. */
export const confirmation: Recipe = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.18,
  layers: [
    {
      id: "body",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: {
          points: [
            [0, 520],
            [0.05, 660],
          ],
          curve: "exponential",
        },
      },
      gainDb: -14,
      envelope: { attack: 0.004, decay: 0.12, sustain: 0.08, release: 0.04 },
    },
    {
      id: "air",
      source: { type: "oscillator", waveform: "sine", frequency: 1320 },
      gainDb: -26,
      envelope: { attack: 0.008, decay: 0.1, sustain: 0.03, release: 0.05 },
    },
  ],
  effects: [{ type: "filter", filter: "lowpass", frequency: 3200, q: 0.7 }],
});
