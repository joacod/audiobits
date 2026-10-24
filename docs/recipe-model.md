# Recipe model and runtime contract

Schema-1 semantic and compatibility invariants for AudioBits contributors.
Structural contracts come from the generated [recipe declarations](../packages/audiobits/src/recipe/generated.ts)
and [schema](../packages/audiobits/src/recipe/schema.json). Contextual constraints
and executable semantics come from [validation](../packages/audiobits/src/recipe/validate.ts),
the compiler/runtime, and [tests](../packages/audiobits/tests/).
Authoring sketches are not capabilities.

## Data boundary

A recipe is plain JSON: finite numbers, strings, booleans, arrays, and plain
objects. No functions, expression strings, native nodes, URLs to executable
code, or prototype-dependent behavior. Definitions are copied and deeply frozen;
mutating the original input cannot alter an existing sound.

`schemaVersion: 1` is independent of the npm version. Unknown versions and fields
are rejected with an issue code, JSON-style path, and actionable message.
Recipes published or persisted under v1 require a new schema version for
incompatible semantics.
Do not create an empty migration framework before a real migration exists.

## Structural reference

Use the exported `recipeSchema`, `audiobits/schema.json`, and generated TypeScript
declarations for fields and structural limits. The
[recipe guide](https://www.audiobits.dev/docs/recipes) explains supported sources,
filters, delay, envelopes and controls. Layer effects process their
layer before all layer outputs sum into recipe effects. Resource limits constrain
allocation; they are not quality recommendations.

## Time and lifetime

One-shot duration is the time from voice onset to gate close, not total output
duration. Release begins at gate close and reaches zero after its declared time.
Sources stop after release; per-voice effect tails extend resource lifetime only
by their bounded declared allowance. Sustained sounds close their gate on stop.

Natural voice cleanup occurs after the latest layer release and effect tail.
Calling `stop()` during attack or decay releases from the current automated
value, not a guessed sustain value. `stop({ at })` begins that same release at
an absolute context time; valid past times release immediately. The earliest
request wins, and pending releases allow live updates until their audio-clock
deadline. Scheduled release never extends a one-shot gate or lifetime.
Repeated stop cannot extend playback.
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
supports only `PointValue`, while envelopes and filter Q remain numeric.

A mapping normalizes a named control within its declared min/max and maps it to
the target range. Exponential mapping requires positive endpoints. Variation is
uniform and sampled once per property per voice. Automation starts at time zero,
has strictly increasing timestamps, and has a bounded point budget. Exponential automation likewise requires positive resolved values.
One-shot automation ends no later than gate close; sustained automation is an
onset sequence of at most 60 seconds, then holds its final value.

Frequency values are Hz, gain values dB, time seconds, and pan `[-1, 1]`.
Frequency targets obey the generated bounds; context-dependent checks reject
values at or above Nyquist before allocating a voice. Playback gain/pan are numeric
options; transposition is not supported.

Parameter declarations carry `min`, `max`, `default`, and `mode` (`play` or
`live`). Live declarations also carry bounded `smoothing` seconds.
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
The [compiler traversal](../packages/audiobits/src/compiler/plan.ts) resolves root
effects, then layers in array order: gain, filters, source frequency, and noise
seed. Automation points follow time order. Each variation consumes one draw;
each noise layer consumes one draw for its own stream. Property insertion order
must not affect replay. [Randomness and noise tests](../packages/audiobits/tests/dynamic.test.ts)
protect these choices; [noise generation](../packages/audiobits/src/compiler/values.ts)
and [graph ownership](../packages/audiobits/src/compiler/graph.ts) define buffer bounds and cleanup.
Without a seed, the engine chooses a fresh one and exposes it on the voice for
replay. Do not call unseeded randomness while rendering a seeded sound.

Reproducibility does not promise identical oscillator/filter output across
browsers or sample rates. Per-voice variation is distinct from continuous random
modulation, which is deferred.

## Effects

The model supports a lowpass/highpass/bandpass filter with frequency and Q,
and native delay with seconds, feedback and linear wet/dry mix.
Q obeys the generated bounds. Delay parameters accept PointValue with play-only
mappings; time is 0.01–2 seconds, feedback 0–0.8 (default 0), mix 0–1 (default 0.5).
The new effect is additive under schema 1; older runtimes reject it. Capabilities
advertise delay support separately from schema version. Saturation is unsupported.

Layer filters before the first wet delay remain before the envelope. The first
wet delay and subsequent effects run after envelope and dynamic gain; root effects
run after the layer sum. Filter-only recipes retain their execution and seeded
traversal. Delay resolves time, feedback, then mix at each effect position.

Feedback repeats retain the input waveform, with first-echo gain equal to mix and
later repeats multiplied by feedback. No normalization or limiting is applied.
Each delay requests only its resolved delay storage. A dry bypass allocates nothing.
Feedback below two native render quanta is rejected before graph allocation.
Feedback uses a loop delay shortened by one quantum and a feedforward quantum
delay, compensating native circulation latency so echoes repeat at the requested
spacing. Both lines are mono and their requested capacities sum to the resolved time.

Delay tail allowances include the first repeat below −60 dB relative to the first
echo. Serial allowances add, parallel layers take their latest deadline, and each
path is capped at 30 seconds after release plus a 50 ms final output fade. This
finite cutoff is not a claim that cascaded feedback is inaudible at the deadline.
Source nodes stop after release; a disconnected native ConstantSourceNode schedules
tail cleanup against audio time. A voice owns all effects and that clock until
cleanup. Normal Stop retains echoes; explicit cuts and stealing fade the complete
output in 5 ms. Suspension and disposal finalize immediately without waiting for
native ended callbacks. The internal filter-only plan view remains available to
the development audition bench; graph execution uses the complete ordered chain.
Do not ship placeholder descriptors for unsupported effects.

Shared effects are deferred; bus gain, mute and routing remain runtime
configuration outside recipe JSON. No convolution files, feedback graph DSL, or arbitrary
routing nodes are required for the core.

## Canonical generation and validation

Author a small structural descriptor, generating TypeScript recipe data types
and JSON Schema at build time. Semantic validation covers references, timelines,
resolved endpoint ranges, and budgets; it must inspect all allowed mapping and
variation extrema, not just a default parameter value. Do not implement a generic
schema language. A build-time generator dependency is acceptable if its concrete
benefit is demonstrated; keep it out of runtime dependencies.

Validation returns all independent issues within bounded input size; cap input
depth, visited values, and diagnostics using the validator's budgets. Stop traversal on budget
exhaustion with a resource-limit issue. Detect cycles in JavaScript input before
serialization and reject non-finite values before normalization.

Valid schema v1 structures must also be supported by the current engine's
capability metadata. Extend the descriptor only when the executor and tests
support the feature; proposed designs are not accepted capabilities.
