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

## Focus and verification

- Finish the requested implementation first. Verification supports delivery; it must not become a separate compatibility or infrastructure project.
- While unreleased, Chromium is the default browser target. Firefox, WebKit, other operating systems and physical-device checks are follow-up work unless explicitly requested for the current task.
- Run the smallest useful checks: lint/typecheck for code, focused unit tests for changed logic, and affected Chromium tests for interactions. Reuse passing builds and checks unless later changes invalidate them.
- Do not run `release:prepare`, repeated full suites, Docker/VM setup or broad compatibility investigations as routine task endings. Reserve release gates for an explicitly requested release-verification task.
- Report failures outside the selected target briefly and defer them. Do not let them block scoped delivery or silently claim compatibility.
- Keep assertions meaningful. Do not hide flakes with arbitrary waits, larger timeouts, more retries or weaker assertions; investigate only failures relevant to the agreed scope. CI retries remain diagnostic and flakes fail CI.
- Stop once the requested work and its focused checks are complete. Automated checks do not establish listening quality or physical-device support.

## Showcase boundaries

- `/` is product discovery, `/sounds` is collection exploration, `/sounds/[slug]` is the sound workbench, and `/docs` remains Fumadocs reference documentation.
- Presentation metadata stays outside recipes; visual dependencies stay inside `apps/www`.
- Use real analyser output and a small set of reusable visualization families, not eight bespoke graphics projects.
