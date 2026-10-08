# Product scope

The runtime foundation is implemented; the package is private and unreleased.

## Purpose

AudioBits makes expressive procedural audio practical for application developers.
The initial audience builds web interfaces, browser games, interactive websites,
and visualizations. Sound files remain valid inputs to future integrations;
procedural sound is the distinguishing capability, not an ideological restriction.

The product has two connected workflows:

1. Choose a curated sound, adjust meaningful controls, and play it.
2. Author a reusable recipe from layers, envelopes, modulation, and effects.

Both use the same versioned recipe representation. Humans and coding agents
can inspect and validate that data without generating arbitrary Web Audio code.

## First working core

The foundation milestone established three experiences: a refined confirmation,
an impact controlled by intensity, and a sustained thruster controlled by
throttle. Each has a small public API example and a Chromium demonstration.

Success means that a developer can start audio from a gesture, load a recipe,
play overlapping voices, change supported parameters smoothly, and stop or
dispose everything without stale playback or retained owned resources.
The package can be installed from a locally packed archive into a clean consumer.

These are joint gates: usable API, good sounds, correct lifecycle, and honest
documentation. A pretty gallery or a passing mock suite alone is insufficient.

## Product iteration

Buses, lifecycle controls, a gallery, docs and an installed-version Skill exist.
Eight bundled sounds now use the same primitives and recipe-aware TypeScript
API. The current eight curated sounds have passed the maintainer listening gate
in Chrome. Continue letting concrete sound requirements drive future engine
expansion. Prerelease verification target: current Chromium. Other browsers and operating
systems are unverified and deliberately deferred. Listening and
physical-device evidence remain separate.

## Boundaries

AudioBits does not initially include a DAW, sequencer, MIDI environment,
recording suite, streaming player, WebRTC, hosted sound generation, or account
system. No MCP server, copy-owned registry, paid catalog, framework adapters,
AudioWorklet, WASM, or automatic offline-render optimizer is required for the core.

The runtime ships as one npm package when ready. A future recipe registry can
distribute editable source without changing how engine fixes reach consumers.

## Naming and public claims

AudioBits and `audiobits` are working identifiers. Package availability, domain
ownership, and brand clearance are unresolved release decisions. Do not present
an npm install command or website URL as an available product before verification.

Describe measured or implemented behavior. Avoid promises of bit-identical audio,
universal browser support, automatic optimization, or unconditional clipping
prevention. Keep external project references optional and publicly understandable.
