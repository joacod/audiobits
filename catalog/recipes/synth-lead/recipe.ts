import { defineSound } from "audiobits";
import { ratioMapping } from "../../helpers/mapping.ts";

const frequency = { min: 110, max: 880, default: 440, mode: "play" } as const;

/** A warm sustained lead with a short pitch scoop and independent live bend and brightness. */
export const synthLead = defineSound({
  schemaVersion: 1,
  kind: "sustained",
  parameters: {
    bend: { min: -200, max: 200, default: 0, mode: "live", smoothing: 0.04 },
    brightness: { min: 0, max: 1, default: 0.5, mode: "live", smoothing: 0.04 },
    frequency,
    velocity: { min: 0, max: 1, default: 0.8, mode: "play" },
  },
  layers: [
    {
      id: "lead",
      source: {
        type: "oscillator",
        detune: { control: "bend", range: [-200, 200], scale: "linear" },
        waveform: "sawtooth",
        frequency: {
          points: [
            [0, ratioMapping("frequency", frequency, 0.975)],
            [0.05, ratioMapping("frequency", frequency, 1)],
          ],
          curve: "exponential",
        },
      },
      gainDb: { control: "velocity", range: [-30, -12], scale: "linear" },
      envelope: { attack: 0.008, decay: 0.12, sustain: 0.75, release: 0.16 },
    },
    {
      id: "body",
      source: {
        type: "oscillator",
        detune: { control: "bend", range: [-200, 200], scale: "linear" },
        waveform: "triangle",
        frequency: ratioMapping("frequency", frequency, 0.5),
      },
      gainDb: { control: "velocity", range: [-36, -22], scale: "linear" },
      envelope: { attack: 0.008, decay: 0.12, sustain: 0.7, release: 0.16 },
    },
  ],
  effects: [
    {
      type: "filter",
      filter: "lowpass",
      frequency: {
        control: "brightness",
        range: [600, 8000],
        scale: "exponential",
      },
      q: 1.2,
    },
  ],
});
