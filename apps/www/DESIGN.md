---
name: AudioBits showcase
description: A playable audiovisual playground with music-poster type, collectible sound covers and precise workbenches.
colors:
  void: "#050507"
  ink: "#f2f2f2"
  mute: "#8a8a92"
  graphite: "#1b1c1e"
  graphite-edge: "#34363a"
  signal-low: "#2a6cff"
  signal-mid: "#b44cff"
  signal-high: "#ff2e88"
typography:
  display:
    fontFamily: "Big Shoulders Display, Arial Narrow, sans-serif"
    fontSize: "clamp(5rem, 11.8vw, 11rem)"
    fontWeight: 900
    lineHeight: 0.82
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Big Shoulders Display, Arial Narrow, sans-serif"
    fontSize: "clamp(2rem, 4vw, 3.4rem)"
    fontWeight: 800
    lineHeight: 0.95
  catalog-heading:
    fontFamily: "Big Shoulders Display, Arial Narrow, sans-serif"
    fontSize: "clamp(5rem, 12vw, 10rem)"
    fontWeight: 900
    lineHeight: 0.85
  workbench-heading:
    fontFamily: "Big Shoulders Display, Arial Narrow, sans-serif"
    fontSize: "clamp(3rem, 6vw, 5.5rem)"
    fontWeight: 900
    lineHeight: 0.95
  wordmark:
    fontFamily: "Big Shoulders Display, Arial Narrow, sans-serif"
    fontSize: "2rem"
    fontWeight: 800
  body:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "1rem"
    lineHeight: 1.55
  nav:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.85rem"
  label:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.72rem"
    letterSpacing: "0.1em"
  code:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.8125rem"
    lineHeight: 1.6
rounded:
  cover: "3px"
  control: "4px"
  panel: "6px"
spacing:
  control-gap: "0.75rem"
  base: "1rem"
  gap: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.signal-mid}"
    textColor: "{colors.void}"
    rounded: "{rounded.control}"
    padding: "0.5rem 0.9rem"
  button-primary-hover:
    backgroundColor: "{colors.void}"
    textColor: "{colors.ink}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0.5rem 0.9rem"
  button-secondary-hover:
    backgroundColor: "{colors.graphite}"
  workbench-panel:
    backgroundColor: "{colors.graphite}"
    rounded: "{rounded.control}"
  code-panel:
    backgroundColor: "{colors.graphite}"
    textColor: "{colors.ink}"
    typography: "{typography.code}"
    rounded: "{rounded.control}"
    padding: "1.25rem"
  led-meter:
    backgroundColor: "{colors.graphite-edge}"
---

# Design System: AudioBits showcase

## Overview

**Creative North Star: "The Playable Signal Playground"**

AudioBits pairs the energy of a music poster with an instrument you can play.
Near-black and white frame violet, saturated blue and pink.
Oversized condensed typography, full-bleed stages and collectible geometric sound
covers make discovery expressive; precise tactile workbenches make adoption clear.
Sound leads the spectacle, and the portable source stays within reach.

Showcase tokens and fonts stay scoped to `.foundation`. Documentation keeps
stock-neutral Fumadocs surfaces, layout, typography, light/dark palettes and theme
switching, with dark mode as the default. Existing docs logo and active accents
retain their documentation palette.

**Key Characteristics:**

- Void, Ink and neutral Graphite support vivid signal accents.
- Self-hosted Big Shoulders Display headlines pair with Geist Mono UI and code.
- Family-based SVG covers are static illustrations, distinct from live output.
- Live waveform and lighting follow actual audio; extension and movement follow stage state.
- Tactile controls, readable source panels and visible focus support the spectacle.

## Colors

CSS custom properties in the `tokens` layer of [app/globals.css](app/globals.css)
are authoritative. [lib/brand-colors.ts](lib/brand-colors.ts) mirrors them for
contexts that cannot read CSS; canvas and WebGL painters read the shared palette.

### Primary

- **Violet signal** (`signal-mid`): playback actions, active navigation, hero punctuation and charge/pulse covers.

### Secondary

- **Saturated blue signal** (`signal-low`): flow/thruster covers, the AI adoption field and live signal ranges.

### Tertiary

- **Pink signal** (`signal-high`): harmonic covers and high signal ranges.

### Neutral

- **Void** (`void`): page ground and dark text on vivid fields.
- **Ink** (`ink`): copy, outlined display type, focus and contrasting controls.
- **Mute** (`mute`): supporting copy and labels.
- **Graphite** (`graphite`): workbench and code panels, blade cover ground.
- **Graphite edge** (`graphite-edge`): rules, control borders, tracks and unlit meter segments.

The derived `art-ground` and `art-ink` roles map charge/pulse to violet,
thruster/flow to blue, harmonic to pink and blade to Graphite with violet
strokes. These roles reuse the palette rather than adding colors.

**The Signal Honesty Rule.** Color may identify a family or brand section at rest.
A visual presented as live output must follow real samples; static cover art never
claims that sound is playing.

## Typography

**Display:** self-hosted Big Shoulders Display, with Arial Narrow and sans-serif fallbacks.
**UI, body and code:** self-hosted Geist Mono, with monospace fallbacks.
Both use `next/font/local`; font licensing is recorded in [licenses/](licenses/README.md).

Headlines are uppercase, condensed and tightly set; the wordmark stays lowercase.
The homepage pairs a solid first line with an offset outlined second line. Mono
copy provides a quieter counterweight, with body paragraphs capped at (70ch).

The frontmatter records the main implemented roles. The hero display becomes
`clamp(3.5rem, 19.5vw, 8rem)` below (760px), retaining its (0.82) line height.
The wordmark becomes (1.6rem) at the same breakpoint. Catalog cover titles use
`clamp(2rem, 3vw, 2.8rem)`; workbench titles become
`clamp(2.8rem, 12vw, 5rem)` on mobile. Supporting card copy uses (0.8rem) mono
with (1.65) line height. Workbench labels use uppercase tracking; ordinary
navigation stays lowercase.

## Layout

The shared content measure is (76rem), with gutter
`max(1.5rem, calc((100vw - 76rem) / 2))`, reduced to (1rem) below (760px).
Full-bleed stages and color fields extend through the gutter. Large headings and
open section spacing give the discovery surfaces a poster rhythm; workbenches
keep related stage, playback and source controls close together.

Homepage previews use three columns and stack below (760px). Catalog covers use
three columns, two below (1000px) and one below (600px). Catalog detail navigation
is grouped, becoming a menu on small screens; the browsing index has no sidebar.
Controls retain their existing (44px)
minimum targets and visible keyboard focus. Surface composition belongs in the
[homepage](.impeccable/surfaces/app-page-tsx.md) and
[catalog](.impeccable/surfaces/app-catalog-page-tsx.md) records.

## Elevation & Depth

Depth comes from tonal layering, hairline Graphite edges, an inset top highlight
on workbench panels and focused stage lighting. The Lightsaber hero's radial
light follows actual output level, blade extension and position. The workbench
scope has a restrained family-colored radial field, and playback panels blend
Graphite into Void. These are stage and material treatments, not floating glass.

## Shapes

Collectible covers use small (3px) corners; ordinary controls and the current
workbench frame use (4px) corners. Supporting hardware panels retain (6px)
corners. Range thumbs are round knob caps with an Ink indicator. The touch
activation action and stage instruction use pill silhouettes. Lines, rings and
curves in static SVG art vary by the existing sound family.

## Components

### Buttons and navigation

Playback actions use a violet fill with Void text, then invert to Void with Ink on hover.
Pressed toggles retain Ink fill. Secondary controls use transparent grounds and
Graphite-edge borders, filling Graphite on hover. Install copy actions use
violet and brighten to Ink on hover. Disabled controls dim. Focus uses an Ink
outline (3px) with an offset (4px). Current showcase navigation uses violet
and a small dot; docs retain their separate navigation treatment.

### Collectible covers

Family-colored geometric SVG art carries the identity of each sound without
mounting an audio host. Catalog titles, descriptions and actions sit outside the
cover on the dark ground. Hover and focus can scale and rotate cover geometry
silently; this response is navigation feedback, not an audio measurement.

### Workbench controls and source

Native range inputs retain their labels, steps and keyboard behavior. Graphite
tracks and round knob caps give them a tactile face. Code and install panels use
mono text, restrained corners, wrapping or scrolling appropriate to their content,
and explicit copy feedback. Workbenches preserve the existing stage, playback,
inspector and source workflow.

### Live signal and stages

The homepage uses the actual Lightsaber stage. Its existing analyser supplies the
hero waveform and output level, while stage extension and movement supply the
remaining visual state. One engine and analyser serve that stage and hero.
The blade's swept path briefly splits crossed headline letters into bright and
violet edges that cool back to the original type. Letter bounds are cached on
resize; the existing stage frame drives the effect. Reset and disposal clear
hero presentation state. At rest the hero waveform is flat. Reduced motion keeps
it flat and disables letter effects and hero lighting.

`OutputScope` uses real output samples and a still mark at rest. Its measured
workbench form includes a segmented LED meter; reduced motion keeps the scope
still while the meter may update. Charge and thruster visuals retain their
state-driven behavior and direct gestures.

The waveform brand mark retains its full and small variants and the lowercase
wordmark. The showcase header, SVG favicon, browser chrome and generated social
image use the current colors. Existing PNG favicon and Apple icon exports retain
their earlier artwork.

## Do's and Don'ts

### Do:

- **Do** make sound the primary interaction and keep editable source easy to reach.
- **Do** read shared palette values from CSS and reuse family artwork roles.
- **Do** distinguish illustrated cover geometry from actual live audio output.
- **Do** preserve gesture activation, release, cancellation, cleanup and visible focus.
- **Do** reduce motion while keeping state and controls understandable.

### Don't:

- **Don't** animate a fake live waveform while the instrument is idle.
- **Don't** add a second audio engine or analyser for hero decoration.
- **Don't** duplicate direct stage gestures with competing control panels.
- **Don't** turn the showcase into a generic card dashboard, glass UI or DAW.
- **Don't** apply showcase fonts, motion or heavy visual effects to Fumadocs.

Source of truth: [global styles](app/globals.css), [landing styles](app/landing.css),
[hero styles](app/lightsaber-hero.css), [hero](app/lightsaber-hero.tsx),
[stage](app/lightsaber-stage.ts), [artwork](app/signal-artwork.tsx),
[catalog cards](app/catalog-cards.tsx), [catalog detail](app/catalog-detail.tsx)
and [catalog styles](app/catalog.css).
