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
  duration: 0.46,
  layers: [
    {
      id: "arc-draw",
      source: {
        type: "oscillator",
        waveform: "sawtooth",
        frequency: {
          points: [
            [0, 53],
            [0.05, 165],
            [0.2, 100],
            [0.46, 96],
          ],
          curve: "exponential",
        },
      },
      gainDb: -23,
      envelope: { attack: 0.016, decay: 0.28, sustain: 0.08, release: 0.1 },
      effects: [
        {
          type: "filter",
          filter: "lowpass",
          frequency: {
            points: [
              [0, 370],
              [0.05, 2000],
              [0.46, 600],
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
      gainDb: -27,
      envelope: { attack: 0.006, decay: 0.22, sustain: 0.02, release: 0.1 },
      effects: [
        {
          type: "filter",
          filter: "bandpass",
          frequency: {
            points: [
              [0, 650],
              [0.045, 2900],
              [0.46, 265],
            ],
            curve: "exponential",
          },
          q: 0.9,
        },
      ],
    },
    {
      id: "contact",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: {
          points: [
            [0, 125],
            [0.12, 96],
          ],
          curve: "exponential",
        },
      },
      gainDb: -27.5,
      envelope: { attack: 0.004, decay: 0.18, sustain: 0, release: 0.07 },
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
  duration: 0.32,
  parameters: { force: { min: 0, max: 1, default: 0.7, mode: "play" } },
  layers: [
    {
      id: "collision-body",
      source: {
        type: "oscillator",
        waveform: "sawtooth",
        frequency: {
          points: [
            [0, 185],
            [0.045, 108],
            [0.32, 84],
          ],
          curve: "exponential",
        },
      },
      gainDb: { control: "force", range: [-28, -22], scale: "linear" },
      envelope: { attack: 0.002, decay: 0.18, sustain: 0.01, release: 0.1 },
      effects: [{ type: "filter", filter: "bandpass", frequency: 950, q: 1.2 }],
    },
    {
      id: "electrical-fracture",
      source: { type: "noise", color: "white" },
      gainDb: { control: "force", range: [-25, -18], scale: "linear" },
      envelope: { attack: 0.001, decay: 0.16, sustain: 0.02, release: 0.12 },
      effects: [
        {
          type: "filter",
          filter: "bandpass",
          frequency: {
            points: [
              [0, 4200],
              [0.07, 1600],
              [0.32, 650],
            ],
            curve: "exponential",
          },
          q: 0.8,
        },
      ],
    },
    {
      id: "hot-metal",
      source: {
        type: "oscillator",
        waveform: "square",
        frequency: {
          points: [
            [0, 430],
            [0.06, 415],
            [0.32, 390],
          ],
          curve: "exponential",
        },
      },
      gainDb: { control: "force", range: [-38, -30], scale: "linear" },
      envelope: { attack: 0.002, decay: 0.13, sustain: 0, release: 0.1 },
      effects: [{ type: "filter", filter: "lowpass", frequency: 2700, q: 0.6 }],
    },
  ],
});

export const bladeRetraction = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.36,
  layers: [
    {
      id: "field-collapse",
      source: {
        type: "oscillator",
        waveform: "sawtooth",
        frequency: {
          points: [
            [0, 96],
            [0.09, 68],
            [0.36, 36],
          ],
          curve: "exponential",
        },
      },
      gainDb: -25,
      envelope: { attack: 0.008, decay: 0.26, sustain: 0.02, release: 0.08 },
      effects: [
        {
          type: "filter",
          filter: "lowpass",
          frequency: {
            points: [
              [0, 1050],
              [0.36, 120],
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
      gainDb: -31,
      envelope: { attack: 0.008, decay: 0.24, sustain: 0, release: 0.08 },
      effects: [
        {
          type: "filter",
          filter: "bandpass",
          frequency: {
            points: [
              [0, 1450],
              [0.36, 180],
            ],
            curve: "exponential",
          },
          q: 0.7,
        },
      ],
    },
    {
      id: "latch",
      source: {
        type: "oscillator",
        waveform: "triangle",
        frequency: {
          points: [
            [0, 55],
            [0.06, 29],
          ],
          curve: "exponential",
        },
      },
      gainDb: -38,
      envelope: { attack: 0.003, decay: 0.08, sustain: 0, release: 0.06 },
      effects: [{ type: "filter", filter: "lowpass", frequency: 450, q: 0.6 }],
    },
  ],
});
