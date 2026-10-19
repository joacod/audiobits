---
version: 1
slug: "app-catalog-page-tsx"
primary_target: "app/catalog/page.tsx"
related_targets:
  [
    "app/catalog-page.tsx",
    "app/catalog-cards.tsx",
    "app/catalog.css",
    "app/signal-artwork.tsx",
    "lib/catalog.ts",
    "app/site-header.tsx",
  ]
---

# Catalog index

The catalog browses current AudioBits experiences and sounds through collectible
covers. Entries and groups come from catalog metadata, with experiences first.

## Composition

A large condensed Catalog heading and short introduction lead into grouped
covers. The browsing index has no sidebar or menu. Detail pages carry grouped
navigation on wide screens and a Catalog menu on small screens. Covers use three columns,
two below (1000px) and one below (600px). Below (760px), cover ratios become
wider and spacing tightens.

Each cover shows static geometric family artwork and a small identifying mark.
Title, description and action row sit below on the dark ground. Experiences link
to their full hosts. Sounds play from one shared session and open a workbench;
current playback state marks the action row. Covers mount no per-entry audio hosts.

## Visual and interaction rules

Violet identifies charge/pulse, blue identifies thruster/flow, pink
identifies harmonic, and Graphite with violet strokes identifies blade.
Big Shoulders Display titles pair with quieter Geist Mono descriptions and
controls. Covers have small corners without enclosing the entire item in a
floating panel. Hover and focus may scale and rotate static SVG geometry
silently; the illustration is never an analyser measurement.

Playback and active navigation use violet, while workbench controls and
source panels retain precise tactile treatment. Preserve sound selection,
playback, direct interaction, activation and cleanup behavior. Reduced motion
removes cover transitions; actual workbench scopes remain still while level
meters may update.

See [DESIGN.md](../../DESIGN.md) and [design-tokens.md](../../design-tokens.md)
for shared visual rules and token roles.
