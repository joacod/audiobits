import { defineSound } from "audiobits";

// A low membrane under strain. Pitches stay anchored while aperture exposes
// mass, tension stretches inharmonic mode ratios, and instability adds rough
// sidebands and turbulence. drift and breath are slow autonomous controls.
const field = {
  attack: 1.1,
  decay: 0,
  sustain: 1,
  release: 0.3,
} as const;

/** The persistent fracture field. */
export const riftField = defineSound({
  schemaVersion: 1,
  kind: "sustained",
  parameters: {
    aperture: { min: 0, max: 1, default: 0.5, mode: "live", smoothing: 0.12 },
    tension: { min: 0, max: 1, default: 0.35, mode: "live", smoothing: 0.18 },
    instability: {
      min: 0,
      max: 1,
      default: 0.2,
      mode: "live",
      smoothing: 0.1,
    },
    drift: { min: 0, max: 1, default: 0.5, mode: "live", smoothing: 1 },
    breath: { min: 0, max: 1, default: 0.5, mode: "live", smoothing: 1 },
  },
  layers: [
    {
      id: "pressure",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: {
          control: "drift",
          range: [45, 47.5],
          scale: "exponential",
        },
      },
      gainDb: { control: "aperture", range: [-23, -14], scale: "linear" },
      envelope: { ...field, attack: 0.7 },
    },
    {
      id: "pressure-twin",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: { control: "tension", range: [46.6, 49.4], scale: "linear" },
      },
      gainDb: { control: "aperture", range: [-27, -16], scale: "linear" },
      envelope: { ...field, attack: 0.9 },
    },
    {
      id: "membrane",
      source: {
        type: "oscillator",
        waveform: "triangle",
        frequency: {
          control: "tension",
          range: [92, 104],
          scale: "exponential",
        },
      },
      gainDb: { control: "aperture", range: [-21, -8], scale: "linear" },
      envelope: field,
    },
    {
      id: "mode-b",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: {
          control: "tension",
          range: [138.5, 187.4],
          scale: "exponential",
        },
      },
      gainDb: { control: "aperture", range: [-31, -8], scale: "linear" },
      envelope: { ...field, attack: 1.4 },
    },
    {
      id: "mode-c",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: {
          control: "tension",
          range: [180.8, 263.5],
          scale: "exponential",
        },
      },
      gainDb: { control: "aperture", range: [-60, -11], scale: "linear" },
      envelope: { ...field, attack: 1.7 },
    },
    {
      id: "mode-c-strain",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: {
          control: "tension",
          range: [181.6, 270],
          scale: "exponential",
        },
      },
      gainDb: { control: "breath", range: [-60, -13], scale: "linear" },
      envelope: { ...field, attack: 1.9 },
    },
    {
      id: "mode-d",
      source: {
        type: "oscillator",
        waveform: "triangle",
        frequency: {
          control: "tension",
          range: [221, 336],
          scale: "exponential",
        },
      },
      gainDb: { control: "breath", range: [-60, -15], scale: "linear" },
      envelope: { ...field, attack: 2.2 },
    },
    {
      id: "rough-sideband",
      source: {
        type: "oscillator",
        waveform: "triangle",
        frequency: {
          control: "tension",
          range: [157.5, 218.4],
          scale: "exponential",
        },
      },
      gainDb: { control: "instability", range: [-60, -10], scale: "linear" },
      envelope: field,
    },
    {
      id: "gap-wind",
      source: { type: "noise", color: "white" },
      gainDb: { control: "instability", range: [-31, -13], scale: "linear" },
      envelope: { ...field, attack: 1.5 },
      effects: [
        {
          type: "filter",
          filter: "bandpass",
          frequency: {
            control: "drift",
            range: [420, 1300],
            scale: "exponential",
          },
          q: 14,
        },
      ],
    },
    {
      id: "breach-air",
      source: { type: "noise", color: "white" },
      gainDb: { control: "aperture", range: [-60, -20], scale: "linear" },
      envelope: { ...field, attack: 1.2 },
      effects: [
        {
          type: "filter",
          filter: "bandpass",
          frequency: {
            control: "aperture",
            range: [220, 2600],
            scale: "exponential",
          },
          q: 1.2,
        },
      ],
    },
    {
      id: "undertow",
      source: { type: "oscillator", waveform: "sawtooth", frequency: 61.7 },
      gainDb: { control: "breath", range: [-60, -16], scale: "linear" },
      envelope: { ...field, attack: 2.4 },
      effects: [
        {
          type: "filter",
          filter: "lowpass",
          frequency: {
            control: "breath",
            range: [90, 720],
            scale: "exponential",
          },
          q: 6,
        },
      ],
    },
  ],
  effects: [
    {
      type: "filter",
      filter: "lowpass",
      frequency: {
        control: "aperture",
        range: [700, 7000],
        scale: "exponential",
      },
      q: 0.7,
    },
  ],
});

/** Tearing transient, suction, and resonances settling into the field. */
export const riftOpening = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 1.4,
  layers: [
    {
      id: "tear-ratchet",
      source: {
        type: "oscillator",
        waveform: "square",
        frequency: {
          points: [
            [0, 21],
            [0.22, 68],
            [0.6, 34],
            [1.1, 20],
          ],
          curve: "exponential",
        },
      },
      gainDb: -7,
      envelope: { attack: 0.004, decay: 0.9, sustain: 0.1, release: 0.3 },
      effects: [
        { type: "filter", filter: "highpass", frequency: 1700, q: 0.9 },
      ],
    },
    {
      id: "tear-grit",
      source: { type: "noise", color: "white" },
      gainDb: -5,
      envelope: { attack: 0.003, decay: 0.55, sustain: 0.15, release: 0.35 },
      effects: [
        {
          type: "filter",
          filter: "bandpass",
          frequency: {
            points: [
              [0, 4200],
              [0.35, 900],
              [1.1, 300],
            ],
            curve: "exponential",
          },
          q: 2.2,
        },
      ],
    },
    {
      id: "suction",
      source: { type: "noise", color: "white" },
      gainDb: -9,
      envelope: { attack: 0.32, decay: 0.6, sustain: 0.3, release: 0.4 },
      effects: [
        {
          type: "filter",
          filter: "lowpass",
          frequency: {
            points: [
              [0, 180],
              [0.42, 2400],
              [1.2, 240],
            ],
            curve: "exponential",
          },
          q: 3,
        },
      ],
    },
    {
      id: "foundation",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: {
          points: [
            [0, 29],
            [0.9, 46],
          ],
          curve: "exponential",
        },
      },
      gainDb: -5,
      envelope: { attack: 0.22, decay: 0.8, sustain: 0.45, release: 0.7 },
    },
    {
      id: "bloom-low",
      source: {
        type: "oscillator",
        waveform: "triangle",
        frequency: {
          points: [
            [0, 310],
            [0.16, 290],
            [1.1, 151],
          ],
          curve: "exponential",
        },
      },
      gainDb: -16,
      envelope: { attack: 0.08, decay: 0.7, sustain: 0.4, release: 0.6 },
    },
    {
      id: "bloom-high",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: {
          points: [
            [0, 520],
            [0.2, 470],
            [1.2, 241],
          ],
          curve: "exponential",
        },
      },
      gainDb: -18,
      envelope: { attack: 0.12, decay: 0.75, sustain: 0.35, release: 0.6 },
    },
  ],
  effects: [{ type: "delay", time: 0.23, feedback: 0.3, mix: 0.18 }],
});

/** Electrical discharge across the edges. */
export const riftCrackle = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.2,
  parameters: {
    strength: { min: 0, max: 1, default: 0.6, mode: "play" },
  },
  layers: [
    {
      id: "arc",
      source: {
        type: "oscillator",
        waveform: "square",
        frequency: {
          points: [
            [0, { random: [70, 150] }],
            [0.05, { random: [26, 52] }],
            [0.17, { random: [90, 220] }],
          ],
          curve: "exponential",
        },
      },
      gainDb: { control: "strength", range: [-26, -9], scale: "linear" },
      envelope: { attack: 0.002, decay: 0.12, sustain: 0.2, release: 0.06 },
      effects: [
        {
          type: "filter",
          filter: "bandpass",
          frequency: { random: [1400, 3600] },
          q: 4,
        },
      ],
    },
    {
      id: "snap",
      source: { type: "noise", color: "white" },
      gainDb: { control: "strength", range: [-30, -14], scale: "linear" },
      envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.03 },
      effects: [
        { type: "filter", filter: "highpass", frequency: 2600, q: 0.8 },
      ],
    },
  ],
});

/** A stressed membrane bending under load. */
export const riftGroan = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.9,
  parameters: {
    strength: { min: 0, max: 1, default: 0.6, mode: "play" },
    tension: { min: 0, max: 1, default: 0.35, mode: "play" },
  },
  layers: [
    {
      id: "creak",
      source: {
        type: "oscillator",
        waveform: "sawtooth",
        frequency: {
          points: [
            [0, { control: "tension", range: [70, 104], scale: "exponential" }],
            [0.35, { random: [58, 84] }],
            [0.9, { random: [40, 52] }],
          ],
          curve: "exponential",
        },
      },
      gainDb: { control: "strength", range: [-28, -13], scale: "linear" },
      envelope: { attack: 0.12, decay: 0.5, sustain: 0.35, release: 0.35 },
      effects: [
        {
          type: "filter",
          filter: "lowpass",
          frequency: {
            points: [
              [0, 260],
              [0.3, { random: [700, 1300] }],
              [0.9, 220],
            ],
            curve: "exponential",
          },
          q: 9,
        },
      ],
    },
  ],
});

/** A distant knock from the other side, repeated by its own space. */
export const riftEcho = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.4,
  parameters: {
    strength: { min: 0, max: 1, default: 0.6, mode: "play" },
  },
  layers: [
    {
      id: "knock",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: {
          points: [
            [0, { random: [64, 82] }],
            [0.3, 38],
          ],
          curve: "exponential",
        },
      },
      gainDb: { control: "strength", range: [-22, -8], scale: "linear" },
      envelope: { attack: 0.004, decay: 0.3, sustain: 0, release: 0.2 },
    },
    {
      id: "dust",
      source: { type: "noise", color: "white" },
      gainDb: { control: "strength", range: [-34, -20], scale: "linear" },
      envelope: { attack: 0.002, decay: 0.12, sustain: 0, release: 0.1 },
      effects: [{ type: "filter", filter: "lowpass", frequency: 520, q: 0.9 }],
    },
  ],
  effects: [
    { type: "filter", filter: "lowpass", frequency: 900, q: 0.7 },
    { type: "delay", time: { random: [0.27, 0.36] }, feedback: 0.42, mix: 0.4 },
  ],
});

/** Resonances fold inward toward one pitch while the gap inhales. */
export const riftCollapse = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 1.15,
  parameters: {
    aperture: { min: 0, max: 1, default: 0.5, mode: "play" },
    tension: { min: 0, max: 1, default: 0.35, mode: "play" },
  },
  layers: [
    {
      id: "fold-b",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: {
          points: [
            [
              0,
              {
                control: "tension",
                range: [138.5, 187.4],
                scale: "exponential",
              },
            ],
            [1.1, 47],
          ],
          curve: "exponential",
        },
      },
      gainDb: { control: "aperture", range: [-24, -12], scale: "linear" },
      envelope: { attack: 0.05, decay: 0.3, sustain: 0.9, release: 0.12 },
    },
    {
      id: "fold-c",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: {
          points: [
            [
              0,
              {
                control: "tension",
                range: [180.8, 263.5],
                scale: "exponential",
              },
            ],
            [1.1, 47.6],
          ],
          curve: "exponential",
        },
      },
      gainDb: { control: "aperture", range: [-26, -14], scale: "linear" },
      envelope: { attack: 0.05, decay: 0.3, sustain: 0.9, release: 0.12 },
    },
    {
      id: "fold-d",
      source: {
        type: "oscillator",
        waveform: "triangle",
        frequency: {
          points: [
            [
              0,
              { control: "tension", range: [221, 336], scale: "exponential" },
            ],
            [1.1, 46.4],
          ],
          curve: "exponential",
        },
      },
      gainDb: { control: "aperture", range: [-28, -16], scale: "linear" },
      envelope: { attack: 0.05, decay: 0.3, sustain: 0.9, release: 0.12 },
    },
    {
      id: "inhale",
      source: { type: "noise", color: "white" },
      gainDb: { control: "aperture", range: [-18, -6], scale: "linear" },
      envelope: { attack: 1.0, decay: 0.1, sustain: 0.7, release: 0.04 },
      effects: [
        {
          type: "filter",
          filter: "bandpass",
          frequency: {
            points: [
              [0, 3200],
              [1.1, 150],
            ],
            curve: "exponential",
          },
          q: 2.5,
        },
      ],
    },
  ],
});

/** The final implosion: a sealed pressure drop with a short pocket echo. */
export const riftImplosion = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.35,
  layers: [
    {
      id: "seal",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: {
          points: [
            [0, 96],
            [0.3, 31],
          ],
          curve: "exponential",
        },
      },
      gainDb: -1,
      envelope: { attack: 0.003, decay: 0.3, sustain: 0.2, release: 0.6 },
    },
    {
      id: "pocket",
      source: { type: "noise", color: "white" },
      gainDb: -9,
      envelope: { attack: 0.002, decay: 0.08, sustain: 0, release: 0.1 },
      effects: [{ type: "filter", filter: "lowpass", frequency: 1100, q: 0.8 }],
    },
    {
      id: "last-ring",
      source: { type: "oscillator", waveform: "triangle", frequency: 92 },
      gainDb: -20,
      envelope: { attack: 0.01, decay: 0.32, sustain: 0.3, release: 0.8 },
    },
  ],
  effects: [{ type: "delay", time: 0.17, feedback: 0.3, mix: 0.25 }],
});
