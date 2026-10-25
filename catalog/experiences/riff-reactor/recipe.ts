import { defineSound } from "audiobits";
import { ratioMapping } from "../../helpers/mapping";

// Industrial synth-rock band. Every pitched recipe takes its note as a
// play-mode frequency in hertz, so one recipe plays any charted pitch. Layer
// frequencies use linear mappings whose range is the parameter range times a
// fixed ratio, which keeps octaves, fifths and detuning exact at every pitch.
// velocity in [0, 1] sets the played level.

const velocity = { min: 0, max: 1, default: 0.8, mode: "play" } as const;
const level = (low: number, high: number) =>
  ({ control: "velocity", range: [low, high], scale: "linear" }) as const;

/** Four-on-the-floor kick: a pitch-dropping body, punch, grit and a click. */
export const riffKick = defineSound({
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
            [0, 165],
            [0.03, 78],
            [0.16, 47],
          ],
          curve: "exponential",
        },
      },
      gainDb: level(-14, -2),
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
      gainDb: level(-20, -9),
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
      gainDb: level(-30, -18),
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
export const riffSnare = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.15,
  parameters: { velocity },
  layers: [
    {
      id: "shell",
      source: {
        type: "oscillator",
        waveform: "triangle",
        frequency: {
          points: [
            [0, 250],
            [0.05, 178],
          ],
          curve: "exponential",
        },
      },
      gainDb: level(-26, -12),
      envelope: { attack: 0, decay: 0.07, sustain: 0, release: 0.04 },
    },
    {
      id: "body",
      source: { type: "noise", color: "white" },
      gainDb: level(-22, -6),
      envelope: { attack: 0, decay: 0.12, sustain: 0.12, release: 0.08 },
      effects: [
        { type: "filter", filter: "bandpass", frequency: 1800, q: 0.8 },
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
export const riffHat = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.02,
  parameters: { velocity },
  layers: [
    {
      id: "metal",
      source: { type: "noise", color: "white" },
      gainDb: level(-30, -12),
      envelope: { attack: 0, decay: 0.018, sustain: 0, release: 0.03 },
      effects: [
        { type: "filter", filter: "highpass", frequency: 7600, q: 0.9 },
        { type: "filter", filter: "bandpass", frequency: 10500, q: 0.6 },
      ],
    },
  ],
});

/** Open hat for offbeat lift. */
export const riffOpenHat = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.1,
  parameters: { velocity },
  layers: [
    {
      id: "metal",
      source: { type: "noise", color: "white" },
      gainDb: level(-30, -14),
      envelope: { attack: 0.004, decay: 0.09, sustain: 0.4, release: 0.16 },
      effects: [
        { type: "filter", filter: "highpass", frequency: 6800, q: 0.8 },
        { type: "filter", filter: "bandpass", frequency: 9400, q: 0.5 },
      ],
    },
  ],
});

/** Driving pick bass: plucked filtered saw over a sine sub and octave grit. */
const bassFrequency = {
  min: 30,
  max: 200,
  default: 82.41,
  mode: "play",
} as const;
export const riffBass = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.17,
  parameters: {
    frequency: bassFrequency,
    velocity,
  },
  layers: [
    {
      id: "saw",
      source: {
        type: "oscillator",
        waveform: "sawtooth",
        frequency: ratioMapping("frequency", bassFrequency, 1),
      },
      gainDb: level(-20, -10),
      envelope: { attack: 0.003, decay: 0.09, sustain: 0.7, release: 0.05 },
      effects: [
        {
          type: "filter",
          filter: "lowpass",
          frequency: {
            points: [
              [
                0,
                { control: "frequency", range: [700, 3200], scale: "linear" },
              ],
              [
                0.14,
                { control: "frequency", range: [220, 1100], scale: "linear" },
              ],
            ],
            curve: "exponential",
          },
          q: 2.2,
        },
      ],
    },
    {
      id: "sub",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: ratioMapping("frequency", bassFrequency, 1),
      },
      gainDb: level(-20, -11),
      envelope: { attack: 0.003, decay: 0.05, sustain: 0.85, release: 0.05 },
    },
    {
      id: "grit",
      source: {
        type: "oscillator",
        waveform: "square",
        frequency: {
          control: "frequency",
          range: [60.18, 401.2],
          scale: "linear",
        },
      },
      gainDb: level(-34, -23),
      envelope: { attack: 0.003, decay: 0.06, sustain: 0.4, release: 0.04 },
      effects: [{ type: "filter", filter: "lowpass", frequency: 1500, q: 0.7 }],
    },
  ],
});

/** Power-chord pad: root, fifth and octave saws under a dark lowpass. */
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
        waveform: "sawtooth",
        frequency: ratioMapping("frequency", padFrequency, 1),
      },
      gainDb: level(-25, -13),
      envelope: { attack: 0.25, decay: 0.4, sustain: 0.8, release: 0.45 },
    },
    {
      id: "root-detuned",
      source: {
        type: "oscillator",
        waveform: "sawtooth",
        frequency: {
          control: "frequency",
          range: [60.36, 201.2],
          scale: "linear",
        },
      },
      gainDb: level(-27, -15),
      envelope: { attack: 0.3, decay: 0.4, sustain: 0.8, release: 0.45 },
    },
    {
      id: "fifth",
      source: {
        type: "oscillator",
        waveform: "sawtooth",
        frequency: ratioMapping("frequency", padFrequency, 1.5),
      },
      gainDb: level(-29, -17),
      envelope: { attack: 0.3, decay: 0.4, sustain: 0.8, release: 0.45 },
    },
    {
      id: "octave",
      source: {
        type: "oscillator",
        waveform: "triangle",
        frequency: ratioMapping("frequency", padFrequency, 2),
      },
      gainDb: level(-25, -15),
      envelope: { attack: 0.2, decay: 0.4, sustain: 0.8, release: 0.45 },
    },
  ],
  effects: [
    { type: "filter", filter: "highpass", frequency: 110, q: 0.7 },
    { type: "filter", filter: "lowpass", frequency: 2200, q: 0.9 },
  ],
});

/** Plucked square arpeggio with one dotted-eighth echo at 128 BPM. */
const arpFrequency = {
  min: 150,
  max: 1400,
  default: 329.63,
  mode: "play",
} as const;
export const riffArp = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.08,
  parameters: {
    frequency: arpFrequency,
    velocity,
  },
  layers: [
    {
      id: "pluck",
      source: {
        type: "oscillator",
        waveform: "square",
        frequency: ratioMapping("frequency", arpFrequency, 1),
      },
      gainDb: level(-30, -17),
      envelope: { attack: 0.002, decay: 0.07, sustain: 0.3, release: 0.1 },
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
          q: 1.6,
        },
      ],
    },
  ],
  effects: [{ type: "delay", time: 0.3516, feedback: 0, mix: 0.3 }],
});

/** Short saw power-chord stab for the thickest tier. */
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
        waveform: "sawtooth",
        frequency: ratioMapping("frequency", stabFrequency, 1),
      },
      gainDb: level(-25, -13),
      envelope: { attack: 0.003, decay: 0.1, sustain: 0.5, release: 0.08 },
    },
    {
      id: "fifth",
      source: {
        type: "oscillator",
        waveform: "sawtooth",
        frequency: ratioMapping("frequency", stabFrequency, 1.5),
      },
      gainDb: level(-27, -15),
      envelope: { attack: 0.003, decay: 0.1, sustain: 0.5, release: 0.08 },
    },
    {
      id: "octave",
      source: {
        type: "oscillator",
        waveform: "square",
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
          [0, 3800],
          [0.12, 1200],
        ],
        curve: "exponential",
      },
      q: 1.4,
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
      gainDb: -12,
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
      gainDb: -24,
      envelope: { attack: 1.7, decay: 0, sustain: 1, release: 0.1 },
      effects: [{ type: "filter", filter: "lowpass", frequency: 2400, q: 1 }],
    },
  ],
});

/** Section-start crash: bright noise with a long metallic decay. */
export const riffCrash = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.05,
  parameters: { velocity },
  layers: [
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

/**
 * Expressive lead: two detuned saws and a sub-octave square that scoop up
 * into the note, under a pitch-tracking lowpass that settles after the attack,
 * with a dotted-eighth echo. Sustained: stop() ends the note.
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
      id: "saw",
      source: {
        type: "oscillator",
        waveform: "sawtooth",
        frequency: {
          points: [
            [
              0,
              { control: "frequency", range: [146.3, 1365], scale: "linear" },
            ],
            [0.05, ratioMapping("frequency", leadFrequency, 1)],
          ],
          curve: "exponential",
        },
      },
      gainDb: level(-20, -9),
      envelope: { attack: 0.006, decay: 0.3, sustain: 0.72, release: 0.09 },
    },
    {
      id: "saw-detuned",
      source: {
        type: "oscillator",
        waveform: "sawtooth",
        frequency: {
          points: [
            [
              0,
              { control: "frequency", range: [147.2, 1373], scale: "linear" },
            ],
            [
              0.05,
              { control: "frequency", range: [150.9, 1408.4], scale: "linear" },
            ],
          ],
          curve: "exponential",
        },
      },
      gainDb: level(-22, -11),
      envelope: { attack: 0.006, decay: 0.3, sustain: 0.72, release: 0.09 },
    },
    {
      id: "sub",
      source: {
        type: "oscillator",
        waveform: "square",
        frequency: ratioMapping("frequency", leadFrequency, 0.5),
      },
      gainDb: level(-30, -20),
      envelope: { attack: 0.006, decay: 0.2, sustain: 0.6, release: 0.08 },
    },
  ],
  effects: [
    {
      type: "filter",
      filter: "lowpass",
      frequency: {
        points: [
          [0, { control: "frequency", range: [2600, 9000], scale: "linear" }],
          [
            0.35,
            { control: "frequency", range: [1300, 4200], scale: "linear" },
          ],
        ],
        curve: "exponential",
      },
      q: 1.8,
    },
    { type: "delay", time: 0.3516, feedback: 0.25, mix: 0.18 },
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
        waveform: "square",
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
