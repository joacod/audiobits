# Gallery design tokens

The gallery's tokens and component styles live in [app/globals.css](app/globals.css).
They apply to the homepage, sound gallery, and individual sound pages. Fumadocs
continues to own the documentation theme and the gallery's surface, background,
and border colors.

## Source of truth

CSS custom properties are the source of truth. The stylesheet declares the
Tailwind-compatible layer order `theme, tokens, base, components, utilities`.
Gallery tokens live in `tokens`, the body reset in `base`, and gallery styles in
`components`. Tailwind utilities can override component styles when needed.
No generated token files or additional build tools are required.

- `--instrument-space-*` supplies the shared spacing scale.
- `--instrument-color-*` names action backgrounds, text on actions, focus rings,
  and slider accents. Focus and slider colors initially reuse the action color
  but can change independently.
- `--instrument-control-*`, `--instrument-field-radius`, and
  `--instrument-card-radius` define shared control sizes, padding, disabled
  opacity, and corner radii.
- `--instrument-text-*` and `--instrument-weight-*` define repeated text styles.
- `--instrument-border-width`, `--instrument-focus-*`, and
  `--instrument-layer-mixer` define border, focus, and sticky mixer behavior.
- Page padding is scoped to `.foundation`; card padding is scoped to
  `.sound-card`. The narrow-screen rules override these local tokens.

## Updating styles

Reuse an existing token before adding one. Add a semantic role for a repeated
product decision; keep one-off values, such as the fluid title size and recipe
editor height, local. Do not create a token for every declaration or duplicate
Fumadocs' theme palette.

Use the existing `.dark` theme mechanism for any future gallery color overrides.
Check action foreground/background pairs and focus visibility in both themes.
An alias overridden by theme should be redeclared alongside its source token
when it needs to follow that override.

Buttons retain their selected state through `aria-pressed`. Hover feedback is
limited to enabled buttons. Within `.audio-controls`, `gap` owns spacing and
button margins are zero; standalone buttons retain their original margins.
The existing reduced-motion override remains scoped to the gallery.

Verify changes with `pnpm build:site` and `pnpm lint`, then inspect the homepage
at desktop and narrow widths in light and dark themes. Check keyboard focus,
selected and disabled states, recipe disclosures, and horizontal overflow.
