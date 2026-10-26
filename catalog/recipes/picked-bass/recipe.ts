import { defineSound } from "audiobits";
import { ratioMapping } from "../../helpers/mapping.ts";

const velocity = { min: 0, max: 1, default: 0.8, mode: "play" } as const;
const level = (low: number, high: number) =>
  ({ control: "velocity", range: [low, high], scale: "linear" }) as const;

/** Picked bass: rounded string body, decaying upper modes and a quiet finger transient. */
const bassFrequency = {
  min: 30,
  max: 200,
  default: 82.41,
  mode: "play",
} as const;
export const pickedBass = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.28,
  parameters: {
    frequency: bassFrequency,
    velocity,
  },
  layers: [
    {
      id: "string",
      source: {
        type: "oscillator",
        waveform: "triangle",
        frequency: ratioMapping("frequency", bassFrequency, 1),
      },
      gainDb: level(-20, -10),
      envelope: { attack: 0.004, decay: 0.16, sustain: 0.22, release: 0.09 },
      effects: [
        {
          type: "filter",
          filter: "lowpass",
          frequency: {
            points: [
              [
                0,
                { control: "frequency", range: [700, 3200], scale: "linear" },
              ],
              [
                0.14,
                { control: "frequency", range: [220, 1100], scale: "linear" },
              ],
            ],
            curve: "exponential",
          },
          q: 0.65,
        },
      ],
    },
    {
      id: "sub",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: ratioMapping("frequency", bassFrequency, 1),
      },
      gainDb: level(-20, -11),
      envelope: { attack: 0.003, decay: 0.05, sustain: 0.35, release: 0.05 },
    },
    {
      id: "upper-string",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: {
          control: "frequency",
          range: [60.18, 401.2],
          scale: "linear",
        },
      },
      gainDb: level(-31, -18),
      envelope: { attack: 0.003, decay: 0.06, sustain: 0.08, release: 0.04 },
      effects: [{ type: "filter", filter: "lowpass", frequency: 1500, q: 0.7 }],
    },
    {
      id: "finger",
      source: { type: "noise", color: "white" },
      gainDb: level(-44, -30),
      envelope: { attack: 0.001, decay: 0.018, sustain: 0, release: 0.012 },
      effects: [
        { type: "filter", filter: "bandpass", frequency: 1700, q: 0.7 },
      ],
    },
  ],
});
