# Website and documentation design

The gallery uses a demo registry outside recipes and controls derived from accepted
parameter declarations. One engine owns the mounted session. Selected raw comparisons
cover the original trio; every detail route uses the same bounded recipe editor
and lifecycle.
A caller-owned analyser displays live output with reduced-motion handling.
No visualization dependency or extra audio context is required.

## First interaction

Let visitors browse silently. The primary action is a visible Play button on a
sound. Its gesture starts audio and plays once; do not require a separate splash
screen or automatic background sound. Show loading, blocked-start recovery, and
playing states beside the action. Keep global mute, volume, and Stop all visible
once interactive audio is available.

The first screen should communicate procedural sound through one compelling
example and a small amount of code. Keep navigation direct: Sounds, Docs, and
the repository link once verified. No login, paid service, or backend is needed.

## Route purposes

| Route            | Purpose                  | Primary content                                                                              |
| ---------------- | ------------------------ | -------------------------------------------------------------------------------------------- |
| `/`              | Discover                 | Glass-notification hero, impact/thruster moments, code/data story, compact eight-sound index |
| `/sounds`        | Explore                  | Eight light sound entries; Play/Stop, semantic parameters, variation and workbench links     |
| `/sounds/[slug]` | Understand and customize | Sound portrait, playback controls, seed, Code / Recipe / Raw Web Audio inspector             |
| `/docs`          | Learn and reference      | Fumadocs navigation, API and lifecycle examples                                              |

The home keeps three interactive sounds, without recipe editors. The collection
uses a sticky desktop audio-monitor rail; phones use a compact bottom dock with
Mute, Stop all and expandable levels. Safe-area padding and scroll space keep
controls reachable. The monitor presents the existing route-owned engine; it does
not introduce a layout-global audio singleton. Current/last sound and engine state
remain visible. The actual waveform reads the master output with display gain.

Workbench variation controls sit beside playback. Reset variation restores seed
42 only. The inspector defaults to the simple current AudioBits example; production
lifecycle guidance links to Fumadocs. Recipe is read-only until Edit recipe is
chosen. Drafts and validation errors survive tab changes; applying invalid input
preserves last-valid playback. Restore returns the bundled recipe, parameters and
seed. JSON is limited to 32 KiB and never evaluated as JavaScript.

Raw Web Audio is directly available as a tab for confirmation, impact and thruster.
The comparison covers the bundled definition, with fair gain, release and cleanup;
after editing, restore the bundled recipe to view its raw comparison. Copied code
tracks the current valid recipe, parameters and seed. No generic size benchmark is
claimed. The inspector is loaded separately from collection/home controls.

## Visualization families

Website metadata assigns pulse portraits to impact, tactile click and gentle
rejection; harmonic bands to confirmation, glass notification and power-up; and
flowing lines to thruster and whoosh. The home uses one large thread treatment,
informed by [React Bits Waves](https://reactbits.dev/backgrounds/waves), rewritten
as bounded native canvas linework without its noise engine or an added dependency.
Static geometry is an abstract sound portrait, not fabricated signal measurement.
Displacement/expansion follows actual analyser samples; the monitor is the literal
waveform. Both stop animation offscreen, while hidden or under reduced motion.
Visual failure leaves playback independent. No paid/Pro component is included.

## Visual direction

Use the approved sonic specimen book: warm paper, editorial headings, dark ink,
ruled sound entries and a prominent real waveform.
Visualization should reveal the sound's behavior. Avoid covering the page with
unrelated motion or presenting a dense DAW mixer as the default experience.

Base UI buttons and labelled native inputs supply controls. Fumadocs owns
documentation navigation and MDX content. The showcase design is recorded in [DESIGN.md](../apps/www/DESIGN.md);
Fumadocs retains its own theme. Sound-specific labels and endpoint text live in the gallery
registry rather than in serialized recipes.

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
reference. Add Buses/routing and Native interop only as those capabilities ship.
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
compatibility certification. The eight bundled sounds have automated signal
checks. The maintainer reported listening acceptance for all eight on
2026-10-07; devices and detailed coverage were not specified. Physical-device
checks remain separate and pending.
