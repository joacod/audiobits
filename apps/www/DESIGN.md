---
name: AudioBits showcase
description: A sonic specimen book for browser-native sound as code.
colors:
  paper: "#f3f0e6"
  ink: "#243c32"
  quiet: "#536257"
  rule: "#b8c1b3"
  accent: "#e0b856"
  signal: "#ecce82"
  code: "#e8e6db"
  focus: "#715600"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(3rem, 7.5vw, 6rem)"
    fontWeight: 450
    lineHeight: 1.05
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(2rem, 4vw, 3.4rem)"
    fontWeight: 450
    lineHeight: 1.12
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "2.5rem"
    fontWeight: 450
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Arial, sans-serif"
    fontSize: "1rem"
    lineHeight: 1.55
  button:
    fontFamily: "Arial, sans-serif"
    fontSize: "0.875rem"
    lineHeight: 1.3
  label:
    fontFamily: "Arial, sans-serif"
    fontSize: "0.9rem"
  code:
    fontFamily: "monospace"
    fontSize: "0.8rem"
    lineHeight: 1.7
rounded:
  control: "4px"
spacing:
  compact: "0.5rem"
  control-gap: "0.75rem"
  base: "1rem"
  gutter-min: "1.5rem"
  specimen-padding: "2.5rem"
  column-gap: "3rem"
  story-padding: "5rem"
components:
  button-play:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "0.5rem 0.9rem"
  button-play-hover:
    backgroundColor: "{colors.signal}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "0.5rem 0.9rem"
  button-secondary-hover:
    backgroundColor: "{colors.code}"
  input-number:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0.4rem 0.6rem"
    width: "8rem"
  recipe-editor:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0.75rem"
    width: "100%"
  specimen-entry:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    padding: "2.5rem 0"
  output-scope:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    padding: "1.25rem 1.5rem"
  code-panel:
    backgroundColor: "{colors.code}"
    textColor: "{colors.ink}"
    typography: "{typography.code}"
    rounded: "{rounded.control}"
    padding: "1.25rem"
---

# Design System: AudioBits showcase

## Overview

**Creative North Star: "Sonic specimen book"**

The sonic specimen book treats browser audio as something to hear, change and inspect. Warm paper, dark green ink and self-hosted Fraunces headings give the showcase a tactile editorial character; ordinary HTML controls keep the instrument precise.

Ruled entries and restrained code panels carry the system across the home, collection and individual sound pages. Signal is living content derived from native audio output, and brass marks the controls that initiate playback or hold a pressed state. The separate Fumadocs reference experience keeps its own styling.

**Key Characteristics:**

- Warm paper and green ink, with brass for playback and pressed controls.
- Serif headings above practical sans-serif controls and monospace code.
- Ruled specimens and flat surfaces instead of floating cards.
- Measured waveform and a bounded Play response; no idle decorative motion.

## Colors

Warm mineral neutrals support green ink and a restrained brass interaction accent.
The frontmatter records the normative CSS values.

### Primary

- **Brass** (`accent`): Play and pressed controls, including the selected Mute state.
- **Pale signal brass** (`signal`): Play hover and the waveform drawn on ink.

### Neutral

- **Warm paper** (`paper`): page, sticky mixer and editable fields.
- **Green ink** (`ink`): main text, structural rules, slider accent and dark signal surfaces.
- **Quiet green** (`quiet`): captions, supporting text and scrollbars.
- **Sage rule** (`rule`): specimen dividers and ordinary control borders.
- **Code paper** (`code`): code panels and secondary action hover.
- **Dark ochre** (`focus`): visible focus outlines and the bounded click spark.

**The Brass State Rule.** Use brass for Play and pressed controls; keep ordinary actions on paper with a fine rule.

## Typography

**Display Font:** Fraunces, with Georgia and serif fallbacks; self-hosted variable face.
**Body Font:** Arial, with sans-serif fallback.
**Code Font:** monospace.

The expressive serif carries sound character; practical sans-serif text keeps
controls legible. Code remains plain and inspectable rather than decorated with
terminal chrome.

### Hierarchy

- **Display:** primary page heading, with a fluid size and balanced wrapping.
- **Headline:** section headings, with a smaller fluid scale.
- **Title:** specimen names; mobile titles resolve to (2rem), while the desktop featured title uses (2.2rem).
- **Body:** explanatory text with a maximum measure of (70ch); specimen descriptions use (0.9rem).
- **Label:** labelled controls with tabular numerals; utility captions and status use the observed (0.75–0.8rem) range.
- **Code:** snippets use a spacious line height; the editable recipe field uses (0.85rem).

**The Specimen Heading Rule.** Use Fraunces for sound and section headings, sans-serif for controls and explanation, and monospace for code.

## Layout

The page uses a centered content area of (76rem), with side gutters calculated as
`max(1.5rem, calc((100vw - 76rem) / 2))`. There is no sidebar. The masthead and
collection index wrap; the mixer sticks to the top of the viewport.

Specimen entries pair playback and controls with recipe tools in columns of
(1.15fr / 1fr), separated by (3rem). Editorial sections use equal columns; rows
and generous vertical spacing establish the rhythm. Dark recipe material can
extend across the page gutters without becoming a separate floating panel.

At (760px) and below, gutters become (1rem), specimen and story grids collapse,
and the mixer puts actions/status above its full-width volume label. The final
mobile featured specimen places the title beside Play, then the labelled slider,
status and compact code sample underneath. Its waveform is (3rem) high. Code
panels scroll internally rather than widening the page.

## Elevation & Depth

The showcase uses no box shadows. Fine rules, paper/code tonal changes and solid
ink bands supply depth. The sticky mixer remains opaque paper; it uses stacking
order rather than a floating shadow. Signal drawing and the click spark are
content/state feedback, not surface elevation.

**The Ruled Surface Rule.** Separate specimens with fine rules and tonal surfaces; do not add floating-card shadows.

## Shapes

Specimens and signal bands keep rectangular silhouettes. Fine (1px) borders
separate entries and define ordinary controls. Buttons, numeric fields, recipe
editors and code panels share a modest (4px) control radius. Avoid promoting
that small functional radius into a rounded-card treatment.

## Components

### Buttons

Compact, explicit actions. Play and pressed controls use brass and medium-bold
text (600); ordinary actions are transparent with a sage border. Both share a
minimum height of (44px), compact padding and the control radius. Play hover uses
pale signal brass; ordinary hover uses code paper and an ink border. Disabled
buttons have opacity (0.5) and a default cursor.

All focusable showcase elements use a dark-ochre (3px) outline offset by (4px).
Background and border changes transition over (160ms), with `ease-out`; reduced
motion removes transitions. Play produces an eight-ray click response lasting
(360ms), suppressed for reduced motion and hidden documents.

### Cards / Containers

Sound specimens are ruled entries, not enclosed cards. A desktop entry has
(2.5rem) vertical padding; a mobile entry has (2rem). The featured entry omits
the top divider and tightens spacing. Code panels use code paper, the control
radius, overflow scrolling and no shadow.

### Inputs / Fields

Ranges remain native with green-ink accent, labelled values and tabular numerals.
General ranges have a maximum width of (28rem) and a (44px) high input box.
Numeric seed fields use paper, a sage border and a width of (8rem). Recipe
editors use the same material, monospace type and a minimum height of (18rem).
Recipe validation feedback uses a bordered text alert rather than sound alone.

### Navigation

The masthead pairs a bold sans-serif wordmark with a simple inline SVG signal
mark and quiet text links. Navigation links omit underlines in the masthead;
ordinary links elsewhere retain offset underlines that thicken on hover. The
collection index is a wrapping list between rules, rather than chips. On mobile,
the wordmark occupies its own row; masthead link boxes use the implemented
(32px) minimum height.

### Output Scope

One full-width ink band pairs a compact paper caption with a brass waveform.
The display reads caller-owned native analyser data; it returns to a baseline
while idle and pauses animation for reduced motion. The static sidecar preview
illustrates its material only and is not an audio measurement.

## Do's and Don'ts

### Do:

- **Do** keep Play, parameter labels and visible playback status ahead of recipe disclosures.
- **Do** use the paper, ink and brass roles consistently across showcase routes.
- **Do** collapse specimen columns at the established mobile breakpoint and retain usable code overflow.
- **Do** label native controls, retain visible focus, and respect reduced motion.
- **Do** use real audio output for the waveform and a silent idle baseline.

### Don't:

- **Don't** introduce neon, glass, SaaS gradients, noisy effects or a DAW interface.
- **Don't** turn a specimen entry into a floating rounded card.
- **Don't** replace waveform data with a decorative looping signal.
- **Don't** apply the showcase stylesheet as a redesign of the separate Fumadocs reference experience.

Source of truth: [global styles](app/globals.css), [gallery](app/gallery-page.tsx),
[sound specimens](app/sound-card.tsx), [output scope](app/output-scope.tsx) and
[Play response](app/play-spark.tsx). This record describes the showcase, not the
separate Fumadocs theme. Small utility captions and the mobile masthead's (32px)
link boxes are observed implementation details, not a mandate for new surfaces
or proof of touch/device acceptance.
