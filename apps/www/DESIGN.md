---
name: AudioBits showcase
description: AudioBits showcase with a dark ground, audio-reactive waveform and graphite workbench controls.
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
    fontSize: "clamp(3.5rem, 11vw, 9rem)"
    fontWeight: 900
    lineHeight: 0.86
    letterSpacing: "-0.01em"
    textTransform: "uppercase"
  headline:
    fontFamily: "Big Shoulders Display, Arial Narrow, sans-serif"
    fontSize: "clamp(2rem, 4vw, 3.4rem)"
    fontWeight: 800
    lineHeight: 0.95
    textTransform: "uppercase"
  catalog-heading:
    fontFamily: "Big Shoulders Display, Arial Narrow, sans-serif"
    fontSize: "clamp(2.6rem, 5vw, 4.4rem)"
    fontWeight: 800
    lineHeight: 0.9
    textTransform: "uppercase"
  wordmark:
    fontFamily: "Big Shoulders Display, Arial Narrow, sans-serif"
    fontSize: "1.6rem"
    fontWeight: 800
    textTransform: "lowercase"
  body:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "1rem"
    lineHeight: 1.55
  nav:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.85rem"
    textTransform: "lowercase"
  label:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.72rem"
    letterSpacing: "0.1em"
    textTransform: "uppercase"
  code:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.8125rem"
    lineHeight: 1.6
rounded:
  control: "4px"
  panel: "6px"
spacing:
  compact: "0.5rem"
  control-gap: "0.75rem"
  base: "1rem"
  gutter-min: "1.5rem"
  section: "2.25rem"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.void}"
    rounded: "{rounded.control}"
    padding: "0.5rem 0.9rem"
  button-primary-hover:
    backgroundColor: "{colors.void}"
    textColor: "{colors.ink}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    borderColor: "{colors.graphite-edge}"
    rounded: "{rounded.control}"
    padding: "0.5rem 0.9rem"
  button-secondary-hover:
    backgroundColor: "{colors.graphite}"
  workbench-panel:
    backgroundColor: "{colors.graphite}"
    borderColor: "{colors.graphite-edge}"
    rounded: "{rounded.panel}"
  code-panel:
    backgroundColor: "{colors.graphite}"
    textColor: "{colors.ink}"
    typography: "{typography.code}"
    rounded: "{rounded.control}"
    padding: "1.25rem"
  led-meter:
    backgroundColor: "{colors.graphite-edge}"
    activeColor: "signal gradient at the current output"
---

# Design System: AudioBits showcase

## Overview

The waveform is the logo, and it moves only when sound moves. The showcase is dark-first: Void ground, Ink text, Mute for secondary copy. The blue, violet and magenta signal gradient belongs to live elements and to the mark, nothing else. The home page and the instrument pages speak in huge condensed Big Shoulders Display headlines and Geist Mono UI. The workbench uses graphite panels, knob-capped faders and segmented LED meters.

Documentation uses stock Fumadocs neutral styling, components, layout, typography and light/dark palettes. Dark mode is the default, with normal theme switching.

**Key Characteristics:**

- Void #050507 ground, Ink #F2F2F2 text, Mute #8A8A92 secondary.
- Signal gradient #2A6CFF to #B44CFF to #FF2E88, mapped to state (low, mid, high), only on live elements and the mark.
- Big Shoulders Display 800 and 900 for headlines and the wordmark. Geist Mono for UI, labels, code and instrument body copy.
- A live waveform drawn in code from real output samples. At rest it shows the fixed mark as a still frame.
- Graphite #1B1C1E panels with #34363A edges on the workbench. LED segments light with the gradient value at the current output.
- Motion only when sound or state moves. Reduced motion keeps the waveform still and lets only the meters update.

## Mark

The AudioBits mark is a single waveform stroke that builds from quiet to loud, like a charge. `BrandMark` in [app/brand-mark.tsx](app/brand-mark.tsx) draws it inline:

- Above 32 px: the full wave (`mark-1-wave`).
- 32 px and below: the small variant with the first bump dropped and a thicker stroke. The header uses this.
- `tone="mono"`: one-colour Ink stroke on dark, used as the non-live resting frame of the hero waveform.

Clear space is a quarter of the mark's width. Minimum size 16 px. Never recolour the stroke outside the signal gradient, except one-colour Ink on dark or Void on light.

The wordmark is `audiobits`, lowercase, Big Shoulders Display 800, set beside the mark.

## Colors

All showcase values live once, as custom properties on `.foundation` in the `tokens` layer of [app/globals.css](app/globals.css). Fumadocs uses its own stock tokens. Canvas and WebGL painters read the same properties at mount through [lib/signal-palette.ts](lib/signal-palette.ts), so no component owns a hex value.

- **Void** (`--void`): page ground, inverted text on Ink buttons, selection text.
- **Ink** (`--ink`): text, primary buttons, focus outlines, the resting mark.
- **Mute** (`--mute`): secondary text, labels, resting charge rings.
- **Graphite** (`--graphite`): workbench panels, code panels, the output scope.
- **Graphite edge** (`--graphite-edge`): hairline rules, control borders, unlit LED segments, fader tracks.
- **Signal low, mid, high** (`--signal-low`, `--signal-mid`, `--signal-high`) and `--signal-gradient`: live waveform stroke, charge progress ring, charge rings while charged, thruster trail while thrusting, lit LED segments.

**The Live Rule.** The gradient appears only while something is live: audio is running and real samples are drawn, or state (charge, thrust, output level) is above rest. At rest those elements fall back to Mute or Ink. Never use the gradient on body text, headings or flat surfaces.

Contrast on Void: Ink 18.2:1, Mute 5.9:1. On Graphite: Ink 15.2:1, Mute 5.0:1.

## Typography

**Display:** Big Shoulders Display 800 and 900, uppercase for headings, lowercase for the wordmark.
**UI and body:** Geist Mono 400 and 500 for navigation, labels, controls, code and instrument copy.

Both faces are SIL Open Font License 1.1 and self-hosted with `next/font/local` from their Fontsource packages ([app/fonts.ts](app/fonts.ts)). License texts sit in [licenses/](licenses/README.md).

### Hierarchy

- **Display:** the home headline, `clamp(3.5rem, 11vw, 9rem)`, weight 900, line-height 0.86.
- **Headline and section:** weight 800, line-height 0.95.
- **Catalog heading:** `clamp(2.6rem, 5vw, 4.4rem)`.
- **Labels:** workbench labels and index group titles are 0.72rem uppercase mono with 0.1em tracking, in Mute.
- **Navigation:** lowercase mono at 0.85rem in Mute; the current page and hover use Ink.

## Layout

Content width (76rem) with gutter `max(1.5rem, calc((100vw - 76rem) / 2))`, (1rem) below (760px). The home order stays: header, Energy Charge hero, use columns, catalog preview, footer. The hero is two columns above (900px) and stacks below it. A full-width signal band closes the hero: the live waveform when the charge voice is running, the still mark otherwise.

The catalog index uses a grouped navigation sidebar and preview rows; the workbench keeps its stage, playback controls and inspector in one frame. Every interactive target keeps a (44px) minimum height.

## Elevation & Depth

Depth comes from Void against Graphite, hairline Graphite edges and a single inset top highlight on workbench panels. No floating shadows, glass or blobs.

## Components

### Buttons

Primary (Play, Start charge, pressed toggles, the selected inspector tab): Ink fill, Void text. Hover inverts to Void with an Ink border. Secondary: transparent with a Graphite edge; hover fills Graphite. Disabled: opacity 0.5. Focus everywhere is a (3px) Ink outline with a (4px) offset; the hold control uses (8px).

### Faders

Native range inputs keep their roles, labels, steps and keyboard behaviour. They are drawn as a Graphite-edge track with a graphite knob cap carrying an Ink indicator, so the steps a parameter takes line up with the native step.

### Output scope

`OutputScope` taps the existing engine output. On the home hero (`signal`), the band shows the still Ink mark until a user gesture has started audio, then draws real samples with the signal gradient. On the workbench (`measured`), the scope adds an LED meter: 16 segments, lit to the current output level with the gradient. With reduced motion the canvas stays still and only the meter updates.

### Charge and thruster instruments

Charge rings and the progress ring rest in Mute and Graphite edge and take the signal gradient as charge rises; output level brightens them. The thruster trail shows the gradient in proportion to thrust and fades out at rest.

## Do's and Don'ts

### Do:

- **Do** start audio only from a user gesture.
- **Do** keep the resting frame honest: the still mark or a non-live frame, never a fake animated waveform.
- **Do** read colours from the tokens, including in canvas and WebGL code.
- **Do** keep keyboard and touch targets at least (44px).

### Don't:

- **Don't** use warm paper, serif display faces, glassmorphism, blobs, bento grids, gradient text or stock sparkles.
- **Don't** put the signal gradient on text or flat surfaces.
- **Don't** animate anything that is not following sound or state.
- **Don't** fork or restyle Fumadocs components. Keep showcase tokens and fonts scoped to `.foundation`.

Source of truth: [global styles](app/globals.css), [landing styles](app/landing.css), [hero styles](app/charge-hero.css), [catalog styles](app/catalog.css), [mark](app/brand-mark.tsx), [header](app/site-header.tsx), [output scope](app/output-scope.tsx).
