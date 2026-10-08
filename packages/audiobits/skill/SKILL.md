---
name: audiobits
description: Integrate AudioBits procedural sounds into a browser application, including gesture activation, recipe controls, routing, and teardown. Use installed package APIs and metadata; excludes recording, audio-file players, and release publication.
---

# AudioBits integration

This guide ships with the private 0.1.0-rc.0 candidate. Confirm the installed
package version and read `audiobits/capabilities.json` and
`audiobits/schema.json` before choosing primitives. Candidate metadata describes
shipped behavior, not registry availability. Prerelease verification target: current Chromium. Other browsers and operating
systems are unverified and deliberately deferred.

Use public imports from `audiobits` and `audiobits/recipes`. Create engines and
sounds without browser activation, then invoke `start()` synchronously inside
a user gesture and await it before `play()`. Surface failures and allow a fresh
gesture retry. Never queue playback across Stop, hiding, or disposal.

Use the [package quick start and API reference](../README.md) for activation,
validation, ownership, limits, seeded replay, and native interop. Read the
[controlled sound example](references/controls.md) for live thruster and bus setup.

Keep recipe data JSON-only. Run `validateRecipe` for semantic validation;
JSON Schema alone cannot establish executability. Use `voice.set()` only for
live controls while a voice is active. Native nodes and callbacks belong to
the host, outside recipes. Own one engine per host lifecycle; cancel pending
Play requests on Stop/hide, suspend on hide, and dispose on navigation/unmount.
Returning requires another gesture. Detach and disconnect caller-owned taps.

No recipe strings are executable. Do not invent sequencing, spatial audio,
extra recipe effects, caches, worklets, framework adapters, or broader browser
support from the candidate.

Buses provide gain, mute, and routing. Shared effects are deferred until
multiple real sound requirements justify an API.
