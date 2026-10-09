# AudioBits runtime agent rules

These instructions apply to `packages/audiobits`.

Read root `AGENTS.md` first.

## Runtime boundaries

- Keep the package framework-independent.
- Keep runtime dependencies at zero unless explicitly reconsidered.
- Browser-only resources such as `AudioContext` must be created lazily so
  importing the package remains SSR-safe.
- Keep definition/voice separation, lifecycle, cleanup, audio-context scheduling,
  and graph ownership deterministic and explicit. Activate from a user gesture.
- Native output/analyser taps use caller-owned nodes; arbitrary managed graph
  interoperability is not promised.
- Read [architecture](../../docs/architecture.md) before changing these contracts.
- Do not add compatibility hacks for other browsers unless explicitly requested.

## Recipes

- Recipes remain portable, serializable, versioned data.
- Do not add callbacks, DOM references, React/UI metadata, native AudioNodes,
  arbitrary JavaScript expressions, or application state to recipes.
- Preserve the recipe/compiler/runtime separation.
- Do not add a recipe primitive because Web Audio exposes one.
- A missing primitive must be demonstrated by a concrete desired sound or
  application requirement.
- Prefer composition from existing primitives first.

## Public API

- Treat public exports and recipe schema changes as high-cost changes.
- Do not expand the public API while fixing an internal implementation issue.
- Do not introduce package splitting or new public subpackages without an
  explicit distribution/versioning requirement.
- Runtime validation remains authoritative for external/unknown recipe data.

## Scope exclusions

Do not introduce speculative:

- DAW functionality
- MIDI
- recording
- streaming/WebRTC
- React/Vue/Svelte adapters
- MCP
- AudioWorklet
- WASM
- plugin/effect architecture
- additional browser compatibility

unless explicitly requested.

## Verification

- Run focused unit/type tests for internal changes.
- Run affected Chromium integration tests when browser/runtime behavior changes.
- Package verification is required only when exports/build/distribution change
  or when explicitly preparing a release.
- Do not run release preparation by default.
- Stop when the requested runtime task and focused verification are complete.
