# Showcase design tokens

Showcase colors and fonts live on `.foundation` in the `tokens` layer of
[app/globals.css](app/globals.css). CSS is authoritative; [DESIGN.md](DESIGN.md)
records the implemented values. Fumadocs keeps stock-neutral surfaces, layout,
typography, light/dark palettes and theme switching, with dark mode as default.
Its existing logo and active accents retain their documentation palette.

## Source of truth

The stylesheet declares the layer order `theme, tokens, base, components,
utilities`. Layout values (`--gutter`, `--gap`, `--control-radius`, `--motion-ui`)
stay on `.foundation`. [lib/brand-colors.ts](lib/brand-colors.ts) mirrors the colors
for generated social images; its unit check detects drift from CSS.

- `--void`, `--ink`, `--mute`: near-black ground, white text and secondary copy.
- `--graphite`, `--graphite-edge`: neutral panels, code fields, rules, borders,
  fader tracks and unlit LED segments.
- `--signal-low`, `--signal-mid`, `--signal-high`: saturated blue, violet and
  pink. The shared `--signal-gradient` serves live scopes and signal ranges;
  solid accents also identify families, playback, selected states and brand sections.
- `--art-ground`, `--art-ink`: derived cover roles. Charge/pulse use violet
  with Void strokes; thruster/flow use blue with Void strokes; harmonic uses
  pink with Void strokes; blade uses Graphite with violet strokes.
- `--font-display`: self-hosted Big Shoulders Display through `--font-big-shoulders`.
  `--font-mono`: self-hosted Geist Mono through `--font-geist-mono`.
- `--gutter`, `--gap`, `--control-radius`, `--motion-ui`: page inset, base gap,
  ordinary control radius (4px) and control transition (160ms).

Canvas and WebGL painters read shared colors at mount through
[lib/signal-palette.ts](lib/signal-palette.ts). Contexts unable to read CSS,
including browser chrome, manifest, SVG favicon and generated social image, use
matching literal or mirrored values. Existing PNG favicon and Apple icon exports
retain earlier artwork; they are not the palette authority.

## State and motion

Runtime variables such as `--charge`, `--thrust`, `--level` and `--drive` carry
state. The Lightsaber stage also publishes `--hero-level` from its existing
analyser, `--hero-extension` from blade state and `--hero-x` from blade position.
The hero consumes these without another engine or analyser; reset and disposal
clear presentation state.

Static SVG covers are illustration. Their hover/focus geometry may scale and
rotate silently. A live waveform must use real output samples and stay still at
rest. Reduced motion removes transitions, hero headline skew and hero lighting,
and keeps the hero waveform flat. Workbench meters may continue reporting level.

## Updating styles

Reuse existing roles before adding tokens. Keep readable solid text, visible Ink
focus on Void and Graphite, native control semantics and the existing direct
interaction lifecycle. Playback uses `.play-action`; pressed toggles retain
`aria-pressed`. Hover applies to enabled controls.

Check a representative documentation page in both document themes when changing
shared styles. Keep showcase fonts, tokens and effects scoped to `.foundation`;
do not fork Fumadocs components or carry showcase motion into documentation.
