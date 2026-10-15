# Original recipe design

Inspect the installed exported `Recipe`, `Parameter`, `Value` and `Layer` types,
schema and capabilities. Do not copy the monorepo's internal compiler or assume
features from a newer website. For the schema-1 contract, the design vocabulary
includes oscillator/noise layers, envelopes, effects, parameter mappings,
frequency automation and seeded variation. Schema version alone does not prove
feature availability; confirm each chosen feature locally.

For an original sound, identify what the listener should recognize and which
changes in application state should be audible. Choose the transient, sustained
texture, spectral movement and silence that serve that intent. A short interface
cue may need only one sentence of reasoning and one layer. Start with conservative
gain; add layers for distinct audible roles, not complexity. Keep labels, pointer
input, game state, timing loops and native nodes outside the recipe.

Give each control an acoustic responsibility. One intensity control can
intentionally brighten and strengthen a sound; independent properties such as
material character and distance attenuation should remain independently tunable.
Map bounded application state to those controls in the host or sound controller,
then check each control alone and in combination. A valid mapping can still mask
another control or produce little perceptible change.

## Choose the sound mechanism

Reuse or adapt a recipe when its acoustic identity fits. Compose supported layers
for a new identity; use a small controller only for coordinated voices, events or
state transitions that a recipe and direct live updates cannot express.

Use built-in delay when the intent is to repeat the input signal, rather than
rebuilding it with native nodes or approximating it with unrelated new tones.
Choose layer effects for one component and recipe effects for the summed sound;
effect order matters. Compare against the dry sound before retaining an effect.
An effect is not inherently an improvement.

When delay is available, inspect its structured capability metadata and installed
types: delay values resolve at play time, not through live mappings or automation
points. Live source, gain and filter controls can still coexist with delay. A
filter before or after delay shapes input or output, not each feedback pass.
Leave headroom for feedback and overlapping voices. Use the
[delay contract](https://www.audiobits.dev/docs/recipes#delay) for explanation,
checking exact limits against the installed runtime.

Prefer composition when it produces comparably good results. A focused
general-purpose capability may be justified by a concrete requirement or an
experiment demonstrating a meaningful improvement in acoustic quality,
expressiveness, performance or authoring simplicity, even when composition
technically works. Avoid speculative expansion. Do not silently patch the runtime
or introduce custom DSP; propose that work separately when outside the request.

## Construct and validate

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
sustain/release. Use [controlled comparisons](tooling.md#controlled-comparisons)
when a nontrivial sound-design choice needs evidence.
