---
version: 1
slug: "app-catalog-page-tsx"
primary_target: "app/catalog/page.tsx"
related_targets:
  [
    "app/catalog-page.tsx",
    "app/catalog.css",
    "lib/catalog.ts",
    "app/site-header.tsx",
  ]
---

# Catalog index

The catalog is the browsing page for every current AudioBits experience and
bundled sound.

## Composition

Ten entries appear with experiences first and bundled sounds second. A compact
Catalog heading, a sticky grouped index and two experience previews fill the
first viewport. Bundled sounds follow immediately. On small screens the index
becomes a Catalog menu with the same groups.

Energy Charge and Reactive Thruster use static previews that link to their full
interactive hosts. Bundled rows show each sound's use, play from one shared
session and open its workbench. Previews do not mount a second audio engine per
row.

## Visual and interaction rules

The AudioBits showcase uses Void ground, Ink text and Mute labels. Big Shoulders
Display names the page and the experiences; Geist Mono runs the index and
controls. The charge preview is a static ring in Ink and Mute. The thruster
preview is a still Ink flight field. Bundled rows keep the pulse, harmonic and
flow marks. The signal gradient appears only on live output, with real analyser
data driving audio-reactive visuals. Reduced motion keeps the waveform still
while meters may update. Hairline Graphite edges define rows without cards,
glass or blobs.

See [DESIGN.md](../../DESIGN.md) and [design-tokens.md](../../design-tokens.md)
for the shared visual rules and token roles.
