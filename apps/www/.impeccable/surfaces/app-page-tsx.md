---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets:
  ["app/charge-hero.tsx", "app/site-header.tsx", "app/catalog/page.tsx"]
---

# Homepage

The homepage lets a visitor hold Energy Charge, then shows how the package,
bundled recipes and independent examples differ. Fumadocs stays a separate
reading surface.

## Composition

The first screen contains one charge instrument and one live engine. Header and
hero share a Void field. The headline "Sound that reacts." and the descriptor
"Procedural sound effects for the web." sit beside the charge well on wide
screens and directly above it on small screens. Hold to charge is the primary
action. Explore the catalog, Start building and the install command stay in reach.

The page then explains the installable library, eight bundled recipes and two
independent copy-paste examples. Experience previews link to their complete
interactions without mounting another audio host.

## Visual and interaction rules

The AudioBits showcase uses Void ground, Ink text, Mute labels, uppercase Big
Shoulders Display headlines and Geist Mono UI. A full-width signal band closes
the hero: a still Ink waveform mark at rest, real output samples in the signal
gradient after a user gesture starts audio. Charge rings rest in Mute and take
the gradient as charge rises. Audio-reactive output follows real samples;
charge animation follows interaction state. Reduced motion keeps the waveform
still while meters may update. No warm paper, glass, blobs or bento grids.

See [DESIGN.md](../../DESIGN.md) and [design-tokens.md](../../design-tokens.md)
for the shared visual rules and token roles.
