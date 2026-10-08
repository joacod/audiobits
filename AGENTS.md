# Project instructions

AudioBits is a browser-native application-audio library with a separate docs and
sound gallery. Build sounds, not abstractions: read [architecture](docs/architecture.md)
and affected code before changing it. The package is private and unreleased.

## Product and architecture

- Keep one framework-independent runtime package, `packages/audiobits`, with
  zero runtime dependencies. Use folders before speculative packages.
- Recipes remain portable, versioned JSON data. No callbacks, native nodes, URLs,
  expressions, UI metadata or application state. Runtime placement, host composition,
  analyser output and presentation stay outside recipes.
- Imports and validation are SSR-safe. Browser resources are lazy; activate in
  an explicit user gesture and schedule with audio-context time.
- Preserve definition/voice separation and explicit engine, voice, bus and graph
  ownership. Native interop currently covers output/analyser taps with caller-owned
  nodes; arbitrary managed graph interoperability is not promised.
- Prove missing primitives with real target sounds; consider composition first.
  Avoid DAW, sequencing, MIDI, recording, streaming, WebRTC, adapters, MCP,
  worklets or WASM without an approved concrete requirement.
- Sound quality and TypeScript usage matter more than feature count. Agents use
  installed metadata/schema; update generated capabilities when behavior changes.

## Lightweight architecture gate

Ordinary sounds, tuning, UI, docs, tests, minor fixes and internal refactors can
be implemented directly. Changes to schema/versioning/serialization, public API,
ownership/lifecycle, bus/effect architecture, compiler/runtime or native interop
contracts, package/distribution boundaries, compatibility or release policy require
a short design rationale and approval before implementation. Record durable
reasoning in `docs/architecture.md` or `docs/decisions/`. No formal specification
framework or decision note for trivial choices is required.

## Implementation and delivery

- Keep changes small and scoped; preserve unexpected worktree changes.
- Use exact direct versions, pnpm workspaces and `workspace:*`. Build the library
  before consumers; the site uses public exports only.
- Keep site deployment and npm release separate and disabled until explicit
  artifact approval. Ask before destructive actions, commits, branches, pushes
  and PRs unless already authorized.
- Keep tracked content public: no private handoffs, credentials, personal details,
  machine paths, diagnostics or captures. Use relative repository links and
  inspect complete changed content before handoff.
- Canonical docs: root README for onboarding, package README/site docs for API
  usage, architecture for system boundaries, focused docs for contributor tasks.
- Run appropriate scripts from [development](docs/development.md). Separate unit,
  browser, signal, listening, performance and package evidence. Automated checks
  do not establish pleasantness or real-device support.
- Report files, behavior, exclusions, commands/results and remaining gaps. Follow
  the selected scope and commit boundaries.

## Verification discipline

- Run the smallest evidence set that can falsify the change; do not default to `release:prepare`.
- Showcase/docs work needs the full browser matrix only when audio-host/browser behavior changes.
- Runtime, compiler, lifecycle, native interop and browser-harness changes require Chromium/Firefox/WebKit evidence before merge.
- Release candidates require the complete release gate. Playwright retries are diagnostic; flakes fail CI.
- Never repair flakes with arbitrary waits, larger timeouts, more retries, weaker assertions or browser skips. Reproduce and repair the violated product, test or environment invariant.
- Capability skips require a genuinely unavailable capability and documented fallback coverage.
- Keep CI audio/environment setup centralized, outside individual tests.
- Automated browser checks do not establish listening quality or physical-device support.
