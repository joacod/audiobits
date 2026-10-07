# Local development

Use [architecture](architecture.md) for system boundaries, the
[package reference](../packages/audiobits/README.md) for usage and
[validation](validation.md) for evidence expectations.

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
worker failed in the validation environment. The eight-sound gallery and recipe editor use the existing stack; optional
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

| Command                | Behavior                                                             |
| ---------------------- | -------------------------------------------------------------------- |
| `pnpm dev`             | Initial library build, library watch, and site server                |
| `pnpm build:lib`       | Library ESM and declarations                                         |
| `pnpm build:site`      | Library build followed by site build                                 |
| `pnpm build`           | Library, site, and vanilla production builds                         |
| `pnpm typecheck`       | Build library, generate site types, check all workspaces             |
| `pnpm lint`            | ESLint, formatting, and relative Markdown file-target checks         |
| `pnpm format`          | Format in-scope source/configuration/onboarding files                |
| `pnpm test`            | Supervisor, recipe/runtime/release checks; schema/metadata drift     |
| `pnpm test:package`    | Build, pack, isolated types/imports, tree-shaking and Chromium hosts |
| `pnpm test:browser`    | Production builds, three-engine audio signal/lifecycle and UI checks |
| `pnpm release:prepare` | Lint, types, units, browser suite and isolated candidate rehearsal   |
| `pnpm changeset`       | Record a scoped runtime version note                                 |

For browser checks, install the browser matching the pinned Playwright version:

```sh
pnpm exec playwright install chromium firefox webkit
pnpm test:browser
```

CI checks pull requests and pushes to main, with superseded runs cancelled; a
feature-branch push does not duplicate its pull-request run. CI uses
`playwright install --with-deps chromium firefox webkit` on Linux. The browser suite
starts its own site on port 3100 and vanilla preview on port 4173. Neither port
may already be occupied. Linux CI starts PulseAudio with a clocked null sink
so headless Firefox has an output device. Its `norewinds=1` setting limits null-sink
buffering to 50 ms instead of the default two seconds, keeping Chromium's output
clock responsive during finite playback. The sink exercises native audio
processing without establishing audible output or listening quality. Keep `NODE_ENV` unset for normal local commands; an
unrelated value can interfere with Next.js. CI disables Next telemetry.

## Package verification

`pnpm test:package` requires the Chromium binary matching pinned Playwright.
It validates built ESM/declaration exports with strict publint, checks the
14-file allowlist (runtime/declarations, schema/capabilities, manifest, license,
README, changelog and Skill/reference), and installs that archive into a fresh
system temporary directory using npm offline with install scripts disabled.
Node imports and TypeScript NodeNext checks resolve only the installed package.
They require no workspace source or browser globals.

All packaged README/Skill TypeScript examples typecheck. The exact quick-start, production lifecycle
and controlled sound hosts execute in Chromium from an ephemeral loopback server,
covering silent load, gesture activation, finite nonzero signal, Stop and context
closure. The test-owned analyser attaches on the running notification before
the example schedules playback; bounded in-page observation survives delayed
automation reads. Failure diagnostics include the example, audio clock, engine
state and voice counts. Stop polls for silence and zero owned voices rather than
assuming a fixed wall-clock delay. An unused public runtime import fully tree-shakes against a baseline.
The temporary consumer is removed afterward; successful candidate archive and
digest/evidence remain under ignored `node_modules/.cache/audiobits-release/`.

Schema, types and capabilities are generated during library build. Use
`pnpm build:lib` after descriptor or version edits; `pnpm test` detects drift.
Offline checkpoint checks require native `OfflineAudioContext.suspend/resume`
and skip explicitly when absent. Finite rendering, UI and live lifecycle checks
remain enabled. Offline cleanup waits for ended callbacks after rendering; those
callbacks never schedule audio.

The broader `pnpm test:browser` suite supplies UI, native signal, resource and
lifecycle regressions. Neither kind of automation establishes listening quality.
CI installs all three engines before the browser matrix and Chromium package check. The runtime has zero runtime
dependencies; all workspaces remain publication-guarded. See
[release preparation](releases.md) for the aggregate gate and activation boundary.

Relative Markdown checks verify file targets, not remote links or heading anchors.
Ordinary changes use the scripts above; no formal specification CLI is required.

## Independent delivery

The site consumes the local runtime without a version bump or npm publication.
`pnpm build:site` includes the library build from the same checkout. No hosting
provider, deployment credentials, npm workflow, or publication target is enabled.
Future delivery must keep [site deployment and npm releases](releases.md)
separate and label development documentation distinctly from a stable release.

## Gallery examples

The gallery at `/sounds` and its eight sound routes keep one engine per
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
