import { defineSound } from "audiobits";

/** Beating motor hum and electrical buzz, bent continuously by blade movement. */
export const plasmaBlade = defineSound({
  schemaVersion: 1,
  kind: "sustained",
  parameters: {
    motion: { min: 0, max: 1, default: 0, mode: "live", smoothing: 0.025 },
    drift: { min: 0, max: 1, default: 0.5, mode: "live", smoothing: 0.12 },
    sweep: { min: -1, max: 1, default: 0, mode: "live", smoothing: 0.028 },
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
      gainDb: { control: "motion", range: [-25, -19], scale: "linear" },
      envelope: { attack: 0.1, decay: 0.08, sustain: 0.9, release: 0.1 },
      effects: [
        {
          type: "filter",
          filter: "lowpass",
          frequency: {
            control: "motion",
            range: [650, 1800],
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
          range: [80.8, 116.35],
          scale: "exponential",
        },
      },
      gainDb: { control: "motion", range: [-30, -24], scale: "linear" },
      envelope: { attack: 0.12, decay: 0.08, sustain: 0.9, release: 0.12 },
      effects: [
        {
          type: "filter",
          filter: "lowpass",
          frequency: {
            control: "motion",
            range: [580, 1800],
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
        frequency: { control: "sweep", range: [50, 72], scale: "exponential" },
      },
      gainDb: { control: "motion", range: [-32, -26], scale: "linear" },
      envelope: { attack: 0.09, decay: 0.08, sustain: 0.8, release: 0.1 },
      effects: [
        {
          type: "filter",
          filter: "lowpass",
          frequency: {
            control: "motion",
            range: [800, 2200],
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
        waveform: "sawtooth",
        frequency: { control: "drift", range: [119.6, 120.4], scale: "linear" },
      },
      gainDb: { control: "motion", range: [-39, -32], scale: "linear" },
      envelope: { attack: 0.12, decay: 0.1, sustain: 0.8, release: 0.1 },
      effects: [
        {
          type: "filter",
          filter: "bandpass",
          frequency: {
            control: "motion",
            range: [360, 1000],
            scale: "exponential",
          },
          q: 0.8,
        },
      ],
    },
    {
      id: "shear",
      source: { type: "noise", color: "white" },
      gainDb: { control: "motion", range: [-60, -48], scale: "linear" },
      envelope: { attack: 0.04, decay: 0.08, sustain: 0.7, release: 0.1 },
      effects: [
        {
          type: "filter",
          filter: "bandpass",
          frequency: {
            control: "motion",
            range: [750, 1800],
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
            [0, 55],
            [0.045, 185],
            [0.2, 108],
            [0.46, 96],
          ],
          curve: "exponential",
        },
      },
      gainDb: -22,
      envelope: { attack: 0.012, decay: 0.28, sustain: 0.08, release: 0.1 },
      effects: [
        {
          type: "filter",
          filter: "lowpass",
          frequency: {
            points: [
              [0, 400],
              [0.045, 2600],
              [0.46, 680],
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
      gainDb: -26,
      envelope: { attack: 0.004, decay: 0.22, sustain: 0.02, release: 0.1 },
      effects: [
        {
          type: "filter",
          filter: "bandpass",
          frequency: {
            points: [
              [0, 700],
              [0.035, 3200],
              [0.46, 260],
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
            [0, 135],
            [0.12, 96],
          ],
          curve: "exponential",
        },
      },
      gainDb: -25,
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
      gainDb: { control: "force", range: [-49, -40], scale: "linear" },
      envelope: { attack: 0.035, decay: 0.2, sustain: 0.02, release: 0.08 },
      effects: [
        {
          type: "filter",
          filter: "bandpass",
          frequency: {
            points: [
              [0, 350],
              [
                0.07,
                { control: "force", range: [650, 1500], scale: "exponential" },
              ],
              [0.32, 260],
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
              { control: "force", range: [118, 150], scale: "exponential" },
            ],
            [0.22, 78],
            [0.32, 96],
          ],
          curve: "exponential",
        },
      },
      gainDb: { control: "force", range: [-29, -22], scale: "linear" },
      envelope: { attack: 0.035, decay: 0.2, sustain: 0.04, release: 0.08 },
      effects: [
        {
          type: "filter",
          filter: "bandpass",
          frequency: {
            points: [
              [0, 320],
              [
                0.055,
                { control: "force", range: [500, 1050], scale: "exponential" },
              ],
              [0.32, 240],
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
        waveform: "square",
        frequency: {
          points: [
            [0, 60],
            [0.07, { control: "force", range: [74, 94], scale: "exponential" }],
            [0.23, 49],
            [0.32, 60],
          ],
          curve: "exponential",
        },
      },
      gainDb: { control: "force", range: [-38, -30], scale: "linear" },
      envelope: { attack: 0.04, decay: 0.19, sustain: 0.02, release: 0.08 },
      effects: [{ type: "filter", filter: "lowpass", frequency: 1400, q: 0.6 }],
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
            [0.09, 72],
            [0.36, 38],
          ],
          curve: "exponential",
        },
      },
      gainDb: -24,
      envelope: { attack: 0.006, decay: 0.26, sustain: 0.02, release: 0.08 },
      effects: [
        {
          type: "filter",
          filter: "lowpass",
          frequency: {
            points: [
              [0, 1200],
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
      gainDb: -30,
      envelope: { attack: 0.008, decay: 0.24, sustain: 0, release: 0.08 },
      effects: [
        {
          type: "filter",
          filter: "bandpass",
          frequency: {
            points: [
              [0, 1600],
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
        waveform: "square",
        frequency: {
          points: [
            [0, 60],
            [0.06, 30],
          ],
          curve: "exponential",
        },
      },
      gainDb: -34,
      envelope: { attack: 0.003, decay: 0.08, sustain: 0, release: 0.06 },
      effects: [{ type: "filter", filter: "lowpass", frequency: 450, q: 0.6 }],
    },
  ],
});
