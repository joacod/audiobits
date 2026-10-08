# AudioBits website agent rules

These instructions apply to `apps/www`.

Read root `AGENTS.md` first.

## Route purposes

- `/` = discovery. Make a new visitor understand and want AudioBits.
- `/sounds` = exploration. Browse and compare the curated sound collection.
- `/sounds/[slug]` = workbench. Manipulate, inspect, edit, and copy one sound.
- `/docs` = Fumadocs reference documentation. Keep it calm, readable,
  predictable, and separate from the showcase experience.

The routes may share implementation machinery. Do not split architecture merely
because their human purposes differ.

## Boundaries

- Do not modify `packages/audiobits` from a website task unless the requested
  feature strictly requires a runtime change.
- Presentation metadata stays outside `SoundRecipe`.
- Website-only dependencies stay inside `apps/www`.
- Fumadocs keeps its own layout and documentation UX.
- Do not make documentation pages inherit showcase motion or heavy visual
  effects.
- Use real AudioBits analyser output for signal/audio-reactive visuals where
  practical.
- Reuse the existing pulse / harmonic / flow visualization families instead
  of building a bespoke renderer for every sound.

## Design

- Preserve the current AudioBits paper / ink / brass visual language unless the
  task explicitly requests a redesign.
- Sound is the hero. Visual effects must support the audio rather than compete
  with it.
- Do not turn the site into a React Bits sampler or generic shadcn layout.
- Use React Bits, audiocn, shadcn-style primitives, or other website-only tools
  selectively where they materially improve the experience.
- Respect keyboard accessibility, visible focus, reduced motion, responsive
  behavior, and audio controls.
- Use the [installed Impeccable skill](.agents/skills/impeccable/SKILL.md)
  for substantial visual/UX redesign work.
- Do not load or invoke Impeccable for small bug fixes, copy changes, or
  ordinary implementation work.

## Verification

- Chromium is the only prerelease browser target.
- Copy/content-only changes: run only relevant static/build checks.
- Visual-only changes: lint/typecheck/build plus focused visual inspection.
- Changed website interaction: run the affected Chromium Playwright test(s).
- Do not run package release gates or compatibility suites for ordinary website
  work.

## Scope

- Do not redesign adjacent routes when changing one route unless explicitly
  requested.
- Do not replace the design system while fixing a local issue.
- Do not add dependencies unless the requested work clearly needs them.
- Do not refactor unrelated components simply because they are nearby.
- Stop when the requested website task and focused checks are complete.

For React/Next.js code, use the local
[React best practices](.agents/skills/vercel-react-best-practices/SKILL.md)
within the requested scope. Scope custom styles beneath `.foundation` or dedicated
gallery classes; preserve Fumadocs theme imports and providers. Check a
representative docs page when changing shared styles.
