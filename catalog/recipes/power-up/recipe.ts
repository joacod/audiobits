import { defineSound, type Recipe } from "audiobits";

/** Rising contours share one voice; no sequencing primitive is required. */
export const powerUp: Omit<
  Extract<Recipe, { kind: "one-shot" }>,
  "parameters"
> & {
  readonly parameters: {
    readonly intensity: {
      readonly min: number;
      readonly max: number;
      readonly default: number;
      readonly mode: "play";
    };
  };
} = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.34,
  parameters: { intensity: { min: 0, max: 1, default: 0.5, mode: "play" } },
  layers: [
    {
      id: "rise",
      source: {
        type: "oscillator",
        waveform: "triangle",
        frequency: {
          points: [
            [0, 220],
            [0.12, 440],
            [
              0.27,
              { control: "intensity", range: [660, 880], scale: "linear" },
            ],
          ],
          curve: "exponential",
        },
      },
      gainDb: { control: "intensity", range: [-24, -18], scale: "linear" },
      envelope: { attack: 0.012, decay: 0.24, sustain: 0.18, release: 0.08 },
    },
    {
      id: "halo",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: {
          points: [
            [0, { random: [435, 445] }],
            [0.14, 880],
            [0.29, 1320],
          ],
          curve: "exponential",
        },
      },
      gainDb: -29,
      envelope: { attack: 0.06, decay: 0.2, sustain: 0.08, release: 0.1 },
    },
  ],
  effects: [{ type: "filter", filter: "lowpass", frequency: 3600, q: 0.7 }],
});
