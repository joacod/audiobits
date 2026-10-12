# Showcase design tokens

Showcase colour and type tokens live once, on `.foundation` in
[app/globals.css](app/globals.css). They cover the homepage, the shared header
and the catalog. Fumadocs keeps its own theme. The document light and dark
classes do not repaint `.foundation`.

## Source of truth

CSS custom properties on `.foundation` are the source of truth. The stylesheet
declares the layer order `theme, tokens, base, components, utilities`. The
showcase custom properties are set inside the `components` layer, on
`.foundation`, so they do not leak into documentation pages. Values follow the
approved brand guide v1.0 (Live Signal).

Roles:

- `--void` (#050507), `--ink` (#f2f2f2) and `--mute` (#8a8a92) are ground, text and secondary text.
- `--graphite` (#1b1c1e) and `--graphite-edge` (#34363a) are workbench panels, code panels, rules, borders, fader tracks and unlit LED segments.
- `--signal-low` (#2a6cff), `--signal-mid` (#b44cff) and `--signal-high` (#ff2e88), plus `--signal-gradient`, are reserved for live elements and the mark.
- `--font-display` is Big Shoulders Display (`--font-big-shoulders` from `next/font/local`). `--font-mono` is Geist Mono (`--font-geist-mono`).
- `--gutter`, `--gap`, `--control-radius` and `--motion-ui` set the page inset, the base gap, the (4px) control radius and the (160ms) control transition.

Canvas and WebGL painters read the signal and mute values at mount with
`readSignalPalette` in [lib/signal-palette.ts](lib/signal-palette.ts). Do not
copy a hex value into a component, shader or stylesheet outside `.foundation`.
The only literal outside it is `#050507` in the Next.js viewport `themeColor`
and the web manifest, which cannot read CSS.

Runtime variables such as `--charge`, `--thrust`, `--level` and `--drive` carry
state, not design values.

## Updating styles

Reuse an existing token before adding one. The signal gradient is for live
elements only: when the element is at rest it falls back to Mute, Ink or
Graphite edge. Check focus (Ink outline) on Void and on Graphite.

Buttons keep a pressed state with `aria-pressed`. Hover applies to enabled
buttons. Playback uses `.play-action`. Reduced motion removes showcase
transitions; the waveform stays still and only meters update.

When this stylesheet changes, check a documentation page as well as the
homepage. The docs page should still follow Fumadocs in both document themes.
