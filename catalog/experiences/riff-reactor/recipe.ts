import { defineSound } from "audiobits";
import { ratioMapping } from "../../helpers/mapping";

// A picked, resonant rock palette built entirely from oscillators and noise. Every pitched recipe takes its note as a
// play-mode frequency in hertz, so one recipe plays any charted pitch. Layer
// frequencies use linear mappings whose range is the parameter range times a
// fixed ratio, which keeps octaves, fifths and detuning exact at every pitch.
// velocity in [0, 1] sets the played level.

const velocity = { min: 0, max: 1, default: 0.8, mode: "play" } as const;
const level = (low: number, high: number) =>
  ({ control: "velocity", range: [low, high], scale: "linear" }) as const;

export {
  rockKick as riffKick,
  rockSnare as riffSnare,
  rockHat as riffHat,
  rockOpenHat as riffOpenHat,
  rockCrash as riffCrash,
} from "../../recipes/rock-drum-kit/recipe";
export { pickedBass as riffBass } from "../../recipes/picked-bass/recipe";

/** Bowed power harmony: staggered attacks and a slowly settling warm spectrum. */
const padFrequency = {
  min: 60,
  max: 200,
  default: 82.41,
  mode: "play",
} as const;
export const riffPad = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 1.6,
  parameters: {
    frequency: padFrequency,
    velocity,
  },
  layers: [
    {
      id: "root",
      source: {
        type: "oscillator",
        waveform: "triangle",
        frequency: ratioMapping("frequency", padFrequency, 1),
      },
      gainDb: level(-25, -13),
      envelope: { attack: 0.25, decay: 0.4, sustain: 0.55, release: 0.45 },
    },
    {
      id: "root-detuned",
      source: {
        type: "oscillator",
        waveform: "triangle",
        frequency: {
          control: "frequency",
          range: [60.36, 201.2],
          scale: "linear",
        },
      },
      gainDb: level(-27, -15),
      envelope: { attack: 0.3, decay: 0.4, sustain: 0.55, release: 0.45 },
    },
    {
      id: "fifth",
      source: {
        type: "oscillator",
        waveform: "triangle",
        frequency: ratioMapping("frequency", padFrequency, 1.5),
      },
      gainDb: level(-29, -17),
      envelope: { attack: 0.3, decay: 0.4, sustain: 0.55, release: 0.45 },
    },
    {
      id: "octave",
      source: {
        type: "oscillator",
        waveform: "triangle",
        frequency: ratioMapping("frequency", padFrequency, 2),
      },
      gainDb: level(-25, -15),
      envelope: { attack: 0.2, decay: 0.4, sustain: 0.55, release: 0.45 },
    },
  ],
  effects: [
    { type: "filter", filter: "highpass", frequency: 110, q: 0.7 },
    {
      type: "filter",
      filter: "lowpass",
      frequency: {
        points: [
          [0, 850],
          [0.4, 2100],
          [1.6, 1200],
        ],
        curve: "exponential",
      },
      q: 0.6,
    },
  ],
});

/** Picked bell-string: fundamental and a quicker-decaying second mode. */
const arpFrequency = {
  min: 150,
  max: 1400,
  default: 329.63,
  mode: "play",
} as const;
export const riffArp = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.18,
  parameters: {
    frequency: arpFrequency,
    velocity,
  },
  layers: [
    {
      id: "pluck",
      source: {
        type: "oscillator",
        waveform: "triangle",
        frequency: ratioMapping("frequency", arpFrequency, 1),
      },
      gainDb: level(-30, -17),
      envelope: { attack: 0.003, decay: 0.13, sustain: 0.06, release: 0.17 },
      effects: [
        {
          type: "filter",
          filter: "lowpass",
          frequency: {
            points: [
              [0, 4200],
              [0.08, 1300],
            ],
            curve: "exponential",
          },
          q: 0.7,
        },
      ],
    },
    {
      id: "string-mode",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: ratioMapping("frequency", arpFrequency, 2.002),
      },
      gainDb: level(-37, -24),
      envelope: { attack: 0.002, decay: 0.055, sustain: 0, release: 0.08 },
    },
  ],
  effects: [{ type: "delay", time: 0.3516, feedback: 0, mix: 0.16 }],
});

/** Muted power strings: a brief bright pick followed by a darker body. */
const stabFrequency = {
  min: 60,
  max: 400,
  default: 164.81,
  mode: "play",
} as const;
export const riffStab = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.12,
  parameters: {
    frequency: stabFrequency,
    velocity,
  },
  layers: [
    {
      id: "root",
      source: {
        type: "oscillator",
        waveform: "triangle",
        frequency: ratioMapping("frequency", stabFrequency, 1),
      },
      gainDb: level(-25, -13),
      envelope: { attack: 0.004, decay: 0.08, sustain: 0.16, release: 0.08 },
    },
    {
      id: "fifth",
      source: {
        type: "oscillator",
        waveform: "triangle",
        frequency: ratioMapping("frequency", stabFrequency, 1.5),
      },
      gainDb: level(-27, -15),
      envelope: { attack: 0.004, decay: 0.08, sustain: 0.16, release: 0.08 },
    },
    {
      id: "octave",
      source: {
        type: "oscillator",
        waveform: "sawtooth",
        frequency: ratioMapping("frequency", stabFrequency, 2),
      },
      gainDb: level(-33, -21),
      envelope: { attack: 0.003, decay: 0.08, sustain: 0.4, release: 0.08 },
    },
  ],
  effects: [
    {
      type: "filter",
      filter: "lowpass",
      frequency: {
        points: [
          [0, { control: "velocity", range: [1800, 4600], scale: "linear" }],
          [0.12, 1200],
        ],
        curve: "exponential",
      },
      q: 0.75,
    },
  ],
});

/** One-bar noise and saw riser into a section change. */
export const riffRiser = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 1.8,
  layers: [
    {
      id: "air",
      source: { type: "noise", color: "white" },
      gainDb: -20,
      envelope: { attack: 1.6, decay: 0, sustain: 1, release: 0.12 },
      effects: [
        {
          type: "filter",
          filter: "bandpass",
          frequency: {
            points: [
              [0, 500],
              [1.8, 7000],
            ],
            curve: "exponential",
          },
          q: 1.8,
        },
      ],
    },
    {
      id: "sweep",
      source: {
        type: "oscillator",
        waveform: "sawtooth",
        frequency: {
          points: [
            [0, 110],
            [1.8, 440],
          ],
          curve: "exponential",
        },
      },
      gainDb: -32,
      envelope: { attack: 1.7, decay: 0, sustain: 1, release: 0.1 },
      effects: [{ type: "filter", filter: "lowpass", frequency: 2400, q: 1 }],
    },
  ],
});

/**
 * Singing string lead: a rounded fundamental, separate decaying harmonics,
 * a quiet pick, and a small onset scoop. Velocity opens its spectrum.
 * Sustained: the controller releases each phrase on the audio clock.
 */
const leadFrequency = {
  min: 150,
  max: 1400,
  default: 329.63,
  mode: "play",
} as const;
export const riffLead = defineSound({
  schemaVersion: 1,
  kind: "sustained",
  parameters: {
    frequency: leadFrequency,
    velocity,
  },
  layers: [
    {
      id: "string-body",
      source: {
        type: "oscillator",
        waveform: "triangle",
        frequency: {
          points: [
            [
              0,
              { control: "frequency", range: [148.8, 1388.8], scale: "linear" },
            ],
            [0.028, ratioMapping("frequency", leadFrequency, 1)],
          ],
          curve: "exponential",
        },
      },
      gainDb: level(-22, -10),
      envelope: { attack: 0.008, decay: 0.28, sustain: 0.48, release: 0.12 },
    },
    {
      id: "second-mode",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: ratioMapping("frequency", leadFrequency, 2.002),
      },
      gainDb: level(-34, -19),
      envelope: { attack: 0.004, decay: 0.18, sustain: 0.12, release: 0.1 },
    },
    {
      id: "bow-edge",
      source: {
        type: "oscillator",
        waveform: "sawtooth",
        frequency: ratioMapping("frequency", leadFrequency, 0.999),
      },
      gainDb: level(-39, -24),
      envelope: { attack: 0.014, decay: 0.24, sustain: 0.2, release: 0.1 },
    },
    {
      id: "pick",
      source: { type: "noise", color: "white" },
      gainDb: level(-44, -30),
      envelope: { attack: 0.001, decay: 0.018, sustain: 0, release: 0.012 },
      effects: [
        { type: "filter", filter: "bandpass", frequency: 2400, q: 0.7 },
      ],
    },
  ],
  effects: [
    {
      type: "filter",
      filter: "lowpass",
      frequency: {
        points: [
          [0, { control: "velocity", range: [1700, 5800], scale: "linear" }],
          [0.35, { control: "velocity", range: [950, 3000], scale: "linear" }],
        ],
        curve: "exponential",
      },
      q: 0.7,
    },
    { type: "delay", time: 0.3516, feedback: 0.18, mix: 0.14 },
  ],
});

/** A muted, dead-string thunk for a missed or stray lead input. */
export const riffChoke = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.04,
  layers: [
    {
      id: "scrape",
      source: { type: "noise", color: "white" },
      gainDb: -26,
      envelope: { attack: 0.002, decay: 0.035, sustain: 0, release: 0.04 },
      effects: [{ type: "filter", filter: "bandpass", frequency: 1100, q: 2 }],
    },
    {
      id: "thud",
      source: {
        type: "oscillator",
        waveform: "triangle",
        frequency: {
          points: [
            [0, 110],
            [0.04, 70],
          ],
          curve: "exponential",
        },
      },
      gainDb: -30,
      envelope: { attack: 0.002, decay: 0.03, sustain: 0, release: 0.04 },
      effects: [{ type: "filter", filter: "lowpass", frequency: 360, q: 0.7 }],
    },
  ],
});
