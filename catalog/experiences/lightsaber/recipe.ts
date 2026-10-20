import { defineSound } from "audiobits";

/** Full electrical hum with rounded buzz and a soft shimmer, shaped by movement. */
export const lightsaber = defineSound({
  schemaVersion: 1,
  kind: "sustained",
  parameters: {
    motion: { min: 0, max: 1, default: 0, mode: "live", smoothing: 0.025 },
    drift: { min: 0, max: 1, default: 0.5, mode: "live", smoothing: 0.12 },
    sweep: { min: -1, max: 1, default: 0, mode: "live", smoothing: 0.035 },
  },
  layers: [
    {
      id: "magnetic-core",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: {
          control: "sweep",
          range: [80, 115.2],
          scale: "exponential",
        },
      },
      gainDb: { control: "motion", range: [-27, -21], scale: "linear" },
      envelope: { attack: 0.115, decay: 0.08, sustain: 0.9, release: 0.11 },
      effects: [
        {
          type: "filter",
          filter: "lowpass",
          frequency: {
            control: "motion",
            range: [520, 1400],
            scale: "exponential",
          },
          q: 0.8,
        },
      ],
    },
    {
      id: "beating-flux",
      source: {
        type: "oscillator",
        waveform: "sawtooth",
        frequency: {
          control: "sweep",
          range: [80.6, 116.06],
          scale: "exponential",
        },
      },
      gainDb: { control: "motion", range: [-33, -27], scale: "linear" },
      envelope: { attack: 0.135, decay: 0.08, sustain: 0.9, release: 0.12 },
      effects: [
        {
          type: "filter",
          filter: "lowpass",
          frequency: {
            control: "motion",
            range: [430, 760],
            scale: "exponential",
          },
          q: 0.6,
        },
      ],
    },
    {
      id: "electrical-buzz",
      source: {
        type: "oscillator",
        waveform: "square",
        frequency: {
          control: "sweep",
          range: [50, 72],
          scale: "exponential",
        },
      },
      gainDb: { control: "motion", range: [-35, -29], scale: "linear" },
      envelope: { attack: 0.11, decay: 0.08, sustain: 0.8, release: 0.11 },
      effects: [
        {
          type: "filter",
          filter: "lowpass",
          frequency: {
            control: "motion",
            range: [480, 950],
            scale: "exponential",
          },
          q: 0.6,
        },
      ],
    },
    {
      id: "corona",
      source: {
        type: "oscillator",
        waveform: "triangle",
        frequency: { control: "drift", range: [218.4, 219.6], scale: "linear" },
      },
      gainDb: { control: "motion", range: [-36, -29], scale: "linear" },
      envelope: { attack: 0.12, decay: 0.1, sustain: 0.8, release: 0.1 },
      effects: [
        {
          type: "filter",
          filter: "bandpass",
          frequency: {
            control: "motion",
            range: [280, 700],
            scale: "exponential",
          },
          q: 0.6,
        },
      ],
    },
    {
      id: "shear",
      source: { type: "noise", color: "white" },
      gainDb: { control: "motion", range: [-58, -45], scale: "linear" },
      envelope: { attack: 0.05, decay: 0.08, sustain: 0.7, release: 0.11 },
      effects: [
        {
          type: "filter",
          filter: "bandpass",
          frequency: {
            control: "motion",
            range: [700, 1500],
            scale: "exponential",
          },
          q: 0.7,
        },
      ],
    },
  ],
});

export const bladeIgnition = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.4,
  layers: [
    {
      id: "arc-draw",
      source: {
        type: "oscillator",
        waveform: "sawtooth",
        frequency: {
          points: [
            [0, 132],
            [0.065, 108],
            [0.18, 97],
            [0.4, 96],
          ],
          curve: "exponential",
        },
      },
      gainDb: -21,
      envelope: { attack: 0.006, decay: 0.22, sustain: 0.08, release: 0.08 },
      effects: [
        {
          type: "filter",
          filter: "lowpass",
          frequency: {
            points: [
              [0, 2200],
              [0.06, 1500],
              [0.18, 760],
              [0.4, 540],
            ],
            curve: "exponential",
          },
          q: 0.8,
        },
      ],
    },
    {
      id: "plasma-tear",
      source: { type: "noise", color: "white" },
      gainDb: -22,
      envelope: { attack: 0.002, decay: 0.2, sustain: 0, release: 0.08 },
      effects: [
        {
          type: "filter",
          filter: "bandpass",
          frequency: {
            points: [
              [0, 3200],
              [0.035, 1900],
              [0.14, 850],
              [0.4, 400],
            ],
            curve: "exponential",
          },
          q: 1.1,
        },
      ],
    },
    {
      id: "switch-buzz",
      source: {
        type: "oscillator",
        waveform: "square",
        frequency: {
          points: [
            [0, 62],
            [0.08, 50],
          ],
          curve: "exponential",
        },
      },
      gainDb: -30,
      envelope: { attack: 0.002, decay: 0.065, sustain: 0, release: 0.045 },
      effects: [{ type: "filter", filter: "lowpass", frequency: 1900, q: 0.6 }],
    },
  ],
});

export const bladeSwing = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.32,
  parameters: { force: { min: 0, max: 1, default: 0.7, mode: "play" } },
  layers: [
    {
      id: "air-cut",
      source: { type: "noise", color: "white" },
      gainDb: { control: "force", range: [-47.5, -37], scale: "linear" },
      envelope: { attack: 0.04, decay: 0.2, sustain: 0.02, release: 0.08 },
      effects: [
        {
          type: "filter",
          filter: "bandpass",
          frequency: {
            points: [
              [0, 400],
              [
                0.07,
                { control: "force", range: [740, 1650], scale: "exponential" },
              ],
              [0.32, 280],
            ],
            curve: "exponential",
          },
          q: 0.8,
        },
      ],
    },
    {
      id: "flux-bend",
      source: {
        type: "oscillator",
        waveform: "sawtooth",
        frequency: {
          points: [
            [0, 96],
            [
              0.055,
              { control: "force", range: [110, 138], scale: "exponential" },
            ],
            [0.22, 73],
            [0.32, 96],
          ],
          curve: "exponential",
        },
      },
      gainDb: { control: "force", range: [-30, -23.5], scale: "linear" },
      envelope: { attack: 0.04, decay: 0.2, sustain: 0.04, release: 0.08 },
      effects: [
        {
          type: "filter",
          filter: "bandpass",
          frequency: {
            points: [
              [0, 300],
              [
                0.055,
                { control: "force", range: [470, 960], scale: "exponential" },
              ],
              [0.32, 231],
            ],
            curve: "exponential",
          },
          q: 0.7,
        },
      ],
    },
    {
      id: "buzz-bend",
      source: {
        type: "oscillator",
        waveform: "triangle",
        frequency: {
          points: [
            [0, 60],
            [0.07, { control: "force", range: [73, 92], scale: "exponential" }],
            [0.23, 49],
            [0.32, 60],
          ],
          curve: "exponential",
        },
      },
      gainDb: { control: "force", range: [-39, -31.5], scale: "linear" },
      envelope: { attack: 0.04, decay: 0.19, sustain: 0.02, release: 0.08 },
      effects: [{ type: "filter", filter: "lowpass", frequency: 1100, q: 0.6 }],
    },
  ],
});

export const bladeClash = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.58,
  parameters: { force: { min: 0, max: 1, default: 0.7, mode: "play" } },
  layers: [
    {
      id: "shockwave",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: {
          points: [
            [0, 155],
            [0.035, 83],
            [0.22, 42],
            [0.58, 30],
          ],
          curve: "exponential",
        },
      },
      gainDb: { control: "force", range: [-26, -20], scale: "linear" },
      envelope: { attack: 0.003, decay: 0.36, sustain: 0, release: 0.14 },
    },
    {
      id: "plasma-burst",
      source: { type: "noise", color: "white" },
      gainDb: { control: "force", range: [-24, -17], scale: "linear" },
      envelope: { attack: 0.002, decay: 0.26, sustain: 0, release: 0.12 },
      effects: [
        {
          type: "filter",
          filter: "lowpass",
          frequency: {
            points: [
              [0, 6200],
              [0.055, 2400],
              [0.26, 430],
              [0.58, 150],
            ],
            curve: "exponential",
          },
          q: 0.7,
        },
      ],
    },
    {
      id: "debris-tail",
      source: { type: "noise", color: "white" },
      gainDb: { control: "force", range: [-32, -25], scale: "linear" },
      envelope: { attack: 0.025, decay: 0.42, sustain: 0, release: 0.13 },
      effects: [
        {
          type: "filter",
          filter: "bandpass",
          frequency: {
            points: [
              [0, 1800],
              [0.16, 850],
              [0.58, 230],
            ],
            curve: "exponential",
          },
          q: 0.6,
        },
      ],
    },
  ],
});

export const bladeRetraction = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.28,
  layers: [
    {
      id: "field-collapse",
      source: {
        type: "oscillator",
        waveform: "sawtooth",
        frequency: {
          points: [
            [0, 96],
            [0.07, 86],
            [0.18, 60],
            [0.28, 42],
          ],
          curve: "exponential",
        },
      },
      gainDb: -23,
      envelope: { attack: 0.008, decay: 0.18, sustain: 0, release: 0.06 },
      effects: [
        {
          type: "filter",
          filter: "lowpass",
          frequency: {
            points: [
              [0, 1100],
              [0.08, 850],
              [0.28, 160],
            ],
            curve: "exponential",
          },
          q: 0.8,
        },
      ],
    },
    {
      id: "vacuum",
      source: { type: "noise", color: "white" },
      gainDb: -23,
      envelope: { attack: 0.045, decay: 0.13, sustain: 0, release: 0.055 },
      effects: [
        {
          type: "filter",
          filter: "bandpass",
          frequency: {
            points: [
              [0, 600],
              [0.07, 2400],
              [0.15, 950],
              [0.28, 180],
            ],
            curve: "exponential",
          },
          q: 1.1,
        },
      ],
    },
    {
      id: "core-drain",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: {
          points: [
            [0, 96],
            [0.09, 62],
            [0.24, 36],
          ],
          curve: "exponential",
        },
      },
      gainDb: -32,
      envelope: { attack: 0.008, decay: 0.15, sustain: 0, release: 0.06 },
    },
  ],
});
