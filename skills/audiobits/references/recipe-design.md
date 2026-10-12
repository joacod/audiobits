# Original recipe design

Inspect the installed exported `Recipe`, `Parameter`, `Value` and `Layer` types,
schema and capabilities. Do not copy the monorepo's internal compiler or assume
features from a newer website. For the schema-1 contract, the design vocabulary
includes oscillator/noise layers, envelopes, filters, parameter mappings,
frequency automation and seeded variation. Confirm each chosen feature locally.

Translate the request into duration, tonal/noise character, envelope, layers and
useful controls. Start with one layer and conservative gain; add layers only for
a requested acoustic role. Keep labels, pointer input, game state, timing loops
and native nodes outside the recipe.

- `one-shot` has a finite `duration`; `sustained` runs until stopped and has no
  duration field. Envelope times are seconds, frequency is Hz, gain is dB.
- A parameter's `min`, `max` and `default` define input bounds. `mode: "play"`
  selects values at playback; `mode: "live"` additionally requires `smoothing`
  and permits active-voice updates. Inspect the schema for numeric limits.
- A mapping references a declared control and maps its input range to an output
  `range` with `scale`. Positive frequency endpoints permit exponential scaling;
  negative dB values use linear scaling. Automation points have ordered times.
- Seeded variation is data, not a callback. Use a fixed playback seed for a
  reproducible comparison. The installed validator enforces semantic constraints
  beyond JSON Schema, including live mappings, bounds and resource limits.

This original sustained sound maps one live control to pitch and gain:

```ts
import { defineSound } from "audiobits";

export const controlledTone = defineSound({
  schemaVersion: 1,
  kind: "sustained",
  parameters: {
    intensity: { min: 0, max: 1, default: 0.2, mode: "live", smoothing: 0.06 },
  },
  layers: [
    {
      id: "body",
      source: {
        type: "oscillator",
        waveform: "triangle",
        frequency: {
          control: "intensity",
          range: [110, 440],
          scale: "exponential",
        },
      },
      gainDb: { control: "intensity", range: [-30, -18], scale: "linear" },
      envelope: { attack: 0.02, decay: 0.04, sustain: 0.8, release: 0.12 },
    },
  ],
});
```

Preserve literal parameter names with `defineSound` so `sound.play` and
`voice.set` retain inferred control types. For generated JSON, call
`validateRecipe(input)` and narrow on `result.ok` before using `result.recipe`.
Display `issues` with their paths; do not cast unknown input to `Recipe`, strip
unsupported keys to hide errors, or evaluate text as JavaScript.

Validate both the original and its JSON round trip. Typecheck the actual host
and exercise defaults, min/max controls, rapid changes and stopping during
sustain/release. Native signal checks can establish finite output, useful control
changes and bounded resources.
