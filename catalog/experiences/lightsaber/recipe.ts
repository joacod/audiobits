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
  duration: 0.5,
  layers: [
    {
      id: "arc-draw",
      source: {
        type: "oscillator",
        waveform: "sawtooth",
        frequency: {
          points: [
            [0, 78],
            [0.08, 103],
            [0.22, 96],
            [0.5, 96],
          ],
          curve: "exponential",
        },
      },
      gainDb: -23,
      envelope: { attack: 0.012, decay: 0.25, sustain: 0.03, release: 0.09 },
      effects: [
        {
          type: "filter",
          filter: "lowpass",
          frequency: {
            points: [
              [0, 250],
              [0.1, 950],
              [0.17, 1100],
              [0.32, 650],
              [0.5, 420],
            ],
            curve: "exponential",
          },
          q: 0.7,
        },
      ],
    },
    {
      id: "plasma-tear",
      source: { type: "noise", color: "white" },
      gainDb: -26,
      envelope: { attack: 0.065, decay: 0.28, sustain: 0, release: 0.09 },
      effects: [
        {
          type: "filter",
          filter: "bandpass",
          frequency: {
            points: [
              [0, 500],
              [0.13, 2200],
              [0.3, 1500],
              [0.5, 750],
            ],
            curve: "exponential",
          },
          q: 0.7,
        },
      ],
    },
    {
      id: "electrical-growl",
      source: {
        type: "oscillator",
        waveform: "square",
        frequency: {
          points: [
            [0, 47],
            [0.1, 55],
            [0.32, 48],
          ],
          curve: "exponential",
        },
      },
      gainDb: -30,
      envelope: { attack: 0.006, decay: 0.28, sustain: 0, release: 0.07 },
      effects: [{ type: "filter", filter: "lowpass", frequency: 950, q: 0.7 }],
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
  duration: 0.66,
  layers: [
    {
      id: "field-collapse",
      source: {
        type: "oscillator",
        waveform: "sawtooth",
        frequency: {
          points: [
            [0, 96],
            [0.15, 96],
            [0.35, 80],
            [0.66, 40],
          ],
          curve: "exponential",
        },
      },
      gainDb: -24,
      envelope: { attack: 0.012, decay: 0.4, sustain: 0.01, release: 0.08 },
      effects: [
        {
          type: "filter",
          filter: "lowpass",
          frequency: {
            points: [
              [0, 1100],
              [0.18, 850],
              [0.45, 430],
              [0.66, 150],
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
      gainDb: -25,
      envelope: { attack: 0.06, decay: 0.45, sustain: 0, release: 0.09 },
      effects: [
        {
          type: "filter",
          filter: "bandpass",
          frequency: {
            points: [
              [0, 2000],
              [0.18, 1400],
              [0.38, 650],
              [0.6, 280],
              [0.66, 150],
            ],
            curve: "exponential",
          },
          q: 0.7,
        },
      ],
    },
    {
      id: "returning-growl",
      source: {
        type: "oscillator",
        waveform: "square",
        frequency: {
          points: [
            [0, 48],
            [0.35, 47],
            [0.66, 32],
          ],
          curve: "exponential",
        },
      },
      gainDb: -32,
      envelope: { attack: 0.018, decay: 0.42, sustain: 0, release: 0.08 },
      effects: [
        {
          type: "filter",
          filter: "lowpass",
          frequency: {
            points: [
              [0, 950],
              [0.3, 650],
              [0.66, 160],
            ],
            curve: "exponential",
          },
          q: 0.7,
        },
      ],
    },
  ],
});
