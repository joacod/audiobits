import { defineSound } from "audiobits";
import { ratioMapping } from "../../helpers/mapping.ts";

const frequency = { min: 110, max: 1400, default: 440, mode: "play" } as const;

/** A procedural picked electric lead: warm body, ringing harmonics and a dry pick transient. */
export const electricGuitarLead = defineSound({
  schemaVersion: 1,
  kind: "sustained",
  parameters: {
    frequency,
    velocity: { min: 0, max: 1, default: 0.8, mode: "play" },
    brightness: {
      min: 0,
      max: 1,
      default: 0.55,
      mode: "live",
      smoothing: 0.04,
    },
    bend: { min: -200, max: 200, default: 0, mode: "live", smoothing: 0.04 },
  },
  layers: [
    {
      id: "string",
      source: {
        type: "oscillator",
        waveform: "triangle",
        frequency: ratioMapping("frequency", frequency, 1),
        detune: { control: "bend", range: [-200, 200], scale: "linear" },
      },
      gainDb: { control: "velocity", range: [-30, -11], scale: "linear" },
      envelope: { attack: 0.003, decay: 0.22, sustain: 0.4, release: 0.065 },
    },
    {
      id: "amp-edge",
      source: {
        type: "oscillator",
        waveform: "sawtooth",
        frequency: ratioMapping("frequency", frequency, 1),
        detune: { control: "bend", range: [-200, 200], scale: "linear" },
      },
      gainDb: { control: "velocity", range: [-38, -23], scale: "linear" },
      envelope: { attack: 0.004, decay: 0.16, sustain: 0.22, release: 0.06 },
    },
    {
      id: "ring",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: ratioMapping("frequency", frequency, 2),
        detune: { control: "bend", range: [-200, 200], scale: "linear" },
      },
      gainDb: { control: "velocity", range: [-38, -24], scale: "linear" },
      envelope: { attack: 0.002, decay: 0.12, sustain: 0.06, release: 0.05 },
    },
    {
      id: "pick",
      source: { type: "noise", color: "white" },
      gainDb: { control: "velocity", range: [-48, -33], scale: "linear" },
      envelope: { attack: 0, decay: 0.012, sustain: 0, release: 0.01 },
      effects: [
        { type: "filter", filter: "bandpass", frequency: 2800, q: 0.7 },
      ],
    },
  ],
  effects: [
    { type: "filter", filter: "highpass", frequency: 100, q: 0.7 },
    {
      type: "filter",
      filter: "lowpass",
      frequency: {
        control: "brightness",
        range: [1500, 6500],
        scale: "exponential",
      },
      q: 0.8,
    },
    { type: "delay", time: 0.12, feedback: 0, mix: 0.07 },
  ],
});
