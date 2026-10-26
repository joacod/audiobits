import { defineSound } from "audiobits";

const velocity = { min: 0, max: 1, default: 0.8, mode: "play" } as const;
const level = (low: number, high: number) =>
  ({ control: "velocity", range: [low, high], scale: "linear" }) as const;

/** Rounded drum head, short beater and quiet shell rattle. */
export const rockKick = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.2,
  parameters: { velocity },
  layers: [
    {
      id: "body",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: {
          points: [
            [0, { random: [118, 130] }],
            [0.025, 67],
            [0.16, 48],
          ],
          curve: "exponential",
        },
      },
      gainDb: level(-17, -5),
      envelope: { attack: 0, decay: 0.17, sustain: 0.2, release: 0.07 },
    },
    {
      id: "punch",
      source: {
        type: "oscillator",
        waveform: "triangle",
        frequency: {
          points: [
            [0, 340],
            [0.025, 120],
          ],
          curve: "exponential",
        },
      },
      gainDb: level(-24, -13),
      envelope: { attack: 0, decay: 0.035, sustain: 0, release: 0.02 },
    },
    {
      id: "grit",
      source: {
        type: "oscillator",
        waveform: "square",
        frequency: {
          points: [
            [0, 130],
            [0.06, 52],
          ],
          curve: "exponential",
        },
      },
      gainDb: level(-36, -26),
      envelope: { attack: 0, decay: 0.1, sustain: 0, release: 0.04 },
      effects: [{ type: "filter", filter: "lowpass", frequency: 420, q: 0.8 }],
    },
    {
      id: "click",
      source: { type: "noise", color: "white" },
      gainDb: level(-34, -22),
      envelope: { attack: 0, decay: 0.012, sustain: 0, release: 0.01 },
      effects: [
        { type: "filter", filter: "highpass", frequency: 2800, q: 0.7 },
      ],
    },
  ],
});

/** Backbeat snare: tuned shell, bandpassed body and bright wires. */
export const rockSnare = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.15,
  parameters: { velocity },
  layers: [
    {
      id: "shell",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: {
          points: [
            [0, { random: [225, 245] }],
            [0.05, 174],
          ],
          curve: "exponential",
        },
      },
      gainDb: level(-26, -12),
      envelope: { attack: 0, decay: 0.07, sustain: 0, release: 0.04 },
    },
    {
      id: "shell-edge",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: { random: [318, 332] },
      },
      gainDb: level(-33, -22),
      envelope: { attack: 0.001, decay: 0.055, sustain: 0, release: 0.04 },
    },
    {
      id: "body",
      source: { type: "noise", color: "white" },
      gainDb: level(-25, -10),
      envelope: { attack: 0, decay: 0.12, sustain: 0.12, release: 0.08 },
      effects: [
        {
          type: "filter",
          filter: "bandpass",
          frequency: {
            control: "velocity",
            range: [1100, 2400],
            scale: "linear",
          },
          q: 0.75,
        },
      ],
    },
    {
      id: "wires",
      source: { type: "noise", color: "white" },
      gainDb: level(-30, -15),
      envelope: { attack: 0, decay: 0.1, sustain: 0, release: 0.07 },
      effects: [
        { type: "filter", filter: "highpass", frequency: 5200, q: 0.7 },
      ],
    },
  ],
});

/** Tight closed hat. */
export const rockHat = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.02,
  parameters: { velocity },
  layers: [
    {
      id: "bronze",
      source: {
        type: "oscillator",
        waveform: "triangle",
        frequency: { random: [4310, 4390] },
      },
      gainDb: level(-44, -30),
      envelope: { attack: 0.001, decay: 0.018, sustain: 0.15, release: 0.025 },
      effects: [
        { type: "filter", filter: "highpass", frequency: 6500, q: 0.6 },
      ],
    },
    {
      id: "metal",
      source: { type: "noise", color: "white" },
      gainDb: level(-30, -12),
      envelope: { attack: 0, decay: 0.018, sustain: 0, release: 0.03 },
      effects: [
        {
          type: "filter",
          filter: "highpass",
          frequency: { random: [6200, 7000] },
          q: 0.7,
        },
        { type: "filter", filter: "bandpass", frequency: 9200, q: 0.5 },
      ],
    },
  ],
});

/** Open hat for offbeat lift. */
export const rockOpenHat = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.1,
  parameters: { velocity },
  layers: [
    {
      id: "bronze",
      source: {
        type: "oscillator",
        waveform: "triangle",
        frequency: { random: [4310, 4390] },
      },
      gainDb: level(-44, -33),
      envelope: { attack: 0.001, decay: 0.018, sustain: 0.15, release: 0.13 },
      effects: [
        { type: "filter", filter: "highpass", frequency: 6500, q: 0.6 },
      ],
    },
    {
      id: "metal",
      source: { type: "noise", color: "white" },
      gainDb: level(-30, -14),
      envelope: { attack: 0.004, decay: 0.09, sustain: 0.4, release: 0.16 },
      effects: [
        {
          type: "filter",
          filter: "highpass",
          frequency: { random: [5400, 6200] },
          q: 0.7,
        },
        { type: "filter", filter: "bandpass", frequency: 8400, q: 0.5 },
      ],
    },
  ],
});

/** Section-start crash: bright noise with a long metallic decay. */
export const rockCrash = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.05,
  parameters: { velocity },
  layers: [
    {
      id: "bronze",
      source: {
        type: "oscillator",
        waveform: "triangle",
        frequency: { random: [4310, 4390] },
      },
      gainDb: level(-44, -34),
      envelope: { attack: 0.001, decay: 0.018, sustain: 0.15, release: 0.65 },
      effects: [
        { type: "filter", filter: "highpass", frequency: 6500, q: 0.6 },
      ],
    },
    {
      id: "wash",
      source: { type: "noise", color: "white" },
      gainDb: level(-34, -20),
      envelope: { attack: 0.002, decay: 0.04, sustain: 0.6, release: 1.3 },
      effects: [
        { type: "filter", filter: "highpass", frequency: 3600, q: 0.7 },
        { type: "filter", filter: "bandpass", frequency: 7200, q: 0.4 },
      ],
    },
  ],
});
