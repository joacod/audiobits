import type { Recipe } from "audiobits";

// Plain data: the consumer validates this when calling audio.sound().
export const reactiveThruster = {
  schemaVersion: 1,
  kind: "sustained",
  parameters: {
    throttle: { min: 0, max: 1, default: 0.2, mode: "live", smoothing: 0.06 },
  },
  layers: [
    {
      id: "core",
      source: {
        type: "oscillator",
        waveform: "triangle",
        frequency: {
          control: "throttle",
          range: [38, 160],
          scale: "exponential",
        },
      },
      gainDb: { control: "throttle", range: [-32, -19], scale: "linear" },
      envelope: { attack: 0.06, decay: 0.12, sustain: 0.85, release: 0.22 },
    },
    {
      id: "turbine",
      source: {
        type: "oscillator",
        waveform: "sawtooth",
        frequency: {
          control: "throttle",
          range: [76, 480],
          scale: "exponential",
        },
      },
      gainDb: { control: "throttle", range: [-48, -30], scale: "linear" },
      envelope: { attack: 0.12, decay: 0.1, sustain: 0.7, release: 0.18 },
      effects: [
        {
          type: "filter",
          filter: "lowpass",
          frequency: {
            control: "throttle",
            range: [180, 2800],
            scale: "exponential",
          },
          q: 0.65,
        },
      ],
    },
    {
      id: "exhaust",
      source: { type: "noise", color: "white" },
      gainDb: { control: "throttle", range: [-40, -23], scale: "linear" },
      envelope: { attack: 0.08, decay: 0.12, sustain: 0.9, release: 0.28 },
      effects: [
        { type: "filter", filter: "highpass", frequency: 90, q: 0.7 },
        {
          type: "filter",
          filter: "lowpass",
          frequency: {
            control: "throttle",
            range: [220, 5200],
            scale: "exponential",
          },
          q: 0.7,
        },
      ],
    },
  ],
} as const satisfies Recipe;
