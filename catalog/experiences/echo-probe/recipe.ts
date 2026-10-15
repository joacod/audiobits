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
      envelope: { attack: 0.003, decay: 0.12, sustain: 0.015, release: 0.04 },
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
      envelope: { attack: 0.002, decay: 0.075, sustain: 0, release: 0.04 },
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
      envelope: { attack: 0.004, decay: 0.095, sustain: 0, release: 0.04 },
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

/** Same layers and seed traversal as the emission, with independent propagation. */
export const probeReturn = defineSound({
  ...echoProbe,
  parameters: {
    surface: { min: 0, max: 1, default: 0.5, mode: "play" },
    distance: { min: 0, max: 1, default: 0, mode: "play" },
  },
  effects: [
    {
      type: "filter",
      filter: "lowpass",
      frequency: {
        control: "surface",
        range: [190, 4800],
        scale: "exponential",
      },
      q: 0.7,
    },
    {
      type: "filter",
      filter: "lowpass",
      frequency: {
        control: "distance",
        range: [12000, 2400],
        scale: "exponential",
      },
      q: 0.7,
    },
  ],
});

/** Hybrid: the returned pulse excites a modest material resonance, no added note. */
export const probeReflection = defineSound({
  ...probeReturn,
  effects: probeReturn.effects.map((effect, index) => ({
    ...effect,
    q: index === 0 ? 1.65 : effect.q,
  })),
});

/** Sparse late grains. Each has a body and decorrelated air, never an idle bed. */
export const probeDiffusion = defineSound({
  ...probeReturn,
  duration: 0.18,
  layers: [echoProbe.layers[0], echoProbe.layers[3]].map((layer, index) => ({
    ...layer,
    gainDb: index === 0 ? -24 : -32,
    envelope: { attack: 0.012, decay: 0.105, sustain: 0, release: 0.035 },
  })),
});
