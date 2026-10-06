# Recipe playback and first sound: design

## Context

Step 01 accepted; local builds and package consumption work. This is a proposed change; no implementation or validation is implied
by the presence of these artifacts.

## Goals / Non-Goals

Deliver the bounded outcomes in [the proposal](proposal.md) and the scenarios in
[the capability spec](specs/recipe-playback/spec.md). Broader browser validation,
automatic npm publication, and unrelated ecosystem work are outside this step.

## Decisions

Use [the recipe contract](../../../docs/recipe-model.md) and
[ownership design](../../../docs/architecture.md). This step accepts only
one-shot oscillator recipes with numeric values, numeric frequency automation,
ADSR envelopes, and bounded filters. Reject unimplemented sustained, noise,
mapping, variation, and parameter features rather than accepting unusable data.

Generate structural JSON Schema and recipe types from one small descriptor.
Keep semantic checks explicit and browser-free. Invalid recipes and budgets
fail before allocation, with stable issue paths. Clone/freeze accepted input.

Build a small internal plan; instantiate fresh sources on every play. Preserve
minimum onset/release ramps, context-time scheduling, release-from-current-value,
natural cleanup, and cancellation before onset. Add global/per-sound voice bounds
and deterministic oldest-voice stealing from the beginning.

`createAudio()` does not allocate a context. `start()` invokes native creation
and resume synchronously in the user gesture before awaiting. Concurrent starts
share one operation; dispose invalidates pending operations. A blocked start
exposes a retryable error. Play while not running fails without queueing.

Use the confirmation design fixture as a sound-design starting point. The site
has Play, mute, Stop all, state/error feedback, and route cleanup. Keep visuals
simple. Live tests run in Chromium; offline signal tests also run there.

## Risks / Trade-offs

- A syntactically clean recipe may sound poor → listening is a separate gate.
- Mocked lifecycle tests can miss native behavior → exercise gesture and cleanup
  through real Chromium too.
- Peak limits depend on mixing → verify documented concurrency and master gain,
  not just one isolated oscillator.

## Migration Plan

There is no released schema to migrate. Adjust draft v1 only with fixture/schema
updates in this same change. Do not publish or declare the sound auditioned
until its evidence exists.
