# Local development

The workspace foundation, recipe playback, and Step 03 dynamic controls are
implemented. Step 04 adds buses, shared delay, native analyser taps, and hide
cleanup; maintainer manual acceptance is complete. [Step 04 verification](../openspec/changes/04-mixing-and-lifecycle/verification.md)
records the automated routing/lifecycle gate. [Step 05 verification](../openspec/changes/05-gallery-and-docs/verification.md)
records gallery/docs implementation, automated checks, and maintainer manual
acceptance. [Step 03 verification](../openspec/changes/03-dynamic-sounds/verification.md)
records automated checks and maintainer listening acceptance. See
[Step 02 verification](../openspec/changes/02-recipe-playback/verification.md)
for playback evidence and maintainer manual verification;
[Step 01 verification](../openspec/changes/01-workspace-foundation/verification.md)
retains foundation evidence.

## Setup

Use the Node version in [.node-version](../.node-version) and the pnpm version
in [package.json](../package.json). The root enforces Node 24 LTS. Direct
versions are exact-pinned; the lockfile is shared by all four workspaces.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open [the site](http://127.0.0.1:3000). Development builds the library before
starting the library watcher and Next.js server. An initial build failure
prevents site startup. A child failure stops the other process and returns a
failure status; Ctrl+C stops both and their process groups on macOS/Linux.
Windows process-tree termination has not been verified.

The site uses Next.js with webpack, Fumadocs MDX, Tailwind, and Base UI
buttons with labelled native controls. webpack is the verified path for this foundation; Turbopack's MDX
worker failed in the validation environment. The three-sound gallery and recipe editor use the existing stack; optional
visualization libraries are not required. Changesets remain release work.

## Local package edits

Edit a bundled definition in `packages/audiobits/src/recipes/index.ts` while
`pnpm dev` runs. After tsdown emits the change, reload `/sounds`, open that
sound's Recipe & code disclosure, and inspect the updated JSON before Play. The site
uses `transpilePackages` and imports `audiobits` through its public exports,
which point to `dist`; it never aliases library source. A refresh is the
supported verification path; state-preserving hot updates are not promised.

The vanilla example also uses `audiobits: workspace:*`. Its separate development
server needs a completed library build:

```sh
pnpm build:lib
pnpm --filter @audiobits/vanilla dev
```

## Root commands

| Command             | Behavior                                                         |
| ------------------- | ---------------------------------------------------------------- |
| `pnpm dev`          | Initial library build, library watch, and site server            |
| `pnpm build:lib`    | Library ESM and declarations                                     |
| `pnpm build:site`   | Library build followed by site build                             |
| `pnpm build`        | Library, site, and vanilla production builds                     |
| `pnpm typecheck`    | Build library, generate site types, check all workspaces         |
| `pnpm lint`         | ESLint, formatting, and relative Markdown file-target checks     |
| `pnpm format`       | Format in-scope source/configuration/onboarding files            |
| `pnpm test`         | Supervisor and pure recipe/runtime tests; schema drift check     |
| `pnpm test:package` | Build, lint, pack, isolated install/import/typecheck             |
| `pnpm test:browser` | Production builds, Chromium audio signal/lifecycle and UI checks |

For browser checks, install the browser matching the pinned Playwright version:

```sh
pnpm exec playwright install chromium
pnpm test:browser
```

CI uses `playwright install --with-deps chromium` on Linux. The browser suite
starts its own site on port 3100 and vanilla preview on port 4173. Neither port
may already be occupied. Keep `NODE_ENV` unset for normal local commands; an
unrelated value can interfere with Next.js. CI disables Next telemetry.

## Package verification

`pnpm test:package` validates the built ESM/declaration exports with publint,
inspects the ten-file archive allowlist (metadata/license/README plus seven
build files), and installs that archive into a fresh
system temporary directory using npm offline with install scripts disabled.
The Node import and TypeScript NodeNext check use only the installed package
for library resolution. Workspace source and browser globals are not required.
The temporary consumer is removed afterward.

The isolated consumer imports validation, the lazy engine, and the separately
exported confirmation, impact, and thruster without browser globals. It also
typechecks seeded play, live updates, bus routing/delay, cut tails, and native
analyser cleanup through installed declarations. Structural schema and recipe
types are generated from `scripts/recipe-descriptor.mjs` during library build.
Use `pnpm build:lib` after descriptor edits; `pnpm test` detects generation drift.
This package check establishes consumption and pure import behavior. Audio
signal/lifecycle evidence comes from `pnpm test:browser`. The runtime has zero
runtime dependencies. The root, site, example, and runtime are all publication-guarded.

Formatting preserves the existing planning documents outside this step.
Relative Markdown checks verify file targets, not remote links or heading
anchors. Validate OpenSpec separately:

```sh
OPENSPEC_TELEMETRY=0 openspec validate --all --strict --no-interactive
```

## Independent delivery

The site consumes the local runtime without a version bump or npm publication.
`pnpm build:site` includes the library build from the same checkout. No hosting
provider, deployment credentials, npm workflow, or publication target is enabled.
Future delivery must keep [site deployment and npm releases](releases.md)
separate and label development documentation distinctly from a stable release.

## Gallery examples

The gallery at `/sounds` and its three stable sound routes keep one engine per
mounted session. The mixer remains visible while scrolling. Reset restores the
bundled recipe, primary controls, and seed 42. JSON Apply reports validation
issues and preserves last-valid playback; applying valid data stops current
voices. No JavaScript text is evaluated.

`pnpm test` typechecks every TypeScript docs fence and generated examples across
control/seed extrema through public exports. `pnpm test:browser` bundles the
exact displayed host examples, then exercises activation, Stop, and disposal
alongside signal equivalence and the gallery UI. Generated inputs/bundles and
browser artifacts stay under ignored directories. This evidence is distinct
from the maintainer-reported listening acceptance.
