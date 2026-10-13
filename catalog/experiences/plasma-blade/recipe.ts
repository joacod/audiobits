import { defineSound } from "audiobits";

/** Beating electrical core, abrasive corona, and motion-fed air. */
export const plasmaBlade = defineSound({
  schemaVersion: 1,
  kind: "sustained",
  parameters: {
    motion: { min: 0, max: 1, default: 0, mode: "live", smoothing: 0.045 },
    drift: { min: 0, max: 1, default: 0.5, mode: "live", smoothing: 0.12 },
  },
  layers: [
    {
      id: "magnetic-core",
      source: {
        type: "oscillator",
        waveform: "sawtooth",
        frequency: {
          control: "motion",
          range: [73, 128],
          scale: "exponential",
        },
      },
      gainDb: { control: "motion", range: [-29, -24], scale: "linear" },
      envelope: { attack: 0.18, decay: 0.12, sustain: 0.85, release: 0.18 },
      effects: [
        {
          type: "filter",
          filter: "lowpass",
          frequency: {
            control: "motion",
            range: [380, 1500],
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
        waveform: "triangle",
        frequency: { control: "drift", range: [147, 151], scale: "linear" },
      },
      gainDb: -31,
      envelope: { attack: 0.2, decay: 0.12, sustain: 0.9, release: 0.22 },
    },
    {
      id: "corona",
      source: {
        type: "oscillator",
        waveform: "square",
        frequency: { control: "drift", range: [296, 302], scale: "linear" },
      },
      gainDb: { control: "motion", range: [-43, -35], scale: "linear" },
      envelope: { attack: 0.16, decay: 0.1, sustain: 0.8, release: 0.16 },
      effects: [
        {
          type: "filter",
          filter: "bandpass",
          frequency: {
            control: "motion",
            range: [690, 1900],
            scale: "exponential",
          },
          q: 1.2,
        },
      ],
    },
    {
      id: "shear",
      source: { type: "noise", color: "white" },
      gainDb: { control: "motion", range: [-53, -27], scale: "linear" },
      envelope: { attack: 0.08, decay: 0.1, sustain: 0.75, release: 0.12 },
      effects: [
        {
          type: "filter",
          filter: "bandpass",
          frequency: {
            control: "motion",
            range: [800, 4600],
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
  duration: 0.55,
  layers: [
    {
      id: "arc-draw",
      source: {
        type: "oscillator",
        waveform: "sawtooth",
        frequency: {
          points: [
            [0, 42],
            [0.07, 95],
            [0.25, 740],
            [0.55, 148],
          ],
          curve: "exponential",
        },
      },
      gainDb: -22,
      envelope: { attack: 0.012, decay: 0.4, sustain: 0.05, release: 0.12 },
      effects: [
        {
          type: "filter",
          filter: "lowpass",
          frequency: {
            points: [
              [0, 180],
              [0.18, 4200],
              [0.55, 600],
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
      gainDb: -25,
      envelope: { attack: 0.018, decay: 0.35, sustain: 0.02, release: 0.1 },
      effects: [
        {
          type: "filter",
          filter: "bandpass",
          frequency: {
            points: [
              [0, 300],
              [0.18, 3800],
              [0.55, 1100],
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
            [0, 130],
            [0.14, 46],
          ],
          curve: "exponential",
        },
      },
      gainDb: -19,
      envelope: { attack: 0.004, decay: 0.18, sustain: 0, release: 0.07 },
    },
  ],
});

export const bladeSwing = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.24,
  parameters: { force: { min: 0, max: 1, default: 0.7, mode: "play" } },
  layers: [
    {
      id: "air-cut",
      source: { type: "noise", color: "white" },
      gainDb: { control: "force", range: [-32, -23], scale: "linear" },
      envelope: { attack: 0.025, decay: 0.16, sustain: 0.03, release: 0.09 },
      effects: [
        {
          type: "filter",
          filter: "bandpass",
          frequency: {
            points: [
              [0, 750],
              [
                0.07,
                { control: "force", range: [1800, 5500], scale: "exponential" },
              ],
              [0.24, 420],
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
        waveform: "triangle",
        frequency: {
          points: [
            [0, 210],
            [
              0.055,
              { control: "force", range: [340, 620], scale: "exponential" },
            ],
            [0.24, 88],
          ],
          curve: "exponential",
        },
      },
      gainDb: -27,
      envelope: { attack: 0.02, decay: 0.15, sustain: 0.04, release: 0.09 },
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
        waveform: "sine",
        frequency: {
          points: [
            [0, 190],
            [0.045, 72],
            [0.32, 35],
          ],
          curve: "exponential",
        },
      },
      gainDb: { control: "force", range: [-24, -18], scale: "linear" },
      envelope: { attack: 0.003, decay: 0.24, sustain: 0.01, release: 0.12 },
    },
    {
      id: "electrical-fracture",
      source: { type: "noise", color: "white" },
      gainDb: { control: "force", range: [-29, -23], scale: "linear" },
      envelope: { attack: 0.002, decay: 0.12, sustain: 0.02, release: 0.12 },
      effects: [
        {
          type: "filter",
          filter: "bandpass",
          frequency: {
            points: [
              [0, 5200],
              [0.07, 1800],
              [0.32, 500],
            ],
            curve: "exponential",
          },
          q: 1.1,
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
            [0, 937],
            [0.06, 311],
            [0.32, 149],
          ],
          curve: "exponential",
        },
      },
      gainDb: -34,
      envelope: { attack: 0.002, decay: 0.18, sustain: 0, release: 0.1 },
      effects: [{ type: "filter", filter: "lowpass", frequency: 2700, q: 0.6 }],
    },
  ],
});

export const bladeRetraction = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.42,
  layers: [
    {
      id: "field-collapse",
      source: {
        type: "oscillator",
        waveform: "sawtooth",
        frequency: {
          points: [
            [0, 390],
            [0.12, 180],
            [0.42, 38],
          ],
          curve: "exponential",
        },
      },
      gainDb: -25,
      envelope: { attack: 0.008, decay: 0.32, sustain: 0.02, release: 0.08 },
      effects: [
        {
          type: "filter",
          filter: "lowpass",
          frequency: {
            points: [
              [0, 2400],
              [0.42, 120],
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
      gainDb: -28,
      envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.08 },
      effects: [
        {
          type: "filter",
          filter: "bandpass",
          frequency: {
            points: [
              [0, 3200],
              [0.42, 220],
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
            [0, 90],
            [0.06, 42],
          ],
          curve: "exponential",
        },
      },
      gainDb: -28,
      envelope: { attack: 0.003, decay: 0.08, sustain: 0, release: 0.06 },
    },
  ],
});
