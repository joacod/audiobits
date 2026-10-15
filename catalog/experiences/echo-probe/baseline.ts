// PR #100 acoustic reference. Development bench only, excluded from installs.
import { defineSound } from "audiobits";

/** A struck ceramic/electronic impulse: body, bending rim, and a breath of air. */
export const echoProbe = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.16,
  layers: [
    {
      id: "struck-body",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: {
          points: [
            [0, 620],
            [0.018, 410],
            [0.16, 380],
          ],
          curve: "exponential",
        },
      },
      gainDb: -15,
      envelope: { attack: 0.003, decay: 0.12, sustain: 0.015, release: 0.09 },
    },
    {
      id: "flexing-rim",
      source: {
        type: "oscillator",
        waveform: "triangle",
        frequency: {
          points: [
            [0, { random: [1710, 1790] }],
            [0.045, 1170],
            [0.16, 1080],
          ],
          curve: "exponential",
        },
      },
      gainDb: -25,
      envelope: { attack: 0.002, decay: 0.075, sustain: 0, release: 0.06 },
      effects: [{ type: "filter", filter: "lowpass", frequency: 3200, q: 0.7 }],
    },
    {
      id: "pressure",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: {
          points: [
            [0, 190],
            [0.09, 130],
          ],
          curve: "exponential",
        },
      },
      gainDb: -24,
      envelope: { attack: 0.004, decay: 0.095, sustain: 0, release: 0.05 },
    },
    {
      id: "air-edge",
      source: { type: "noise", color: "white" },
      gainDb: { random: [-26, -24] },
      envelope: { attack: 0.002, decay: 0.045, sustain: 0, release: 0.035 },
      effects: [
        {
          type: "filter",
          filter: "bandpass",
          frequency: {
            points: [
              [0, 3700],
              [0.07, 1350],
            ],
            curve: "exponential",
          },
          q: 1.2,
        },
      ],
    },
  ],
});

/** Surface is absorption to glass: a soft knock opens into a ringing, airy return. */
export const probeReflection = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.24,
  parameters: { surface: { min: 0, max: 1, default: 0.5, mode: "play" } },
  layers: [
    {
      id: "return-body",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: {
          points: [
            [
              0,
              { control: "surface", range: [310, 960], scale: "exponential" },
            ],
            [
              0.12,
              { control: "surface", range: [260, 840], scale: "exponential" },
            ],
          ],
          curve: "exponential",
        },
      },
      gainDb: -19,
      envelope: { attack: 0.006, decay: 0.16, sustain: 0.025, release: 0.14 },
    },
    {
      id: "surface-ring",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: {
          control: "surface",
          range: [710, 2380],
          scale: "exponential",
        },
      },
      gainDb: { control: "surface", range: [-42, -24], scale: "linear" },
      envelope: { attack: 0.004, decay: 0.21, sustain: 0.07, release: 0.18 },
    },
    {
      id: "scattered-air",
      source: { type: "noise", color: "white" },
      gainDb: { control: "surface", range: [-28, -23], scale: "linear" },
      envelope: { attack: 0.012, decay: 0.18, sustain: 0.015, release: 0.15 },
      effects: [
        {
          type: "filter",
          filter: "bandpass",
          frequency: {
            points: [
              [
                0,
                {
                  control: "surface",
                  range: [480, 4200],
                  scale: "exponential",
                },
              ],
              [
                0.24,
                {
                  control: "surface",
                  range: [280, 1500],
                  scale: "exponential",
                },
              ],
            ],
            curve: "exponential",
          },
          q: 1.8,
        },
      ],
    },
  ],
});

/** Finite late energy. Silence between emissions is part of the instrument. */
export const probeDiffusion = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.38,
  parameters: { surface: { min: 0, max: 1, default: 0.5, mode: "play" } },
  layers: [
    {
      id: "diffuse-wash",
      source: { type: "noise", color: "white" },
      gainDb: -29,
      envelope: { attack: 0.045, decay: 0.3, sustain: 0.03, release: 0.2 },
      effects: [
        {
          type: "filter",
          filter: "bandpass",
          frequency: {
            control: "surface",
            range: [420, 2100],
            scale: "exponential",
          },
          q: 0.7,
        },
        {
          type: "filter",
          filter: "lowpass",
          frequency: {
            points: [
              [0, 3600],
              [0.38, 450],
            ],
            curve: "exponential",
          },
          q: 0.7,
        },
      ],
    },
  ],
});
