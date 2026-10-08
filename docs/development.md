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
sound's workbench and Recipe tab, and inspect the updated JSON before Play. The site
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
| `pnpm test:browser`    | Production builds, Chromium audio signal/lifecycle and UI checks     |
| `pnpm release:prepare` | Explicit release only: quality, Chromium and package rehearsal       |
| `pnpm changeset`       | Record a scoped runtime version note                                 |

For browser checks, install the browser matching the pinned Playwright version:

```sh
pnpm exec playwright install chromium
pnpm test:browser
```

## Verification by task

Run the smallest check set that can falsify the requested change. Build the
library before consumers; reuse passing builds unless subsequent edits invalidate
those outputs.

| Change                | Verification                                                         |
| --------------------- | -------------------------------------------------------------------- |
| Prose/docs            | `pnpm lint`; relevant docs/build or executable-example check         |
| Visual CSS/layout     | Lint, `pnpm typecheck`, `pnpm build:site`, focused visual inspection |
| Website interaction   | Above plus affected Chromium test(s)                                 |
| Sound tuning          | Focused unit/signal checks; Chromium and listening when relevant     |
| Runtime/compiler      | Focused units plus affected Chromium integration                     |
| Package exports/build | `pnpm test:package` (includes static verification)                   |
| CI harness            | Directly affected script checks and Chromium tests                   |
| Explicit release      | `pnpm release:prepare`; see [release guide](releases.md)             |

Prerelease verification target: current Chromium. Other browsers and operating
systems are unverified and deliberately deferred. Do not provision compatibility
infrastructure or investigate unrelated failures for ordinary work. Full release
preparation is reserved for an explicit release request.

PR CI runs one quality job: install, lint, typecheck, unit/contract and generated
artifact checks, production build and strict publint. Pushes to `main` run the
same quality job plus a separate Chromium integration job. Normal CI has no
path routing, browser matrix or packed-package rehearsal. Configure PR branch
protection around quality; Chromium integration runs after merges to `main`.
Candidate workflows are manual and remain separate from normal CI. The
[production release workflow](releases.md) creates Version Packages PRs and
stages verified npm archives for human 2FA approval.

The browser suite owns ports 3100 and 4173; neither may already be occupied.
[Centralized Linux audio setup](../scripts/ci/setup-linux-audio.sh) provisions
PulseAudio with a clocked null sink. `norewinds=1` bounds buffering to 50 ms.
Run it before Chromium checks on Linux. This provides an output clock, not
physical speakers or listening evidence. Do not duplicate setup or workarounds
inside individual tests. CI retains failure traces and uploads browser artifacts
for seven days; healthy runs retain no traces.

### Flake investigation

A flaky test is a failed test. Playwright uses zero retries locally and in CI.

1. Isolate the failing test and reproduce it intentionally.
2. Classify the failure as a product race, test race, CI environment issue or
   unsupported capability.
3. Identify the violated invariant and fix that layer.
4. Add deterministic regression coverage where practical.
5. Run the smallest evidence needed to validate the fix.

```sh
pnpm exec playwright test tests/browser/gallery.spec.ts --project=chromium --repeat-each=10
```

The pre-hydration slider regression is the model: hold client JavaScript to prove
stateful SSR controls cannot accept input before hydration owns their state.
Do not hide failures with `page.waitForTimeout`, arbitrary sleeps, global timeout
increases, automatic retries, weaker/removed assertions, caught/ignored failures,
force-clicks through invalid states, Chromium skips, errors turned into warnings,
disabled tests, unrelated-test serialization or compatibility hacks. Any such
change requires explicit justification tied to actual system behavior.

Keep `NODE_ENV` unset for normal local commands; unrelated values can interfere
with Next.js. CI disables Next telemetry.

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
CI installs Chromium and uses the centralized Linux audio setup. The runtime has zero runtime
dependencies; only the runtime workspace is publishable. See
[release preparation](releases.md) for the aggregate gate and activation boundary.

Relative Markdown checks verify file targets, not remote links or heading anchors.
Ordinary changes use the scripts above; no formal specification CLI is required.

## Independent delivery

The site consumes the local runtime without a version bump or npm publication.
`pnpm build:site` includes the library build from the same checkout. Site hosting
and deployment remain unconfigured. The
[release workflow](releases.md) stages npm packages for manual approval; website
deployment remains separate. Label development documentation distinctly from a
stable release.

## Gallery examples

The gallery at `/sounds` and its eight sound routes keep one engine per
mounted session. The audio monitor stays in a desktop rail or compact mobile
dock. Restore in the workbench Recipe tab restores the bundled recipe, primary
controls and seed 42; Reset variation changes only the seed. JSON Apply reports validation
issues and preserves last-valid playback; applying valid data stops current
voices. No JavaScript text is evaluated.

`pnpm test` typechecks every TypeScript docs fence and generated examples across
control/seed extrema through public exports. `pnpm test:browser` bundles the
exact displayed host examples, then exercises activation, Stop, and disposal
alongside signal equivalence and the gallery UI. Generated inputs/bundles and
browser artifacts stay under ignored directories. This evidence is distinct
from the maintainer-reported listening acceptance.
