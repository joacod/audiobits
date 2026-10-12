# Showcase design tokens

Live Signal colour and type tokens live once, on `.foundation` inside the
`tokens` layer of [app/globals.css](app/globals.css). They apply only to the
showcase. Fumadocs uses its stock neutral styling, components, layout,
typography and light/dark palettes. Dark mode is the default, with normal
theme switching.

## Source of truth

CSS custom properties on `.foundation` in the `tokens` layer are the source of truth.
The stylesheet declares the layer order `theme, tokens, base, components,
utilities`. Layout values (`--gutter`, `--gap`, `--control-radius`,
`--motion-ui`) stay on `.foundation`. Values follow the approved brand guide
v1.0 (Live Signal). `lib/brand-colors.ts` mirrors the colours for the OG card
and `lib/brand-colors.test.ts` fails if they drift.

Roles:

- `--void` (#050507), `--ink` (#f2f2f2) and `--mute` (#8a8a92) are ground, text and secondary text.
- `--graphite` (#1b1c1e) and `--graphite-edge` (#34363a) are workbench panels, code panels, rules, borders, fader tracks and unlit LED segments.
- `--signal-low` (#2a6cff), `--signal-mid` (#b44cff) and `--signal-high` (#ff2e88), plus `--signal-gradient`, are reserved for live elements and the mark.
- `--font-display` is Big Shoulders Display (`--font-big-shoulders` from `next/font/local`). `--font-mono` is Geist Mono (`--font-geist-mono`).
- `--gutter`, `--gap`, `--control-radius` and `--motion-ui` set the page inset, the base gap, the (4px) control radius and the (160ms) control transition.

Canvas and WebGL painters read the signal and mute values at mount with
`readSignalPalette` in [lib/signal-palette.ts](lib/signal-palette.ts). Do not
copy a hex value into a component, shader or stylesheet outside the tokens block.
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

When this stylesheet changes, check a documentation page in both document
themes as well as the homepage. Keep Live Signal tokens, including `--font-mono`,
scoped to `.foundation`; do not override Fumadocs tokens or fork its components.
