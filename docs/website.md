# Website and documentation design

The gallery uses a demo registry outside recipes and controls derived from accepted
parameter declarations. One engine owns the mounted session. Selected raw comparisons
cover the original trio; new sounds use the same bounded recipe editor and lifecycle.
Optional visualization integrations are not installed dependencies.

## First interaction

Let visitors browse silently. The primary action is a visible Play button on a
sound. Its gesture starts audio and plays once; do not require a separate splash
screen or automatic background sound. Show loading, blocked-start recovery, and
playing states beside the action. Keep global mute, volume, and Stop all visible
once interactive audio is available.

The first screen should communicate procedural sound through one compelling
example and a small amount of code. Keep navigation direct: Sounds, Docs, and
the repository link once verified. No login, paid service, or backend is needed.

## Gallery structure

Each sound has a stable slug, short description, intended use, playback control,
at most three meaningful primary controls, reset, and a copyable example. Advanced
recipe data and raw Web Audio comparison sit behind explicit tabs or disclosure.
Continuous sounds have an obvious Stop action and never depend on hover to stop.

The copy action copies the current parameter values and seed where applicable.
Examples include required setup and cleanup, with shared boilerplate identified
consistently. Raw Web Audio comparisons must produce comparable behavior and
include equivalent cleanup; do not inflate the comparison to advertise a ratio.

Use a small JSON/parameter playground initially, validated through AudioBits.
Display path-specific validation errors and retain the last valid sound until a
new recipe is accepted. Do not evaluate arbitrary JavaScript or embed a heavy
IDE before a concrete authoring need appears.

## Visual direction

Use a restrained instrument-gallery aesthetic: neutral surfaces, strong readable
type, one accent family, generous space around controls, and clear focus states.
Visualization should reveal the sound's behavior. Avoid covering the page with
unrelated motion or presenting a dense DAW mixer as the default experience.

shadcn/ui with Base UI supplies common controls. Fumadocs owns documentation
navigation and MDX content. Consider audiocn meters/waveforms after verifying
they accept the engine's output without another context or microphone request.
React Bits is optional for a small number of purposeful presentation treatments.
Review dependency cost and license notices for copied components before import.

Drive visualizers from an analyser attached to the owned graph; do not route
duplicate audio to the destination. Keep animation-frame updates out of React
state where appropriate. Pause visualization when hidden or reduced motion is
requested, and dispose taps/listeners on unmount.

## Accessibility and lifecycle

All controls work with keyboard and touch, have labels and visible focus, and
expose their value without color alone. Sound is never the sole status signal.
Respect reduced motion, retain silent browsing, and avoid unrequested sound on
load, hover, navigation, or returning from background.

The site owns one shared engine per mounted interactive session. Route changes
stop route-owned voices; leaving audio areas disposes the session. Hiding the
page stops playback and suspends; returning requires a fresh user action. Cover
React strict-mode mount/unmount and hot-reload behavior in the local workflow.

## Documentation information architecture

Start with Quick start, Recipes, Playback and lifecycle, Parameters, then API
reference. Add Buses/effects and Native interop only as those capabilities ship.
Every example is checked against the public exports and the displayed version.
Contributing/design material remains in repository `docs/`; do not publish the
whole planning directory as end-user reference automatically.

Before npm publication, display an unreleased status. Afterward distinguish
stable documentation from development previews as defined in
[the release design](releases.md). Do not advertise future schema fields as
supported simply because they appear in a planning document.

## Acceptance

A visitor can discover a sound, play it, hear a meaningful control change,
stop it, and copy a working example without reading the architecture. Check
Chromium desktop plus a narrow viewport; this layout check is not mobile-browser
compatibility certification. The first gallery can ship with the three core
sounds; additional recipes require their own listening acceptance.
