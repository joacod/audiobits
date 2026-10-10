# Architecture design

Architecture and ownership invariants for AudioBits contributors. The
[website API reference](https://audiobits.joacod.com/docs/api) explains public usage.
Exported [API declarations](../packages/audiobits/src/runtime/engine.ts),
[runtime implementation](../packages/audiobits/src/runtime/engine.ts), and generated
[schema and capabilities](../packages/audiobits/src/recipe/) define supported
contracts; [recipe model](recipe-model.md) explains data and compatibility invariants.

## Repository boundaries

Repository responsibilities:

```text
apps/www/                  Private Next.js documentation and demo workspace
packages/audiobits/
  src/recipe/              Pure recipe types, validation, normalization
  src/compiler/            Internal execution plan and native graph construction
  src/runtime/             Engine, Sound, Voice, resource ownership
  src/recipes/             Curated recipes, separately exported
  tests/                   Unit and type checks
  skill/                   Installed-version consumer guidance
examples/vanilla/          Private consumer using only public package exports
catalog/                  Portable examples verified against the built package
docs/                     Contributor architecture and operational guides
```

One runtime package owns its version and public exports. Do not split schema,
presets, effects, and runtime into independent packages. Curated recipe exports
must not inflate a consumer that imports only the engine. Website rendering,
controls, and visualization dependencies stay in `apps/www`.

## Execution boundary

```text
Recipe → validation / normalization → immutable reusable definition
                                          ↓ play: controls + seed → execution plan
                                  fresh runtime graph per voice
                                          ↓
                              voice output → bus → master
```

Validation and normalization are pure and do not instantiate browser resources.
The plan is internal, not a second public language or a generic plugin backend.
Execute with built-in Web Audio nodes, with bounded generated buffers
for noise. Do not introduce a pluggable compiler framework for hypothetical backends.

Later offline rendering may use the same normalized recipe, but cache identity
must include all audible inputs, seed, sample rate, channel configuration, and
engine/schema semantics. Dynamic parameters and unbounded tails require explicit
eligibility rules. No transparent optimizer is implemented.

## Public surface

The listed operations are implemented. Buses provide gain, mute, and routing;
a shared effect API awaits multiple real requirements. Add primitives only when
a concrete sound or application requirement cannot be met by composition. An
effect-specific bus setter would expand the API without a demonstrated shared
effects requirement; native taps retain caller ownership.

| Concept                    | Responsibility                                                     |
| -------------------------- | ------------------------------------------------------------------ |
| `defineSound(data)`        | Validate and return a deeply immutable recipe snapshot; no context |
| `validateRecipe(unknown)`  | Structured issues with code and data path; no audio allocation     |
| `createAudio(options)`     | Create a lazy engine handle; no context until `start()`            |
| `audio.start()`            | Create/resume the owned context in the current gesture path        |
| `audio.suspend()`          | Invalidate pending activation, finalize owned voices, and suspend  |
| `audio.sound(recipe)`      | Return an engine-bound reusable definition after validation        |
| `sound.play(options)`      | Synchronous voice creation when the engine is running              |
| `voice.set(parameters)`    | Validate and smooth supported live controls                        |
| `voice.stop()`             | Release/fade once, then clean up owned sources and effects         |
| `voice.ended`              | Promise that settles when owned resources are released             |
| `audio.stopAll({ tails })` | Release owned voices with recipe release or 5 ms fade              |
| `audio.bus(name, parent)`  | Reuse/create a named bus after activation                          |
| `audio.native`             | Owned context/output with caller-owned native taps                 |
| `audio.dispose()`          | Idempotent shutdown including pending starts and owned graph       |

`audio.sound()` may run before start because it stores an immutable recipe snapshot. Calls to
`play()` before successful start fail with a structured not-ready error; the
engine does not queue stale UI sounds for later replay. Capture errors at the
application boundary and present a retry action where a gesture is required.

## Ownership and lifecycle

The engine owns exactly one lazily created context, master gain/mute stages, named buses, voice records,
and its generated resources. A sound owns a recipe snapshot; each play resolves controls/seed into an internal
plan and creates its own sources, envelopes, and bounded noise buffers. Disposing a sound stops its
voices. Engine disposal invalidates pending starts, stops voices, disconnects
owned nodes, clears buffer references/listeners, and closes the context once.

Cleanup must not depend solely on `onended` or future audio-clock progress.
Explicit teardown finalizes records even if a context is suspended or closed.
The page's stop-and-suspend path drains or finalizes stopped voices; it must not
wait indefinitely for a release ramp on a context that no longer advances.

States are `idle`, `starting`, `running`, `suspended`, `interrupted`, `closed`,
and `disposed`; map native states deliberately rather than assuming every engine
reports all of them. Concurrent starts share one pending operation. Disposal
during start cannot leave a running orphan context. A closed/disposed engine is
terminal; create a new engine explicitly.

The library exposes state and explicit suspension. The application owns page
visibility policy. The gallery stops its voices before suspending on hide and
requires a new Play action on return. It does not replay old input or automatically
resume on navigation. The engine does not impose this policy on every game/app.

## Bounds and mixing

Voice options and defaults come from the exported declarations and
[runtime validation](../packages/audiobits/src/runtime/engine.ts); the
[API guide](https://audiobits.joacod.com/docs/api#playback-options) explains usage. Stealing
fades the oldest eligible voice; keep at most one retiring voice beyond each
applicable limit. Further steals finish the oldest retiring voice before creating
another. Counters distinguish active and retiring resources so totals stay bounded.
Reject invalid limits before allocation.

Recipe amplitudes are bounded, but overlapping signals can sum beyond full scale.
Test curated sounds at documented concurrency; do not claim guaranteed limiting
or silently normalize every voice.

The runtime uses a tree of buses with one parent per bus, rejecting cycles and foreign
contexts. Gain and mute are separate stages; a bus owns two gain nodes. Shared
effects are deferred.

## Native interop

`audio.native` exposes the owned context and master output after startup, with
a context-checked tap helper. The vanilla consumer exercises an analyser without
connecting it to destination again.
The caller owns nodes it creates, including stopping sources and disconnecting
them. Validate context identity before connecting. Native playback is not counted
as a managed voice and cannot inherit recipe serialization or stop guarantees.
Document engine-disposal consequences for all native connections.

## Metadata

Use a small declarative recipe descriptor as the authority for structural schema
and TypeScript data types. Prefer build-time generation to a runtime schema
dependency. Semantic validation handles timing, references, and resource budgets.
Test generated artifacts for drift; reject unknown schema versions and fields.

API declarations remain the source for the object API. Gallery metadata outside recipes provides titles, descriptions and presentation.
Basic controls derive from parameter declarations. The site need not generate its
entire interface from JSON Schema. Publish schema/capability metadata only for
features actually shipped; migration metadata waits for a second schema version.

## Parameters, variation and versioning

Typed `defineSound()` authoring preserves parameter names through playback;
`voice.set()` exposes live controls for precisely typed recipes. External JSON
uses `validateRecipe(unknown)`; runtime validation still runs at trust boundaries.
Play controls and seed resolve into the execution plan; live controls retarget
supported native parameters with declared smoothing and no graph allocation.
Seeded variation/noise repeats for the same inputs and sample rate, without
promising native oscillator/filter sample identity across browsers.

Schema version 1 is independent of package versioning. Contexts, buses, voices,
spatial placement, UI, application state and host composition remain outside
portable recipes. Incompatible semantics for published or persisted v1 recipes
require a new schema version. No placeholder migration framework is needed.

## Linear automation compatibility

Live bindings, release envelopes, bus gain/mute
track their linear schedules. When native `cancelAndHoldAtTime` is unavailable,
cancel future events and reinsert the computed linear endpoint at the context
time before scheduling the new ramp. This preserves the preceding ramp and
avoids guessing from `AudioParam.value` during automation. The public API and
recipe schema are unchanged; native caller-owned graphs remain outside this
fallback. The standalone raw comparison follows the same linear truncation rule.
