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

## Verification tiers

| Change                            | Required local evidence                                                |
| --------------------------------- | ---------------------------------------------------------------------- |
| Docs/copy only                    | `pnpm lint` (executable docs also need their consumer checks)          |
| Showcase CSS/layout               | Lint, `pnpm typecheck`, `pnpm build:site`, desktop/mobile visual check |
| Showcase interaction              | Above plus `pnpm test:browser --project=chromium`                      |
| Sound parameter tuning            | `pnpm test`, relevant signal checks, Chromium listening workflow       |
| Runtime/compiler/recipe execution | Unit, `pnpm test:package`, full `pnpm test:browser`                    |
| Browser lifecycle/native interop  | Full browser matrix                                                    |
| Package exports/build             | `pnpm test:package` and full matrix for browser-facing changes         |
| CI/browser harness                | Scope-selection tests and full browser matrix                          |
| Explicit release candidate        | `pnpm release:prepare`                                                 |

Tier 1 is the independent `quality` CI job: lint/format, types, unit/contract and
generated-artifact drift checks, then production builds and strict publint. It runs on every PR.
Tier 2 is `chromium-integration`: representative integration plus the existing
packed Chromium consumer. Tier 3 adds Firefox and WebKit for browser/runtime,
harness and infrastructure changes, and every push to main. Together with Tier 2
this is the full matrix. Tier 4 is the explicitly invoked release gate, including
artifact inventory and digest evidence; ordinary tasks do not default to it.

[Scope selection](../scripts/ci/select-checks.mjs) uses repository-owned paths:
showcase and bundled parameter changes select Chromium, Markdown-only contributor
docs select no browsers, and unknown paths conservatively select every engine.
The route audio host, native analyser tap and raw browser host also select every
engine. Mixed changes take the strongest selection. Executable packaged docs select the
packed Chromium consumer. Runtime behavior introduced while tuning requires the
full matrix locally even if its file path looks like ordinary tuning. Configure
branch protection for `quality` and the applicable integration checks; the workflow
does not change repository protection settings.

CI cancels superseded runs and avoids duplicate feature-branch push runs. Each
browser job installs only its matching engine. The suite owns ports 3100 and
4173; neither may already be occupied. [Linux audio setup](../scripts/ci/setup-linux-audio.sh)
provides PulseAudio with a clocked null sink. `norewinds=1` bounds buffering to
50 ms instead of two seconds. This supplies a deterministic output clock, not
physical speakers or listening evidence. Keep environment setup in that script.

### Flake investigation

A first-run failure cannot become green through retry: CI uses one diagnostic
retry, `failOnFlakyTests`, and a retained first-failure trace. Failed jobs upload
bounded browser artifacts for seven days. Healthy runs retain no traces.

Isolate and repeat the failing case, classify it as a product race, test race,
capability difference, environment deficiency or infrastructure instability,
then identify and fix the violated invariant. Add deterministic reproduction
where possible; rerun the narrow check before broader evidence.

```sh
pnpm exec playwright test tests/browser/gallery.spec.ts --project=chromium --repeat-each=5
```

Do not fix flakes with arbitrary sleeps, larger global timeouts, more retries,
removed/weaker assertions, catch-and-ignore, force-clicks, browser-name skips,
disabled tests or blanket serialization. Capability skips must document an actual
unavailable capability outside the compatibility promise and retain meaningful
fallback coverage. The gallery hydration regression holds client JavaScript to
prove stateful SSR controls cannot accept input before hydration owns their state.

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
CI installs the engines selected by the evidence tier. The runtime has zero runtime
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
