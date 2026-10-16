import { defineSound, type Layer } from "audiobits";
import { materials, type Material } from "./materials";

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

const exciter = ({
  id,
  frequency,
  q,
  gainDb,
  decay,
  highpass,
}: Material["exciter"]): Layer => ({
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
    layers: [exciter(m.exciter), ...partialLayers(m)],
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

// Only recipes are exported here: installs validate every export as a recipe.
/** Early surface returns, one per material. */
export const woodReturn = returnFor(materials.wood, false);
export const glassReturn = returnFor(materials.glass, false);
export const metalReturn = returnFor(materials.metal, false);

/** Late grains: the same material voice carried by its own native echo. */
export const woodEcho = returnFor(materials.wood, true);
export const glassEcho = returnFor(materials.glass, true);
export const metalEcho = returnFor(materials.metal, true);
