# Plasma Blade

A procedural electrical blade: ignition, a smooth harmonic hum, motion-fed
swells, rapid swing accents, electrical clashes, and retraction. No sampled audio.

Install the complete registry item, or keep this folder and its MIT license
together. Import `mountPlasmaBlade` from `./host` and call `host.ignite()` directly
in a user gesture. The host owns one engine (eight voices, three per sound,
master gain -6 dB). It exposes `retract`, `stop`, `mute`, and asynchronous `dispose`.
Call `dispose` on application removal and handle its rejection.

`createPlasmaBlade` is the DOM-free controller for an application-owned engine.
Supply CSS-pixel speed and frame elapsed milliseconds to `update`. Speed reaches
full motion at 1800 px/s. Attack/recovery smoothing and native parameter ramps
keep the hum continuous. Swing accents rearm below 0.32 and trigger above 0.62,
with a 260 ms cooldown. `impact(target, force)` accepts target IDs 0 through 2,
with an 850 ms target cooldown and 100 ms global cooldown. It returns whether
the strike was accepted. `stop` invalidates pending activation and stops owned
voices; the dedicated host additionally cuts all engine tails.

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
