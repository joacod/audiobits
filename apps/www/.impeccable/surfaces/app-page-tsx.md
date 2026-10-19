---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets:
  [
    "app/lightsaber-hero.tsx",
    "app/lightsaber-hero.css",
    "app/lightsaber-stage.ts",
    "app/landing.css",
    "app/signal-artwork.tsx",
    "app/site-header.tsx",
  ]
---

# Homepage

The homepage is a playable audiovisual playground. A visitor plays the actual
Lightsaber, discovers other sounds, then sees how to adopt editable source or
build with the official Skill. Fumadocs stays a separate reading surface.

## Composition

Header and full-bleed Lightsaber stage share a near-black field. Oversized
"Sound that reacts." type overlays the stage with a solid first line, offset
outlined second line and violet punctuation. Instructions support the
existing direct interaction and touch activation. Source and catalog links sit
below the stage, beside concise product copy. The narrow signal strip draws
actual output samples from the same stage analyser and rests as a flat line.

Catalog previews come next, with static family-based SVG covers for the current
non-Lightsaber experiences and selected sounds. They link to full interactions
or workbenches without mounting more audio hosts. Editable source installation
follows, then a blue Skill/AI adoption field, then the footer. Commands copy the
actual displayed install text; source and runtime adoption remain clear.

## Visual and interaction rules

Use Void, Ink, violet, blue and pink from the shared tokens.
Big Shoulders Display delivers music-poster scale; Geist Mono handles copy,
controls and code. The hero title uses `clamp(5rem, 11.8vw, 11rem)`, becoming
`clamp(3.5rem, 19.5vw, 8rem)` below (760px), with (0.82) line height.
Preview columns stack on small screens.

Hero waveform and headline response follow actual analyser samples. Lighting
also follows extension and blade position through the existing stage's visual
state. No idle fake signal and no additional engine or analyser. Reduced motion
keeps the waveform flat and removes headline skew and hero lighting. Covers
remain illustrations; their hover/focus transform is silent navigation feedback.
Preserve existing pointer, touch, keyboard, cancellation and disposal semantics.

See [DESIGN.md](../../DESIGN.md) and [design-tokens.md](../../design-tokens.md)
for shared visual rules and token roles.
