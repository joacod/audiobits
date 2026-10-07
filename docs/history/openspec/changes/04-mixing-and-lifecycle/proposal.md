# Mixing, effects, and application lifecycle

## Why

Applications need coherent volume groups and lifecycle handling once the recipe core works. Routing and native interoperability must not undermine ownership or leave audible tails behind.

## Prerequisites

Step 03 core accepted.

## What Changes

- Add named buses, separate mute/gain stages, and bounded shared delay.
- Define routing, disposal, tail policies, and narrow native interop.
- Exercise interruption and page visibility behavior in Chromium without expanding browser support.

## Capabilities

### New Capabilities

- `application-audio-routing`: Applications need coherent volume groups and lifecycle handling once the recipe core works. Routing and native interoperability must not undermine ownership or leave audible tails behind.

### Modified Capabilities

None. This change adds a distinct capability; dependent behavior remains governed
by its earlier change and must be reconciled if implementation changes it.

## Impact

Extends runtime routing/effects and site lifecycle integration. No arbitrary graph DSL, microphone capture, streaming playback, or cross-browser workaround layer.
