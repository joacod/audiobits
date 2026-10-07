# Architecture design

Status: Steps 01–03 implemented and accepted.
Step 04 bus/native capabilities are implemented and accepted with automated
evidence and maintainer manual verification.
See [the roadmap](roadmap.md) for scope and [the development API](../packages/audiobits/README.md)
for currently exported behavior.

## Repository boundaries

Target structure; directories are created when their implementation step begins:

```text
apps/www/                  Private Next.js documentation and demo workspace
packages/audiobits/
  src/recipe/              Pure recipe types, validation, normalization
  src/compiler/            Internal execution plan and native graph construction
  src/runtime/             Engine, Sound, Voice, resource ownership
  src/recipes/             Curated recipes, separately exported
  src/meta/                Versioned schema and compact metadata
  tests/                   Unit and Chromium audio checks
examples/vanilla/          Private consumer using only public package exports
skills/audiobits/          Consumer guidance, added after API verification
docs/                     Contributor design and roadmap
openspec/                 Behavior contracts and scoped implementation changes
```

One runtime package owns its version and public exports. Do not split schema,
presets, effects, and runtime into independent packages. Curated recipe exports
must not inflate a consumer that imports only the engine. Website rendering,
controls, and visualization dependencies stay in `apps/www`.

## Execution boundary

```text
JSON recipe → validate → immutable reusable definition
                                          ↓ play: controls + seed → plan
                                  fresh per-voice graph
                                          ↓
                              voice output → bus → master
```

Validation and normalization are pure and do not instantiate browser resources.
The plan is internal, not a second public language or a generic plugin backend.
Initially execute with built-in Web Audio nodes, with bounded generated buffers
for noise. Do not introduce a pluggable compiler framework for hypothetical backends.

Later offline rendering may use the same normalized recipe, but cache identity
must include all audible inputs, seed, sample rate, channel configuration, and
engine/schema semantics. Dynamic parameters and unbounded tails require explicit
eligibility rules. No transparent optimizer is promised in the first release.

## Proposed public surface

Names below include implemented Steps 02–03 APIs and later design targets.
`voice.set()`, buses, shared delay, and narrow native taps are implemented in the development package.

| Concept | Responsibility |
| --- | --- |
| `defineSound(data)` | Validate and return a deeply immutable recipe snapshot; no context |
| `validateRecipe(unknown)` | Structured issues with code and data path; no audio allocation |
| `createAudio(options)` | Create a lazy engine handle; no context until `start()` |
| `audio.start()` | Create/resume the owned context in the current gesture path |
| `audio.suspend()` | Invalidate pending activation, finalize owned voices/effects, and suspend |
| `audio.sound(recipe)` | Return an engine-bound reusable definition after validation |
| `sound.play(options)` | Synchronous voice creation when the engine is running |
| `voice.set(parameters)` | Validate and smooth supported live controls |
| `voice.stop()` | Release/fade once, then clean up owned sources and effects |
| `voice.ended` | Promise that settles when owned resources are released |
| `audio.stopAll({ tails })` | Release owned voices with allow/cut shared-tail policy |
| `audio.bus(name, parent)` | Reuse/create a named bus after activation |
| `audio.native` | Owned context/output with caller-owned native taps |
| `audio.dispose()` | Idempotent shutdown including pending starts and owned graph |

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

Core defaults: maximum 32 active voices per engine and 8 per sound. New playback
steals the oldest eligible voice with a 5 ms fade. Reject before allocation if
limits are invalid. Keep at most one retiring voice beyond each applicable
limit; further steals finish the oldest retiring voice before creating another.
Counters distinguish active and retiring resources so the total remains bounded.

The first core defaults master gain to -12 dB, with an explicit configurable
range from -60 to 0 dB and mute represented separately. Recipe amplitudes
are bounded, but overlapping signals can still sum beyond full scale. Test the
curated sounds at documented concurrency; do not call a compressor a guaranteed
limiter or silently normalize every voice.

Step 04 adds a tree of buses with one parent per bus, rejecting cycles and foreign
contexts. Gain and mute are separate stages. Effects explicitly belong either
to a voice or a shared bus; their tails have bounded disposal semantics.

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

API declarations remain the source for the object API. Curated recipe metadata
provides labels, descriptions, controls, and tags. The site need not generate its
entire interface from JSON Schema. Publish schema/capability metadata only for
features actually shipped; migration metadata waits for a second schema version.
