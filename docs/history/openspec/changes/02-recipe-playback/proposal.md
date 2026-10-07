# Recipe playback and first sound

## Why

The abstraction must produce a convincing sound and own playback safely before more synthesis features are added.

## Prerequisites

Step 01 accepted; local builds and package consumption work.

## What Changes

- Implement the finite schema subset, pure validation, immutable recipes, and generated schema/types.
- Add a lazy engine, reusable sounds, fresh managed voices, envelopes, scheduling, limits, and cleanup.
- Ship a confirmation fixture and a minimal Chromium demo with honest listening evidence.

## Capabilities

### New Capabilities

- `recipe-playback`: The abstraction must produce a convincing sound and own playback safely before more synthesis features are added.

### Modified Capabilities

None. This change adds a distinct capability; dependent behavior remains governed
by its earlier change and must be reconciled if implementation changes it.

## Impact

Adds pure recipe/compiler/runtime modules and one curated sound inside the single runtime package, plus a minimal site example. No dynamic controls, noise, buses, native interop, caching, or other-browser matrix.
