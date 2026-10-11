---
name: AudioBits showcase
description: A charge housing for procedural browser sound, with the precision of a developer tool.
colors:
  paper: "#f3f0e6"
  ink: "#243c32"
  quiet: "#536257"
  rule: "#b8c1b3"
  accent: "#e0b856"
  signal: "#ecce82"
  code: "#e8e6db"
  focus: "#715600"
  focus-bench: "#715600"
  instrument-line: "#768b7d"
  instrument-quiet: "#cfdbcf"
  instrument-well: "#1a2c24"
  instrument-hover: "#344e40"
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
  section:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(1.65rem, 2.6vw, 2.2rem)"
    fontWeight: 450
    lineHeight: 1.15
  title:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "2.5rem"
    fontWeight: 450
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  catalog-heading:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(1.7rem, 2.4vw, 2.2rem)"
    fontWeight: 450
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  catalog-section:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(1.45rem, 2vw, 1.8rem)"
    fontWeight: 450
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  catalog-experience:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(1.55rem, 2.2vw, 2rem)"
    fontWeight: 450
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  catalog-name:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "1.25rem"
    fontWeight: 450
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  wordmark:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "1.35rem"
    fontWeight: 520
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Arial, sans-serif"
    fontSize: "1rem"
    lineHeight: 1.55
  nav:
    fontFamily: "Arial, sans-serif"
    fontSize: "0.95rem"
  button:
    fontFamily: "Arial, sans-serif"
    fontSize: "0.875rem"
    lineHeight: 1.3
  label:
    fontFamily: "Arial, sans-serif"
    fontSize: "0.9rem"
  code:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "0.8125rem"
    lineHeight: 1.6
rounded:
  control: "4px"
spacing:
  compact: "0.5rem"
  control-gap: "0.75rem"
  base: "1rem"
  gutter-min: "1.5rem"
  section: "2.25rem"
  column-gap: "1.5rem"
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
  button-housing:
    backgroundColor: "transparent"
    textColor: "{colors.paper}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "0.5rem 0.9rem"
  button-housing-hover:
    backgroundColor: "{colors.instrument-hover}"
    textColor: "{colors.paper}"
  install-command:
    backgroundColor: "{colors.code}"
    textColor: "{colors.ink}"
    typography: "{typography.code}"
    rounded: "{rounded.control}"
    padding: "0.5rem 0.75rem"
  site-header:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.nav}"
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

**Creative North Star: "The charge housing"**

The homepage is one mineral-green housing. The header and the Energy Charge hero share that field, so the instrument is the first thing a visitor can hold. Warm paper is reserved for labels, code, and the footer plate. Brass marks charge and primary playback. Pale signal marks action and focus while the ground is green.

Catalog and experience routes keep their paper benches and their existing workbench layouts. They share the same header, type, controls, and tokens. Documentation stays on Fumadocs and does not inherit the housing. Fraunces remains the voice because the charge numeral and the headline already use it.

**Key Characteristics:**

- Mineral-green housing on the homepage, warm paper on catalog and experience benches.
- Brass for charge, Play, and pressed controls. Pale signal for housing focus, current navigation, and primary text actions.
- Fraunces for the voice, Arial for controls, monospace only for code.
- Hairline rules and flat surfaces. No cards, glass, neon, or shadows.
- One live Energy Charge engine on the homepage. Supporting previews stay static.

## Colors

The palette is oxidized green, warm paper, and brass. The frontmatter records the normative CSS values. Showcase colors are declared on `.foundation`, so the document light and dark themes do not repaint these routes.

### Primary

- **Brass** (`accent`): Play, pressed controls, the hold meter, and the wordmark core.
- **Pale signal brass** (`signal`): primary text actions, current navigation, housing focus, play hover, and the waveform on ink.

### Neutral

- **Green ink** (`ink`): homepage ground, shared header, main text on paper, and dark signal surfaces.
- **Warm paper** (`paper`): catalog and experience pages, code chips, editable fields, and the homepage footer plate.
- **Quiet green** (`quiet`): supporting text on paper, including the npm version line.
- **Pale instrument green** (`instrument-quiet`): supporting text and static portrait strokes on the housing.
- **Sage rule** (`rule`): dividers and ordinary control borders on paper.
- **Instrument line** (`instrument-line`): hairline rules and quiet control borders on the housing.
- **Code paper** (`code`): code panels, the install chip, and secondary hover on paper.
- **Instrument well** (`instrument-well`): the charge well and the hold control's inner disc.
- **Instrument hover** (`instrument-hover`): secondary control hover on the housing.
- **Dark ochre** (`focus` and `focus-bench`): focus on paper. The housing and header switch focus to pale signal, and the paper footer restores ochre through `focus-bench`.

**The Housing Rule.** The homepage ground is ink. Paper is for labels, code, and the footer plate. Do not paint the catalog or a workbench as a second dark marketing page.

**The Brass State Rule.** Use brass for Play, the hold meter, and pressed controls. Ordinary actions stay transparent with a fine rule.

## Typography

**Display Font:** Fraunces, with Georgia and serif fallbacks. The variable face is self-hosted.
**Body Font:** Arial, with sans-serif fallback.
**Code Font:** ui-monospace, with SFMono, Menlo, Consolas, and monospace fallbacks.

Fraunces carries the headline, section titles, the wordmark, and the charge numeral. Arial keeps controls and explanation plain. Code is inspectable and does not use terminal chrome.

### Hierarchy

- **Display:** the homepage headline and other primary page headings. Fluid size, tight leading, balanced wrapping.
- **Headline:** experience page headings.
- **Catalog:** the overview heading, its section titles, experience names, and sound names. These steps stay smaller than the homepage display so the index fits the first screen.
- **Section:** homepage section headings, a smaller fluid scale than the page headline.
- **Title:** sound names on the collection. Landing use-column and preview titles are smaller than the collection title.
- **Wordmark:** Fraunces at (1.35rem) and weight (520). Hover does not recolor the word. The brass core brightens to signal.
- **Body:** explanation at (1rem) with a maximum measure of (70ch). Housing support copy uses pale instrument green.
- **Navigation and label:** header links at (0.95rem). Control labels use the observed (0.9rem) range, with tabular numerals where a value changes.
- **Code:** showcase `pre` uses (0.8125rem), line-height (1.6), and tab size (2). The install chip uses (0.85rem). Long lines wrap or scroll inside the panel.

**The Voice Rule.** Fraunces is for the voice and the charge numeral. Arial is for controls. Monospace is only for code.

## Layout

Showcase pages use a content width of (76rem). The gutter is `max(1.5rem, calc((100vw - 76rem) / 2))`, and (1rem) below (760px). Full-bleed bands cancel that gutter with an equal negative margin.

The homepage order is header, Energy Charge hero, three short use columns, a static catalog preview, and a paper footer. The hero is two columns above (900px): copy on the left, the charge well on the right. At (900px) and below it stacks, with the copy directly above the well. At (760px) and below the well is at most (22rem), so Hold to charge stays in the first screen at (375px) by (900px). Use columns and the three sound previews stay three-across until (760px), then stack. Experience rows become two columns at that same breakpoint.

The shared header is an ink band. On the homepage its background is transparent so it joins the housing. On catalog and experience routes it is a solid ink band over the paper bench. At (760px) and below, the links wrap onto their own row. Every header link has a (44px) minimum height.

Collection and workbench layouts are unchanged: a flexible sound column, an (18rem) monitor rail, and a (3rem) gap. From (761px) to (1000px) the rail is (16rem). At (760px) and below the monitor becomes a fixed bottom dock.

## Elevation & Depth

The showcase uses no box shadows. Depth comes from the ink housing, the paper footer plate, code paper, and hairline rules. The charge well is a radial disc, not a raised card. The monitor uses stacking order and stays opaque.

**The Ruled Surface Rule.** Separate sections and specimens with hairline rules. Do not add floating-card shadows, glass, or a second decorative field behind the charge well.

## Shapes

The signature geometry is the concentric ring: the wordmark, the charge well, and the energy-charge preview mark. Specimens, buttons, and code stay rectangular. Controls, numeric fields, and code panels share a (4px) radius. Do not turn that radius into a rounded card.

## Components

### Buttons

Play and pressed controls use brass, ink text, and weight (600). Ordinary paper actions are transparent with a sage border and hover to code paper. Housing actions are transparent with an instrument-line border, paper text, and an instrument-hover fill. The minimum height is (44px). Disabled buttons use opacity (0.5). Background and border changes take (160ms) ease-out. Reduced motion removes transitions.

Focus on paper is a dark-ochre (3px) outline offset by (4px). Focus on the header and the homepage is pale signal at the same width and offset. The hold control uses pale signal with an (8px) offset.

### Install command

`npm install audiobits` is a code-paper chip. The Copy control writes that exact string and announces "Install command copied." The empty announcement does not take layout space. The footer repeats the same command as plain code, without a second copy button.

### Navigation

One header serves the homepage, the catalog, and both experience routes. The links are Home, Catalog, Docs, and GitHub. Catalog points at `/catalog`. The current page is underlined in signal. Docs uses the Fumadocs sidebar instead of this header.

### Catalog preview

The homepage preview is static. Two experience rows and three portrait links point at the live pages. Portraits keep the pulse, harmonic, and flow drawings. Nothing in that section starts audio. The section link opens `/catalog`.

### Catalog overview

`/catalog` is the paper browsing page. A compact heading sits with a sticky grouped index: Interactive experiences, then Bundled sounds. The index and the previews share one entry list. The Energy Charge ring is a hold control beside its copy: the rings and the percent follow the gesture, and the voice starts on that hold. The Reactive Thruster preview is an ink flight field under its copy. Dragging it moves the point and starts the voice. Bundled sounds are compact rows with the existing pulse, harmonic, and flow marks, Play or Start/Stop, and a workbench link. One output strip serves the whole collection. Its trace is tall enough to read a short sound, and it stays a strip rather than a second monitor card. Experience links still open `/experiences/[slug]`. Bundled sound links open `/catalog/[slug]`. At 760px and below, the index becomes a Catalog menu with the same groups, and the output strip returns to the bottom dock.

### Catalog sound workbench

`/catalog/[slug]` is the paper workbench for one bundled sound. The same index stays beside it, and becomes the Catalog menu below 760px. A breadcrumb, the sound name, the description, and a bundled-source line introduce the entry. The page ground stays paper. The stage is an ink field: its family mark shows control position when the recipe has a parameter, and its canvas is measured output. Pulse, harmonic, and flow each keep one painter. Playback, the recipe's own parameters, seed, mute, and volume sit with the stage. Code, Recipe, and Raw Web Audio stay in the inspector, beside that column from 980px and below it on smaller screens. Tabs and sliders that the recipe does not support are omitted. Below 760px the playback group becomes a bottom strip. Related sounds and documentation links sit under the bench. Leaving the entry disposes that page's audio session. `/sounds/[slug]` keeps the earlier workbench until redirects.

### Audio monitor, workbench, and inspector

Collection and `/sounds/[slug]` workbench behavior is unchanged. The monitor waveform reads native output. Portraits on those pages remain the paper-and-ink pulse, harmonic, and flow forms. Inspector tabs, recipe editing, and playback controls keep their existing paper-bench treatment. The catalog workbench uses one measured stage and does not add a second analyser.

## Do's and Don'ts

### Do:

- **Do** keep Hold to charge as the homepage's primary action, with Explore the catalog and Start building as the text actions.
- **Do** take the package version from generated metadata.
- **Do** keep keyboard and touch targets at least (44px), including header, copy, and footer actions.
- **Do** reset paper-surface focus to ochre wherever the housing has switched focus to signal.
- **Do** let code wrap or scroll inside its own panel.

### Don't:

- **Don't** mount a second live audio engine on the homepage.
- **Don't** autoplay, rotate the hero, or add a decorative effect that competes with the charge well.
- **Don't** restyle Fumadocs with the showcase housing.
- **Don't** invent performance, package-size, adoption, or popularity claims.
- **Don't** replace Fraunces on the charge numeral or the homepage headline. The face is part of the instrument.

Source of truth: [global styles](app/globals.css), [landing styles](app/landing.css), [hero styles](app/charge-hero.css), [header](app/site-header.tsx), [landing](app/page.tsx), and [charge hero](app/charge-hero.tsx). This record describes the showcase, not the Fumadocs theme.
