import { defineSound, type Recipe } from "audiobits";

/** Inharmonic partials approximate a small glass object without a resonator. */
export const glassNotification: Omit<
  Extract<Recipe, { kind: "one-shot" }>,
  "parameters"
> & {
  readonly parameters: {
    readonly brightness: {
      readonly min: number;
      readonly max: number;
      readonly default: number;
      readonly mode: "play";
    };
  };
} = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.42,
  parameters: { brightness: { min: 0, max: 1, default: 0.5, mode: "play" } },
  layers: [
    {
      id: "fundamental",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: { random: [875, 885] },
      },
      gainDb: -18,
      envelope: { attack: 0.003, decay: 0.32, sustain: 0.02, release: 0.12 },
    },
    {
      id: "partial",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: { random: [1418, 1430] },
      },
      gainDb: { control: "brightness", range: [-32, -24], scale: "linear" },
      envelope: { attack: 0.004, decay: 0.21, sustain: 0.015, release: 0.09 },
    },
    {
      id: "glint",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: { random: [2016, 2032] },
      },
      gainDb: { control: "brightness", range: [-40, -28], scale: "linear" },
      envelope: { attack: 0.002, decay: 0.12, sustain: 0, release: 0.055 },
    },
    {
      id: "rim",
      source: { type: "oscillator", waveform: "sine", frequency: 3180 },
      gainDb: { control: "brightness", range: [-48, -38], scale: "linear" },
      envelope: { attack: 0.003, decay: 0.06, sustain: 0, release: 0.035 },
    },
  ],
  effects: [
    {
      type: "filter",
      filter: "lowpass",
      frequency: {
        control: "brightness",
        range: [1800, 4800],
        scale: "exponential",
      },
      q: 0.7,
    },
  ],
});
