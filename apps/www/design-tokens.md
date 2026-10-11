# Showcase design tokens

Showcase color, type, and motion tokens live on `.foundation` in
[app/globals.css](app/globals.css). They cover the homepage, the shared header,
the sound gallery, and individual sound pages. Fumadocs keeps its own theme.
The document light and dark classes do not repaint `.foundation`.

## Source of truth

CSS custom properties on `.foundation` are the source of truth. The stylesheet
declares the layer order `theme, tokens, base, components, utilities`. The
showcase custom properties are set inside the `components` layer, on
`.foundation`, so they do not leak into documentation pages.

Shared roles:

- `--paper`, `--ink`, `--quiet`, `--rule`, `--accent`, `--signal`, and `--code` are the palette.
- `--focus` is the outline color. Paper surfaces use dark ochre. The header and the homepage set it to `--signal`.
- `--focus-bench` keeps the ochre value so a paper footer can restore it after the housing overrides `--focus`.
- `--instrument-line`, `--instrument-quiet`, `--instrument-well`, and `--instrument-hover` are the housing line, support text, charge well, and housing hover.
- `--font-display`, `--font-ui`, and `--font-code` name Fraunces, Arial, and the monospace stack.
- `--gutter`, `--gap`, `--control-radius`, and `--motion-ui` set the page inset, the base gap, the (4px) control radius, and the (160ms) control transition.

The homepage does not invent a second palette. `.foundation.landing` uses ink as the ground and paper as the text color, then the footer plate reverses that pair. Catalog and experience pages keep paper as the ground.

Hero geometry, ring color mixes, and one-off fluid sizes stay local to [app/charge-hero.css](app/charge-hero.css) and [app/landing.css](app/landing.css). Do not add a token for a value that appears once.

## Updating styles

Reuse an existing token before adding one. Add a semantic role only for a repeated product decision. Keep Fumadocs colors out of this file.

Do not theme the showcase by overriding these tokens under `.dark`. A future color change belongs on `.foundation`, with an explicit local override for the housing or the paper bench. Check focus on both surfaces: signal must be visible on ink, and ochre must be visible on paper.

Buttons keep a pressed state with `aria-pressed`. Hover applies to enabled buttons. Playback uses `.play-action`. Reduced motion removes showcase transitions and the charge ring loop.

When this stylesheet changes, check a documentation page as well as the homepage. The docs page should still follow Fumadocs in both document themes.
