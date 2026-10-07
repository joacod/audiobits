# Recipe model and runtime contract

Canonical schema-1 semantics for the private candidate. Exact executable
limits are in the [package reference](../packages/audiobits/README.md).
The schema remains unreleased; authoring sketches are not capabilities.

## Data boundary

A recipe is plain JSON: finite numbers, strings, booleans, arrays, and plain
objects. No functions, expression strings, native nodes, URLs to executable
code, or prototype-dependent behavior. Definitions are copied and deeply frozen;
mutating the original input cannot alter an existing sound.

`schemaVersion: 1` is independent of the npm version. Unknown versions and fields
are rejected with an issue code, JSON-style path, and actionable message.
Before publication the proposed schema may change in place; once recipes are
published/persisted under v1, incompatible semantics require a new schema version.
Do not create an empty migration framework before a real migration exists.

## Root shape

| Field           | Meaning                                                             |
| --------------- | ------------------------------------------------------------------- |
| `schemaVersion` | Integer, initially `1`                                              |
| `kind`          | `one-shot` or `sustained`                                           |
| `duration`      | Required gate time in seconds for one-shot; forbidden for sustained |
| `parameters`    | Optional map of up to 16 named parameter declarations               |
| `layers`        | Between 1 and 16 uniquely identified synthesis layers               |
| `effects`       | Optional ordered per-voice effect list, initially filter only       |

A layer has an `id`, a `source`, `gainDb`, and an `envelope`. Optional layer
effects process only that layer. All layer outputs sum before recipe effects.
Maximum eight effects total across a recipe, not eight per layer.

The first source is `{ type: "oscillator", waveform, frequency }`; waveforms
are sine, triangle, sawtooth, and square. The model supports `{ type: "noise", color:
"white" }`. Filtered noise uses a layer filter rather than more source types.
Use generated sample-rate-aware buffers; no audio-file fetch is needed.

Finite duration is in `(0, 60]` seconds. Envelope attack and decay are each in
`[0, 10]`, sustain in `[0, 1]`, release in `[0.005, 10]`. Attack plus decay must
not exceed a one-shot's gate duration. Enforce a minimum 2 ms onset ramp even
when attack is zero. Layer gain is in `[-60, 0]` dB. These are initial resource
bounds, not quality recommendations; do not quietly relax them for a fixture.

## Time and lifetime

One-shot duration is the time from voice onset to gate close, not total output
duration. Release begins at gate close and reaches zero after its declared time.
Sources stop after release; per-voice effect tails extend resource lifetime only
by their bounded declared allowance. Sustained sounds close their gate on stop.

Natural voice cleanup occurs after the latest layer release and effect tail.
Calling `stop()` during attack or decay releases from the current automated
value, not a guessed sustain value. Repeated stop cannot extend playback.
Disposal cancels scheduled starts, clears tails, and releases all owned resources;
it is distinct from normal musical release.

All recipe times are relative to voice onset, scheduled against context time.
Playback options may supply an absolute `at` time in the owning context's clock;
omit it for immediate playback. Reject past times rather than interpreting them
as delayed UI input. A future scheduled voice reserves capacity and can be
stopped before onset without becoming audible.

## Values and controls

Supported values include numeric values, frequency automation, bounded
control mappings and seeded variation to supported targets. Use this finite
grammar rather than arbitrary expressions. Frequencies support `Value`; layer gain
supports only `PointValue`, while envelopes and filter Q remain numeric:

```ts
// Abbreviated notation; generated declarations are exported by audiobits.
type Mapping = {
  control: string;
  range: [number, number];
  scale: "linear" | "exponential";
};
type Variation = { random: [number, number] };
type PointValue = number | Mapping | Variation;
type Value =
  | PointValue
  | { points: [number, PointValue][]; curve: "linear" | "exponential" };
```

A mapping normalizes a named control within its declared min/max and maps it to
the target range. Exponential mapping requires positive endpoints. Variation is
uniform and sampled once per property per voice. Automation starts at time zero,
has strictly increasing timestamps, and is limited to 128 points across the
recipe. Exponential automation likewise requires positive resolved values.
One-shot automation ends no later than gate close; sustained automation is an
onset sequence of at most 60 seconds, then holds its final value.

Frequency values are Hz, gain values dB, time seconds, and pan `[-1, 1]`.
Frequency targets accept `[20, 20000]`; context-dependent checks reject values
at or above Nyquist before allocating a voice. Playback gain/pan are numeric
options and do not introduce a transposition API in the first core.

Parameter declarations carry `min`, `max`, `default`, and `mode` (`play` or
`live`). Live declarations also carry `smoothing` seconds in `[0.005, 1]`.
References must exist; supplied parameter names and values must be valid.
Out-of-range values are rejected, not silently clamped. A mapping inside an
automation point may reference only a `play` parameter, preventing ambiguity
about retiming an existing envelope. Live mappings may drive direct source
frequency, layer gain, or filter frequency. Envelopes remain fixed per recipe.

`voice.set()` applies a validated parameter update atomically using its declared
smoothing; invalid or play-only updates change nothing. Retarget a ramp from
its current value, not the previous UI value. Calling set after stop/disposal
fails with an ended-voice error.

## Randomness

An explicit unsigned 32-bit seed at play time reproduces variation choices and
noise generation for the same normalized recipe and sample rate. Normalize
property traversal deterministically. The implementation uses xorshift32 (shifts 13/17/5), mapping public seed zero internally
to `0x6d2b79f5`, and rejects invalid seeds. Known-vector tests protect the stream.
The [development API](../packages/audiobits/README.md) specifies traversal,
per-layer noise streams, sample-rate bounds, and buffer ownership.
Without a seed, the engine chooses a fresh one and exposes it on the voice for
replay. Do not call unseeded randomness while rendering a seeded sound.

Reproducibility does not promise identical oscillator/filter output across
browsers or sample rates. Per-voice variation is distinct from continuous random
modulation, which is deferred.

## Effects

The model supports a lowpass/highpass/bandpass filter with frequency and Q.
Q is bounded to `[0.1, 20]`. Saturation remains unimplemented; listening has not
established a need for it. Do not ship placeholder descriptors for unsupported effects.

The experimental bus API supports shared delay with bounded delay time, feedback, wet amount, and
tail cutoff. Shared effects are runtime bus configuration, not embedded context
objects in recipe JSON. No convolution files, feedback graph DSL, or arbitrary
routing nodes are required for the core.

## Canonical generation and validation

Author a small structural descriptor, generating TypeScript recipe data types
and JSON Schema at build time. Semantic validation covers references, timelines,
resolved endpoint ranges, and budgets; it must inspect all allowed mapping and
variation extrema, not just a default parameter value. Do not implement a generic
schema language. A build-time generator dependency is acceptable if its concrete
benefit is demonstrated; keep it out of runtime dependencies.

Validation returns all independent issues within bounded input size; cap input
depth at 16, visited values at 10000, and issues at 100. Stop traversal on budget
exhaustion with a resource-limit issue. Detect cycles in JavaScript input before
serialization and reject non-finite values before normalization.

Valid schema v1 structures must also be supported by the current engine's
capability metadata. Before v1 publication, the draft descriptor expands only when its executor and tests land. Future designs in
[the study](recipe-study.md) are not automatically accepted by the validator.
