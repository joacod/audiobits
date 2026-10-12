import { defineSound, type Recipe } from "audiobits";

export const impact: Omit<
  Extract<Recipe, { kind: "one-shot" }>,
  "parameters"
> & {
  readonly parameters: {
    readonly intensity: {
      readonly min: 0;
      readonly max: 1;
      readonly default: 0.5;
      readonly mode: "play";
    };
  };
} = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.22,
  parameters: { intensity: { min: 0, max: 1, default: 0.5, mode: "play" } },
  layers: [
    {
      id: "body",
      source: {
        type: "oscillator",
        waveform: "triangle",
        frequency: {
          points: [
            [0, { control: "intensity", range: [100, 220], scale: "linear" }],
            [0.12, 48],
          ],
          curve: "exponential",
        },
      },
      gainDb: { control: "intensity", range: [-22, -12], scale: "linear" },
      envelope: { attack: 0.003, decay: 0.16, sustain: 0.02, release: 0.05 },
    },
    {
      id: "transient",
      source: { type: "noise", color: "white" },
      gainDb: -24,
      envelope: { attack: 0.002, decay: 0.04, sustain: 0, release: 0.01 },
      effects: [
        {
          type: "filter",
          filter: "lowpass",
          frequency: {
            control: "intensity",
            range: [900, 4200],
            scale: "exponential",
          },
          q: 0.7,
        },
      ],
    },
  ],
});
