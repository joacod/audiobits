import { defineSound } from "audiobits";

/** Smooth harmonic hum, a thin electrical edge, and resonant motion swells. */
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
        waveform: "sine",
        frequency: {
          control: "motion",
          range: [110, 116],
          scale: "exponential",
        },
      },
      gainDb: { control: "motion", range: [-27, -23], scale: "linear" },
      envelope: { attack: 0.18, decay: 0.12, sustain: 0.85, release: 0.18 },
      effects: [
        {
          type: "filter",
          filter: "lowpass",
          frequency: {
            control: "motion",
            range: [580, 1600],
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
        frequency: {
          control: "motion",
          range: [220, 232],
          scale: "exponential",
        },
      },
      gainDb: { control: "motion", range: [-33, -28], scale: "linear" },
      envelope: { attack: 0.2, decay: 0.12, sustain: 0.9, release: 0.22 },
      effects: [{ type: "filter", filter: "lowpass", frequency: 1200, q: 0.6 }],
    },
    {
      id: "corona",
      source: {
        type: "oscillator",
        waveform: "sawtooth",
        frequency: { control: "drift", range: [439, 441], scale: "linear" },
      },
      gainDb: { control: "motion", range: [-43, -34], scale: "linear" },
      envelope: { attack: 0.16, decay: 0.1, sustain: 0.8, release: 0.16 },
      effects: [
        {
          type: "filter",
          filter: "bandpass",
          frequency: {
            control: "motion",
            range: [880, 1400],
            scale: "exponential",
          },
          q: 1.1,
        },
      ],
    },
    {
      id: "shear",
      source: { type: "noise", color: "white" },
      gainDb: { control: "motion", range: [-60, -40], scale: "linear" },
      envelope: { attack: 0.08, decay: 0.1, sustain: 0.75, release: 0.12 },
      effects: [
        {
          type: "filter",
          filter: "bandpass",
          frequency: {
            control: "motion",
            range: [1100, 2600],
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
  duration: 0.42,
  layers: [
    {
      id: "arc-draw",
      source: {
        type: "oscillator",
        waveform: "triangle",
        frequency: {
          points: [
            [0, 220],
            [0.035, 660],
            [0.16, 330],
            [0.42, 110],
          ],
          curve: "exponential",
        },
      },
      gainDb: -23,
      envelope: { attack: 0.008, decay: 0.3, sustain: 0.08, release: 0.12 },
      effects: [
        {
          type: "filter",
          filter: "lowpass",
          frequency: {
            points: [
              [0, 1600],
              [0.045, 2800],
              [0.42, 580],
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
      gainDb: -32,
      envelope: { attack: 0.008, decay: 0.24, sustain: 0.02, release: 0.1 },
      effects: [
        {
          type: "filter",
          filter: "bandpass",
          frequency: {
            points: [
              [0, 1800],
              [0.04, 2600],
              [0.42, 450],
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
            [0, 160],
            [0.12, 80],
          ],
          curve: "exponential",
        },
      },
      gainDb: -24,
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
      gainDb: { control: "force", range: [-42, -33], scale: "linear" },
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
                { control: "force", range: [1200, 2800], scale: "exponential" },
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
            [0, 220],
            [
              0.055,
              { control: "force", range: [330, 520], scale: "exponential" },
            ],
            [0.24, 165],
          ],
          curve: "exponential",
        },
      },
      gainDb: { control: "force", range: [-29, -23], scale: "linear" },
      envelope: { attack: 0.02, decay: 0.15, sustain: 0.04, release: 0.09 },
      effects: [
        {
          type: "filter",
          filter: "bandpass",
          frequency: {
            points: [
              [0, 500],
              [
                0.055,
                { control: "force", range: [700, 1400], scale: "exponential" },
              ],
              [0.24, 330],
            ],
            curve: "exponential",
          },
          q: 0.7,
        },
      ],
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
            [0, 780],
            [0.06, 760],
            [0.32, 720],
          ],
          curve: "exponential",
        },
      },
      gainDb: -38,
      envelope: { attack: 0.002, decay: 0.1, sustain: 0, release: 0.1 },
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
        waveform: "triangle",
        frequency: {
          points: [
            [0, 180],
            [0.12, 96],
            [0.42, 48],
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
      gainDb: -34,
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
      gainDb: -34,
      envelope: { attack: 0.003, decay: 0.08, sustain: 0, release: 0.06 },
    },
  ],
});
