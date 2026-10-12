import { defineSound, type Recipe } from "audiobits";

export const thruster: Omit<
  Extract<Recipe, { kind: "sustained" }>,
  "parameters"
> & {
  readonly parameters: {
    readonly throttle: {
      readonly min: 0;
      readonly max: 1;
      readonly default: 0.2;
      readonly mode: "live";
      readonly smoothing: 0.04;
    };
  };
} = defineSound({
  schemaVersion: 1,
  kind: "sustained",
  parameters: {
    throttle: { min: 0, max: 1, default: 0.2, mode: "live", smoothing: 0.04 },
  },
  layers: [
    {
      id: "motor",
      source: {
        type: "oscillator",
        waveform: "triangle",
        frequency: {
          control: "throttle",
          range: [45, 130],
          scale: "exponential",
        },
      },
      gainDb: { control: "throttle", range: [-30, -18], scale: "linear" },
      envelope: { attack: 0.08, decay: 0.1, sustain: 0.8, release: 0.15 },
    },
    {
      id: "exhaust",
      source: { type: "noise", color: "white" },
      gainDb: { control: "throttle", range: [-34, -22], scale: "linear" },
      envelope: { attack: 0.1, decay: 0.1, sustain: 0.9, release: 0.2 },
      effects: [
        {
          type: "filter",
          filter: "lowpass",
          frequency: {
            control: "throttle",
            range: [250, 2400],
            scale: "exponential",
          },
          q: 0.7,
        },
      ],
    },
  ],
});
