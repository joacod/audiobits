import type { Recipe } from "audiobits";

/** One evolving field: fundamental, beating harmonic pair, and filtered air. */
export const energyCharge = {
  schemaVersion: 1,
  kind: "sustained",
  parameters: {
    charge: { min: 0, max: 1, default: 0, mode: "live", smoothing: 0.08 },
  },
  layers: [
    {
      id: "core",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: {
          control: "charge",
          range: [80, 320],
          scale: "exponential",
        },
      },
      gainDb: { control: "charge", range: [-34, -20], scale: "linear" },
      envelope: { attack: 0.08, decay: 0.1, sustain: 0.9, release: 0.3 },
    },
    {
      id: "field",
      source: {
        type: "oscillator",
        waveform: "triangle",
        frequency: {
          control: "charge",
          range: [160, 640],
          scale: "exponential",
        },
      },
      gainDb: { control: "charge", range: [-48, -25], scale: "linear" },
      envelope: { attack: 0.12, decay: 0.1, sustain: 0.8, release: 0.28 },
      effects: [
        {
          type: "filter",
          filter: "lowpass",
          frequency: {
            control: "charge",
            range: [240, 3600],
            scale: "exponential",
          },
          q: 0.7,
        },
      ],
    },
    {
      id: "shimmer",
      source: {
        type: "oscillator",
        waveform: "sawtooth",
        frequency: {
          control: "charge",
          range: [163, 652],
          scale: "exponential",
        },
      },
      gainDb: { control: "charge", range: [-60, -34], scale: "linear" },
      envelope: { attack: 0.15, decay: 0.1, sustain: 0.75, release: 0.25 },
      effects: [
        {
          type: "filter",
          filter: "lowpass",
          frequency: {
            control: "charge",
            range: [300, 2800],
            scale: "exponential",
          },
          q: 0.6,
        },
      ],
    },
    {
      id: "air",
      source: { type: "noise", color: "white" },
      gainDb: { control: "charge", range: [-58, -34], scale: "linear" },
      envelope: { attack: 0.12, decay: 0.1, sustain: 0.8, release: 0.2 },
      effects: [
        {
          type: "filter",
          filter: "bandpass",
          frequency: {
            control: "charge",
            range: [400, 4000],
            scale: "exponential",
          },
          q: 0.8,
        },
      ],
    },
  ],
} as const satisfies Recipe;
