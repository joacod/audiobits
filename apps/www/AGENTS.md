# Website instructions

## Impeccable

- Use the project-local Impeccable skill for frontend design work in `apps/www`.
  Its instructions are in [.agents/skills/impeccable/SKILL.md](.agents/skills/impeccable/SKILL.md).
- Apply this skill only to the website. Do not use it to change the runtime
  package, examples, or other monorepo workspaces.
- Focus on the custom gallery at `/`, `/sounds`, and `/sounds/[slug]`, including
  its playback controls, mixer, and recipe tools.
- Leave `/docs/**`, documentation MDX, Fumadocs layouts and components, and the
  Fumadocs theme outside Impeccable design work unless explicitly requested.
- Scope custom styles beneath `.foundation` or dedicated gallery classes.
  Preserve Fumadocs CSS imports, shared theme variables, and the root provider;
  do not override documentation styling to achieve a gallery treatment.
- When editing shared styles, check a representative documentation page for
  unintended changes as well as the gallery at desktop and narrow widths in
  light and dark themes.
- When working from the repository root, read the skill at the path above
  explicitly; automatic discovery requires a chat started in `apps/www` or
  one of its subdirectories.
- Run Impeccable commands with `apps/www` as the working directory so generated
  product context, design context, and working files stay within this workspace.

## React and Next.js

- Use [vercel-react-best-practices](.agents/skills/vercel-react-best-practices/SKILL.md)
  when writing, reviewing, or refactoring React and Next.js code in `apps/www`.
- When working from the repository root, read this skill explicitly. Apply it
  only to the website; the repository's architecture and dependency constraints
  take precedence over generic recommendations in the skill.
