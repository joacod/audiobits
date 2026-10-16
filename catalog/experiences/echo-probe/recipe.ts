import { defineSound, type Layer } from "audiobits";

/** A struck ceramic/electronic impulse: body and a breath of air. */
export const echoProbe = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.16,
  layers: [
    {
      id: "struck-body",
      source: {
        type: "oscillator",
        waveform: "sine",
        frequency: {
          points: [
            [0, 620],
            [0.018, 410],
            [0.16, 380],
          ],
          curve: "exponential",
        },
      },
      gainDb: -15,
      envelope: { attack: 0.003, decay: 0.12, sustain: 0.015, release: 0.04 },
    },
    {
      id: "air-edge",
      source: { type: "noise", color: "white" },
      gainDb: { random: [-26, -24] },
      envelope: { attack: 0.002, decay: 0.045, sustain: 0, release: 0.035 },
      effects: [
        {
          type: "filter",
          filter: "bandpass",
          frequency: {
            points: [
              [0, 3700],
              [0.07, 1350],
            ],
            curve: "exponential",
          },
          q: 1.2,
        },
      ],
    },
  ],
});

export type MaterialId = "wood" | "glass" | "metal";

/** One row per material: what the surface sounds like when the pulse hits it, and how its echo travels. */
export interface Material {
  readonly label: string;
  /** Legacy `surface` value this material replaces (wood dark, metal mid, glass bright). */
  readonly surface: number;
  /** Gate length of one return, seconds. */
  readonly duration: number;
  /** Exciter plus resonant modes. Partials are [ratio, gainDb, decay seconds, detune Hz]. */
  readonly exciter: Layer;
  readonly fundamental: number;
  readonly partials: readonly (readonly [number, number, number, number?])[];
  /** Distance damping: lowpass cutoff near to far. */
  readonly damping: readonly [number, number];
  /** Native repeat: time near/far, feedback, mix. */
  readonly echo: {
    readonly time: readonly [number, number];
    readonly feedback: number;
    readonly mix: number;
  };
  /** Late grain gain offset, dB. Ringing materials keep more late energy. */
  readonly lateDb: number;
}

const noise = (
  id: string,
  frequency: number,
  q: number,
  gainDb: number,
  decay: number,
  highpass = false,
): Layer => ({
  id,
  source: { type: "noise", color: "white" },
  gainDb,
  envelope: { attack: 0.001, decay, sustain: 0, release: 0.01 },
  effects: [
    highpass
      ? { type: "filter", filter: "highpass", frequency, q }
      : { type: "filter", filter: "bandpass", frequency, q },
  ],
});

export const materials: Readonly<Record<MaterialId, Material>> = {
  /** Short, low, noise-driven knock: woodblock / knuckle on a door. Fast and dry. */
  wood: {
    label: "WOOD",
    surface: 0.1,
    duration: 0.16,
    exciter: noise("knock", 1300, 1.4, -10, 0.014),
    fundamental: 190,
    partials: [
      [1, -9, 0.11],
      [2.62, -14, 0.07],
      [5.9, -21, 0.04],
    ],
    damping: [5200, 1800],
    echo: { time: [0.055, 0.085], feedback: 0.12, mix: 0.18 },
    lateDb: -4,
  },
  /** High, slightly inharmonic sines, glassy tick, bright long ring with shimmer. Medium echo. */
  glass: {
    label: "GLASS",
    surface: 0.95,
    duration: 1.3,
    exciter: noise("tick", 7000, 0.8, -26, 0.004, true),
    fundamental: 1760,
    partials: [
      [1, -12, 1.2, 0],
      [1, -18, 1.1, 2.4],
      [2.32, -17, 0.8, 0],
      [4.25, -22, 0.5, 0],
      [6.63, -27, 0.3, 0],
    ],
    // Highest mode is 11.7 kHz; every glass frequency stays below 12 kHz.
    damping: [11000, 6500],
    echo: { time: [0.13, 0.19], feedback: 0.32, mix: 0.3 },
    lateDb: 0,
  },
  /** Dense bell partials with detuned pairs: long ring with slow beating. Slow, ringing echoes. */
  metal: {
    label: "METAL",
    surface: 0.5,
    duration: 2.4,
    exciter: noise("strike", 3200, 1, -22, 0.006),
    fundamental: 440,
    // Risset-style bell ratios; pairs 0.9 and 1.7 Hz apart beat slowly. Six
    // modes keep a full metal group near the old per-group source budget.
    partials: [
      [0.56, -14, 2.3, 0],
      [0.56, -16, 2.2, 0.9],
      [0.92, -14, 1.9, 0],
      [0.92, -17, 1.8, 1.7],
      [1.19, -16, 1.5, 0],
      [2.74, -21, 0.8, 0],
    ],
    damping: [11000, 3500],
    echo: { time: [0.24, 0.32], feedback: 0.45, mix: 0.32 },
    lateDb: 2,
  },
};

const partialLayers = (m: Material): Layer[] =>
  m.partials.map(([ratio, gainDb, decay, detune = 0], index) => ({
    id: `mode-${index}`,
    source: {
      type: "oscillator",
      waveform: "sine",
      frequency: m.fundamental * ratio + detune,
    },
    gainDb,
    envelope: { attack: 0.001, decay, sustain: 0, release: 0.02 },
  }));

const parameters = {
  distance: { min: 0, max: 1, default: 0, mode: "play" },
} as const;

/**
 * The pulse "strikes" the material and distance damps it. Early returns are
 * dry so a retired voice ends within its 20 ms release plus 50 ms filter tail.
 * Late grains add the material's native echo; they are cut by disposal.
 */
function returnFor(m: Material, echo: boolean) {
  return defineSound({
    schemaVersion: 1,
    kind: "one-shot",
    duration: m.duration,
    parameters,
    layers: [m.exciter, ...partialLayers(m)],
    effects: [
      {
        type: "filter",
        filter: "lowpass",
        frequency: {
          control: "distance",
          range: m.damping,
          scale: "exponential",
        },
        q: 0.7,
      },
      ...(echo
        ? [
            {
              type: "delay" as const,
              time: {
                control: "distance",
                range: m.echo.time,
                scale: "exponential" as const,
              },
              feedback: m.echo.feedback,
              mix: m.echo.mix,
            },
          ]
        : []),
    ],
  });
}

type ProbeSound = ReturnType<typeof returnFor>;

/** Early surface returns, one per material. */
export const probeReturns: Readonly<Record<MaterialId, ProbeSound>> = {
  wood: returnFor(materials.wood, false),
  glass: returnFor(materials.glass, false),
  metal: returnFor(materials.metal, false),
};

/** Late grains: the same material voice carried by its own native echo. */
export const probeEchoes: Readonly<Record<MaterialId, ProbeSound>> = {
  wood: returnFor(materials.wood, true),
  glass: returnFor(materials.glass, true),
  metal: returnFor(materials.metal, true),
};

/** Legacy numeric surface maps to the nearest material. */
export const materialFor = (surface: number): MaterialId =>
  surface < 0.3 ? "wood" : surface < 0.75 ? "metal" : "glass";
