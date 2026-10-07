import { defineSound } from "../recipe/validate";
import type { OneShotRecipe, SustainedRecipe } from "../recipe/generated";

/** Development fixture; human listening acceptance is recorded separately. */
export const confirmation: Omit<OneShotRecipe, "parameters"> = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.18,
  layers: [
    {
      id: "body",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: {
          points: [
            [0, 520],
            [0.05, 660],
          ],
          curve: "exponential",
        },
      },
      gainDb: -14,
      envelope: { attack: 0.004, decay: 0.12, sustain: 0.08, release: 0.04 },
    },
    {
      id: "air",
      source: { type: "oscillator", waveform: "sine", frequency: 1320 },
      gainDb: -26,
      envelope: { attack: 0.008, decay: 0.1, sustain: 0.03, release: 0.05 },
    },
  ],
  effects: [{ type: "filter", filter: "lowpass", frequency: 3200, q: 0.7 }],
});

/** Development fixture; listening acceptance is recorded separately. */
export const impact: Omit<OneShotRecipe, "parameters"> & {
  readonly parameters: {
    readonly intensity: {
      readonly min: 0;
      readonly max: 1;
      readonly default: 0.5;
      readonly mode: "play";
    };
  };
} = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.22,
  parameters: { intensity: { min: 0, max: 1, default: 0.5, mode: "play" } },
  layers: [
    {
      id: "body",
      source: {
        type: "oscillator",
        waveform: "triangle",
        frequency: {
          points: [
            [0, { control: "intensity", range: [100, 220], scale: "linear" }],
            [0.12, 48],
          ],
          curve: "exponential",
        },
      },
      gainDb: { control: "intensity", range: [-22, -12], scale: "linear" },
      envelope: { attack: 0.003, decay: 0.16, sustain: 0.02, release: 0.05 },
    },
    {
      id: "transient",
      source: { type: "noise", color: "white" },
      gainDb: -24,
      envelope: { attack: 0.002, decay: 0.04, sustain: 0, release: 0.01 },
      effects: [
        {
          type: "filter",
          filter: "lowpass",
          frequency: {
            control: "intensity",
            range: [900, 4200],
            scale: "exponential",
          },
          q: 0.7,
        },
      ],
    },
  ],
});

/** Development fixture; listening acceptance is recorded separately. */
export const thruster: Omit<SustainedRecipe, "parameters"> & {
  readonly parameters: {
    readonly throttle: {
      readonly min: 0;
      readonly max: 1;
      readonly default: 0.2;
      readonly mode: "live";
      readonly smoothing: 0.04;
    };
  };
} = defineSound({
  schemaVersion: 1,
  kind: "sustained",
  parameters: {
    throttle: { min: 0, max: 1, default: 0.2, mode: "live", smoothing: 0.04 },
  },
  layers: [
    {
      id: "motor",
      source: {
        type: "oscillator",
        waveform: "triangle",
        frequency: {
          control: "throttle",
          range: [45, 130],
          scale: "exponential",
        },
      },
      gainDb: { control: "throttle", range: [-30, -18], scale: "linear" },
      envelope: { attack: 0.08, decay: 0.1, sustain: 0.8, release: 0.15 },
    },
    {
      id: "exhaust",
      source: { type: "noise", color: "white" },
      gainDb: { control: "throttle", range: [-34, -22], scale: "linear" },
      envelope: { attack: 0.1, decay: 0.1, sustain: 0.9, release: 0.2 },
      effects: [
        {
          type: "filter",
          filter: "lowpass",
          frequency: {
            control: "throttle",
            range: [250, 2400],
            scale: "exponential",
          },
          q: 0.7,
        },
      ],
    },
  ],
});

/** Short tactile feedback. Listening acceptance is separate from signal tests. */
export const tactileClick: Omit<OneShotRecipe, "parameters"> & {
  readonly parameters: {
    readonly intensity: {
      readonly min: number;
      readonly max: number;
      readonly default: number;
      readonly mode: "play";
    };
  };
} = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.035,
  parameters: { intensity: { min: 0, max: 1, default: 0.5, mode: "play" } },
  layers: [
    {
      id: "contact",
      source: {
        type: "oscillator",
        waveform: "triangle",
        frequency: {
          points: [
            [0, { random: [185, 205] }],
            [0.025, 95],
          ],
          curve: "exponential",
        },
      },
      gainDb: { control: "intensity", range: [-25, -17], scale: "linear" },
      envelope: { attack: 0.002, decay: 0.025, sustain: 0, release: 0.008 },
    },
    {
      id: "texture",
      source: { type: "noise", color: "white" },
      gainDb: { random: [-34, -32] },
      envelope: { attack: 0.002, decay: 0.009, sustain: 0, release: 0.006 },
      effects: [
        {
          type: "filter",
          filter: "lowpass",
          frequency: {
            control: "intensity",
            range: [1100, 2400],
            scale: "exponential",
          },
          q: 0.7,
        },
      ],
    },
  ],
  effects: [{ type: "filter", filter: "lowpass", frequency: 3000, q: 0.7 }],
});

/** A restrained descending pair for an unavailable action. */
export const gentleRejection: Omit<OneShotRecipe, "parameters"> = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.2,
  layers: [
    {
      id: "answer",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: {
          points: [
            [0, 420],
            [0.15, 300],
          ],
          curve: "exponential",
        },
      },
      gainDb: -19,
      envelope: { attack: 0.008, decay: 0.13, sustain: 0.1, release: 0.055 },
    },
    {
      id: "undertone",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: {
          points: [
            [0, 630],
            [0.16, 450],
          ],
          curve: "exponential",
        },
      },
      gainDb: -28,
      envelope: { attack: 0.014, decay: 0.15, sustain: 0.04, release: 0.06 },
    },
  ],
  effects: [{ type: "filter", filter: "lowpass", frequency: 1800, q: 0.7 }],
});

/** Inharmonic partials approximate a small glass object without a resonator. */
export const glassNotification: Omit<OneShotRecipe, "parameters"> & {
  readonly parameters: {
    readonly brightness: {
      readonly min: number;
      readonly max: number;
      readonly default: number;
      readonly mode: "play";
    };
  };
} = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.42,
  parameters: { brightness: { min: 0, max: 1, default: 0.5, mode: "play" } },
  layers: [
    {
      id: "fundamental",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: { random: [875, 885] },
      },
      gainDb: -18,
      envelope: { attack: 0.003, decay: 0.32, sustain: 0.02, release: 0.12 },
    },
    {
      id: "partial",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: { random: [1418, 1430] },
      },
      gainDb: { control: "brightness", range: [-32, -24], scale: "linear" },
      envelope: { attack: 0.004, decay: 0.21, sustain: 0.015, release: 0.09 },
    },
    {
      id: "glint",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: { random: [2016, 2032] },
      },
      gainDb: { control: "brightness", range: [-40, -28], scale: "linear" },
      envelope: { attack: 0.002, decay: 0.12, sustain: 0, release: 0.055 },
    },
    {
      id: "rim",
      source: { type: "oscillator", waveform: "sine", frequency: 3180 },
      gainDb: { control: "brightness", range: [-48, -38], scale: "linear" },
      envelope: { attack: 0.003, decay: 0.06, sustain: 0, release: 0.035 },
    },
  ],
  effects: [
    {
      type: "filter",
      filter: "lowpass",
      frequency: {
        control: "brightness",
        range: [1800, 4800],
        scale: "exponential",
      },
      q: 0.7,
    },
  ],
});

/** Filtered-noise movement; placement remains a runtime pan option. */
export const whoosh: Omit<OneShotRecipe, "parameters"> & {
  readonly parameters: {
    readonly size: {
      readonly min: number;
      readonly max: number;
      readonly default: number;
      readonly mode: "play";
    };
  };
} = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.32,
  parameters: { size: { min: 0, max: 1, default: 0.5, mode: "play" } },
  layers: [
    {
      id: "sweep",
      source: { type: "noise", color: "white" },
      gainDb: { control: "size", range: [-19, -13], scale: "linear" },
      envelope: { attack: 0.08, decay: 0.18, sustain: 0.02, release: 0.06 },
      effects: [
        {
          type: "filter",
          filter: "bandpass",
          frequency: {
            points: [
              [0, 350],
              [
                0.13,
                { control: "size", range: [1800, 3400], scale: "exponential" },
              ],
              [0.32, 550],
            ],
            curve: "exponential",
          },
          q: 0.8,
        },
      ],
    },
    {
      id: "weight",
      source: { type: "noise", color: "white" },
      gainDb: { control: "size", range: [-34, -23], scale: "linear" },
      envelope: { attack: 0.07, decay: 0.2, sustain: 0.01, release: 0.08 },
      effects: [{ type: "filter", filter: "lowpass", frequency: 550, q: 0.7 }],
    },
  ],
});

/** Rising contours share one voice; no sequencing primitive is required. */
export const powerUp: Omit<OneShotRecipe, "parameters"> & {
  readonly parameters: {
    readonly intensity: {
      readonly min: number;
      readonly max: number;
      readonly default: number;
      readonly mode: "play";
    };
  };
} = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.34,
  parameters: { intensity: { min: 0, max: 1, default: 0.5, mode: "play" } },
  layers: [
    {
      id: "rise",
      source: {
        type: "oscillator",
        waveform: "triangle",
        frequency: {
          points: [
            [0, 220],
            [0.12, 440],
            [
              0.27,
              { control: "intensity", range: [660, 880], scale: "linear" },
            ],
          ],
          curve: "exponential",
        },
      },
      gainDb: { control: "intensity", range: [-24, -18], scale: "linear" },
      envelope: { attack: 0.012, decay: 0.24, sustain: 0.18, release: 0.08 },
    },
    {
      id: "halo",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: {
          points: [
            [0, { random: [435, 445] }],
            [0.14, 880],
            [0.29, 1320],
          ],
          curve: "exponential",
        },
      },
      gainDb: -29,
      envelope: { attack: 0.06, decay: 0.2, sustain: 0.08, release: 0.1 },
    },
  ],
  effects: [{ type: "filter", filter: "lowpass", frequency: 3600, q: 0.7 }],
});
