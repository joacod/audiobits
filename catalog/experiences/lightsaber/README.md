# Lightsaber

A procedural electrical blade: ignition, a resonant electrical hum, motion-fed
swells, rapid swing accents, electrical clashes, and retraction. No sampled audio.

Install the complete registry item, or keep this folder and its MIT license
together. Import `mountLightsaber` from `./host` and call `host.ignite()` directly
in a user gesture. The host owns one engine (eight voices, three per sound,
master gain -6 dB). It exposes `retract`, `stop`, `mute`, and asynchronous `dispose`.
Call `dispose` on application removal and handle its rejection.

`createLightsaber(audio)` is the sound controller for an application-owned engine.
After your host awaits `audio.start()`, call `ignite()`. Supply normalized movement
in `[0, 1]` and elapsed milliseconds to `update(movement, elapsed, direction)`,
with signed direction in `[-1, 1]` for continuous pitch bending. Attack/recovery
smoothing and native parameter ramps keep the hum continuous. Swing accents
rearm below 0.2 or on a direction reversal and trigger above 0.48, with a 220 ms
cooldown. `clash(intensity, pan)` accepts intensity in `[0, 1]` and optional pan
in `[-1, 1]`, with a 100 ms sound cooldown. It returns whether the clash played.
`retract()` adds the retraction sound; `stop()` stops owned voices, and `dispose()`
cuts owned sounds without disposing the shared engine.

The stages measure handle and tip travel, excluding blade extension, and convert
1200 px/s to full normalized movement. They own swept collision detection and
the 850 ms per-target cooldown. The browser host owns activation cancellation,
visibility policy, and final engine disposal; its Stop also cuts engine tails.

`mountBladeStage(canvas, host)` supplies mouse, touch, and keyboard input, swept
blade collisions, bounded trails/particles, and a measured audio seam. Call its
`stateChanged` from the host's state callback, and dispose the stage before the
host. Enter ignites, arrows move, Space strikes a visible target, Escape retracts.
Hold the stage to ignite and drag to swing; pointer release retracts the blade,
including during pending activation. Hovering does not move the blade. The Ignite
button and Enter keep it active until Retract or Escape. Pointer cancellation,
lost capture, window blur, hiding, Stop, and teardown end activity. Returning
remains silent until a new gesture. Reduced motion removes trails, particles, target rotation, and audio
ripples. Mute changes output while preserving interaction.

The [standalone demo](./index.html) uses a TypeScript-capable development server;
see [catalog setup](../../README.md#optional-standalone-demo). The website uses
these same sources and owns its controls and source inspector.

Automated verification targets Chromium. Signal bounds and lifecycle tests do
not establish listening quality or physical-device compatibility.
