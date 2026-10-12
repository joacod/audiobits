import { defineSound, type Recipe } from "audiobits";

/** Filtered-noise movement; placement remains a runtime pan option. */
export const whoosh: Omit<
  Extract<Recipe, { kind: "one-shot" }>,
  "parameters"
> & {
  readonly parameters: {
    readonly size: {
      readonly min: number;
      readonly max: number;
      readonly default: number;
      readonly mode: "play";
    };
  };
} = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.32,
  parameters: { size: { min: 0, max: 1, default: 0.5, mode: "play" } },
  layers: [
    {
      id: "sweep",
      source: { type: "noise", color: "white" },
      gainDb: { control: "size", range: [-19, -13], scale: "linear" },
      envelope: { attack: 0.08, decay: 0.18, sustain: 0.02, release: 0.06 },
      effects: [
        {
          type: "filter",
          filter: "bandpass",
          frequency: {
            points: [
              [0, 350],
              [
                0.13,
                { control: "size", range: [1800, 3400], scale: "exponential" },
              ],
              [0.32, 550],
            ],
            curve: "exponential",
          },
          q: 0.8,
        },
      ],
    },
    {
      id: "weight",
      source: { type: "noise", color: "white" },
      gainDb: { control: "size", range: [-34, -23], scale: "linear" },
      envelope: { attack: 0.07, decay: 0.2, sustain: 0.01, release: 0.08 },
      effects: [{ type: "filter", filter: "lowpass", frequency: 550, q: 0.7 }],
    },
  ],
});
