# Product finish roadmap

The recipe/runtime foundation and eight-sound gallery are implemented. AudioBits
`0.1.0` is prepared as the stable publishable candidate but has not yet been
published to npm. Publication and deployment remain disabled. Architecture stays
fixed unless a real sound or experience is blocked by the existing vocabulary.

1. **First npm release:** approve and publish the exact npm artifact in a separate
   explicit release task.
2. **Deploy/promote audiobits.dev:** approve site deployment and promotion in a
   separate explicit task.
3. **Gather real-world feedback:** let concrete sound and application requirements
   guide future work.

Prerelease development is wrapped. API/scaffolding cleanup, showcase implementation,
the current architecture, CI model and agent structure are accepted. The current
eight sounds passed the maintainer listening gate in Chrome; see
[validation](validation.md). Current Chromium is the only prerelease verification
target; other browsers and operating systems are unverified and deliberately deferred.

Post-0.1 candidates include MCP, devtools, new sounds, shared-effect requirements,
spatial systems, registry/packs and broader browser compatibility. They are not initial release blockers. Adapters,
worklets, WASM, offline caching, sequencing and MIDI need a demonstrated reusable
requirement. Do not expand release machinery without a real failure.
