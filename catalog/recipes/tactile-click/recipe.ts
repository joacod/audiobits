import { defineSound, type Recipe } from "audiobits";

/** Short tactile feedback. Listening acceptance is separate from signal tests. */
export const tactileClick: Omit<
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
  duration: 0.035,
  parameters: { intensity: { min: 0, max: 1, default: 0.5, mode: "play" } },
  layers: [
    {
      id: "contact",
      source: {
        type: "oscillator",
        waveform: "triangle",
        frequency: {
          points: [
            [0, { random: [185, 205] }],
            [0.025, 95],
          ],
          curve: "exponential",
        },
      },
      gainDb: { control: "intensity", range: [-25, -17], scale: "linear" },
      envelope: { attack: 0.002, decay: 0.025, sustain: 0, release: 0.008 },
    },
    {
      id: "texture",
      source: { type: "noise", color: "white" },
      gainDb: { random: [-34, -32] },
      envelope: { attack: 0.002, decay: 0.009, sustain: 0, release: 0.006 },
      effects: [
        {
          type: "filter",
          filter: "lowpass",
          frequency: {
            control: "intensity",
            range: [1100, 2400],
            scale: "exponential",
          },
          q: 0.7,
        },
      ],
    },
  ],
  effects: [{ type: "filter", filter: "lowpass", frequency: 3000, q: 0.7 }],
});
