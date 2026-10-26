import { defineSound } from "audiobits";
import { ratioMapping } from "../../helpers/mapping.ts";

const frequency = { min: 80, max: 880, default: 220, mode: "play" } as const;

/** One picked string, suited to short strums. Spell chords as simultaneous notes. */
export const rhythmGuitar = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.32,
  parameters: {
    frequency,
    velocity: { min: 0, max: 1, default: 0.8, mode: "play" },
  },
  layers: [
    {
      id: "string",
      source: {
        type: "oscillator",
        waveform: "sawtooth",
        frequency: ratioMapping("frequency", frequency, 1),
      },
      gainDb: { control: "velocity", range: [-38, -23], scale: "linear" },
      envelope: { attack: 0.003, decay: 0.18, sustain: 0.08, release: 0.06 },
    },
    {
      id: "body",
      source: {
        type: "oscillator",
        waveform: "triangle",
        frequency: ratioMapping("frequency", frequency, 1),
      },
      gainDb: { control: "velocity", range: [-36, -22], scale: "linear" },
      envelope: { attack: 0.003, decay: 0.22, sustain: 0.12, release: 0.06 },
    },
    {
      id: "pick",
      source: { type: "noise", color: "white" },
      gainDb: { control: "velocity", range: [-48, -34], scale: "linear" },
      envelope: { attack: 0, decay: 0.012, sustain: 0, release: 0.01 },
      effects: [
        { type: "filter", filter: "bandpass", frequency: 2400, q: 0.7 },
      ],
    },
  ],
  effects: [
    { type: "filter", filter: "highpass", frequency: 110, q: 0.7 },
    {
      type: "filter",
      filter: "lowpass",
      frequency: {
        points: [
          [0, { control: "velocity", range: [1600, 4200], scale: "linear" }],
          [0.2, 900],
        ],
        curve: "exponential",
      },
      q: 0.7,
    },
  ],
});
