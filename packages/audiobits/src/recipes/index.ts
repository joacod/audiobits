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

/** Development fixture; listening acceptance is recorded separately. */
export const impact: Recipe = defineSound({
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

/** Development fixture; listening acceptance is recorded separately. */
export const thruster: Recipe = defineSound({
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
