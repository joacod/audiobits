# Local development

Use [architecture](architecture.md) for system boundaries, the
[website documentation](https://www.audiobits.dev/docs) for usage and
[validation](validation.md) for evidence expectations.

## Setup

Use the Node version in [.node-version](../.node-version) and the pnpm version
in [package.json](../package.json). Direct
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

The site uses Next.js with webpack and Fumadocs MDX. Website dependencies stay
in `apps/www`; the runtime remains framework-independent.

## Website agent tooling

For catalog sound and experience work, `apps/www` consumes the canonical
[AudioBits Skill](../skills/audiobits/SKILL.md) through its local
`.agents/skills/audiobits` symlink. Start the agent in `apps/www` for scoped Skill
discovery. Website agent rules also link the Skill directly for sessions started
at the monorepo root. Other repository work does not require the Skill.

AudioBits MCP is optional. With the repository's supported Node selected, build
the runtime from the root, then print the website's stdio launch settings:

```sh
pnpm build:lib
node skills/audiobits/scripts/setup-mcp.mjs --project apps/www
```

Register the printed command and arguments through your agent harness. For
Codex, use a local `apps/www/.codex/config.toml` registration and start the chat
in `apps/www`. That file is ignored because it contains machine-specific paths.
Reload the client and use `inspect_project` to confirm the website's installed
runtime. Existing public-API checks remain available without MCP.

Use the bundled Skill executable to exercise the same tooling external consumers
receive. After changing MCP implementation, run `pnpm build:skill` and
`pnpm check:skill`, then reconnect the server. Read catalog source directly while
editing; refresh the reviewed snapshot after committing catalog changes as
described in [MCP development](../tools/mcp/README.md#offline-metadata-and-explicit-source-review).

## Local package edits

Edit canonical definitions in `catalog/recipes/<id>/recipe.ts`. Catalog files
are application-owned source outside the npm package; the website imports them
directly. Reload `/catalog`, open that sound's workbench and expand Recipe, and
inspect updated JSON before Play. The site uses `transpilePackages` and imports
`audiobits` through public exports pointing to `dist`; it never aliases library
source. A refresh is the supported verification path; state-preserving hot
updates are not promised.

The vanilla example also uses `audiobits: workspace:*`. Its separate development
server needs a completed library build:

```sh
pnpm build:lib
pnpm --filter @audiobits/vanilla dev
```

## Root commands

| Command                   | Behavior                                                             |
| ------------------------- | -------------------------------------------------------------------- |
| `pnpm dev`                | Initial library build, library watch, and site server                |
| `pnpm build:lib`          | Library ESM and declarations                                         |
| `pnpm build:mcp`          | Independent local stdio MCP server build                             |
| `pnpm build:skill`        | Bundle optional MCP executable and licenses into the official Skill  |
| `pnpm check:skill`        | Fail on stale committed Skill executable or dependency licenses      |
| `pnpm build:site`         | Library build followed by site build                                 |
| `pnpm build`              | Library, site, and vanilla production builds                         |
| `pnpm typecheck`          | Build library, generate site types, check all workspaces             |
| `pnpm lint`               | ESLint, formatting, Markdown/MDX files and documentation routes      |
| `pnpm format`             | Format in-scope source/configuration/onboarding files                |
| `pnpm test`               | Supervisor, recipe/runtime/release checks; schema/metadata drift     |
| `pnpm test:package`       | Build, pack, isolated types/imports, tree-shaking and Chromium hosts |
| `pnpm test:mcp`           | Offline MCP units and stdio protocol with packed external runtime    |
| `pnpm test:mcp:github`    | Explicit live GitHub source retrieval through the MCP protocol       |
| `pnpm verify:local`       | Shared non-browser CI preflight, including library build             |
| `pnpm hooks:install`      | One-time local staged formatting/lint hook installation              |
| `pnpm test:browser:smoke` | Build and run critical Chromium tests, fail fast                     |
| `pnpm test:browser:full`  | Build and run all retained Chromium regressions                      |
| `pnpm test:browser`       | Compatible alias for full Chromium verification                      |
| `pnpm release:prepare`    | Explicit release only: quality, Chromium and package rehearsal       |
| `pnpm changeset`          | Record published-package changes, including relevant docs/metadata   |

For stdio client setup and the consumer project boundary, see
[local MCP development](../tools/mcp/README.md).

For browser checks, install the browser matching the pinned Playwright version:

```sh
pnpm exec playwright install --only-shell chromium
pnpm test:browser:smoke
```

## Local hooks and preflight

Run `pnpm hooks:install` once per clone with the supported Node and pnpm on PATH.
The repository-local pre-commit hook uses Git, Node, ESLint and Prettier, without
an extra framework. It checks relevant staged contents, including partially
staged files, without rewriting or staging edits. Deleted and ignored files are
excluded. Format/lint failures require fixing and staging the intended changes.
An existing custom `core.hooksPath` is preserved; integrate
`node scripts/check-staged.mjs` there instead. Uninstall with
`git config --local --unset core.hooksPath` if it points to `.githooks`.
The hook uses a POSIX shell (macOS/Linux or Git's shell); other environments have
not been verified. No slow pre-push hook is installed.

Before code PRs, run `pnpm verify:local` and affected browser/package checks.
CI uses the same preflight. For prepared, unchanged outputs, `:prepared` commands
avoid rebuilding: run `pnpm prepare:browser` once, then
`pnpm test:browser:smoke:prepared`, `pnpm test:browser:full:prepared` or a focused
`pnpm exec playwright test <file>`. `pnpm test:package:prepared` requires a current
library build. These shortcuts never check output freshness; rebuild after
source changes. CI keeps two workers to bound native audio/graphics contention.

## Verification by task

Run the smallest check set that can falsify the requested change. Build the
library before consumers; reuse passing builds unless subsequent edits invalidate
those outputs.

| Change                | Verification                                                         |
| --------------------- | -------------------------------------------------------------------- |
| Prose/docs            | `pnpm lint`; relevant docs/build or executable-example check         |
| Visual CSS/layout     | Lint, `pnpm typecheck`, `pnpm build:site`, focused visual inspection |
| Website interaction   | Above plus affected Chromium test(s)                                 |
| Sound tuning          | Focused unit/signal checks; affected Chromium behavior               |
| Runtime/compiler      | Focused units plus affected Chromium integration                     |
| Package exports/build | `pnpm test:package` (includes static verification)                   |
| CI harness            | Directly affected script checks and Chromium tests                   |
| Explicit release      | `pnpm release:prepare`; see [release guide](releases.md)             |

Follow the [browser policy](validation.md#browser-policy). Do not provision
compatibility infrastructure or investigate unrelated failures for ordinary work.
Full release preparation is reserved for an explicit release request.

Pull requests run quality/build, packed consumers and Chromium smoke checks.
Pushes to `main` run quality; the release gate retains full Chromium verification.
[Test selection and tiers](validation.md#test-selection) are authoritative.
The independent package publication flow is described in the
[release guide](releases.md).

The browser suite owns ports 3100 and 4173; neither may already be occupied.
[Centralized Linux audio setup](../scripts/ci/setup-linux-audio.sh) provisions
PulseAudio with a clocked null sink. `norewinds=1` bounds buffering to 50 ms.
Run it before Chromium checks on Linux to provide the output clock.
Do not duplicate setup or workarounds inside individual tests. CI retains failure
traces and uploads browser artifacts for seven days; healthy runs retain no traces.

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
package archive allowlist (runtime/declarations, schema/capabilities, manifest, license,
README and changelog), and installs that archive into a fresh
system temporary directory using npm offline with install scripts disabled.
Node imports and TypeScript NodeNext checks resolve only the installed package.
They require no workspace source or browser globals.

The packaged README and GitHub README quick starts typecheck and execute in
Chromium from an ephemeral loopback server, covering silent load, gesture activation, finite nonzero signal,
Stop and context closure. An unused runtime import fully tree-shakes against a
baseline. The temporary consumer is removed afterward; the archive and evidence
remain under ignored `node_modules/.cache/audiobits-release/`.

Schema, types and capabilities are generated during library build. Use
`pnpm build:lib` after descriptor or version edits; `pnpm test` detects drift.
Offline checkpoint checks require native `OfflineAudioContext.suspend/resume`
and skip explicitly when absent. Finite rendering, UI and live lifecycle checks
remain enabled. Offline cleanup waits for ended callbacks after rendering; those
callbacks never schedule audio.

The broader `pnpm test:browser` suite supplies UI, native signal, resource and
lifecycle regressions. CI installs Chromium and uses the centralized Linux audio
setup. The runtime has zero runtime dependencies; only the runtime workspace is
publishable. See
[release preparation](releases.md) for the aggregate gate and activation boundary.

Documentation link checks verify relative Markdown/MDX files, literal MDX hrefs,
and public `/docs` destinations derived from the Fumadocs source folders.
Folder groups remain pathless. Fenced code, inline code, external URLs and heading
anchors are excluded; dynamic JSX destinations and other site routes are outside
this check.
Ordinary changes use the scripts above; no formal specification CLI is required.

## Independent delivery

The site consumes the local runtime without a version bump or npm publication.
`pnpm build:site` includes the library build from the same checkout. Website
delivery and npm publishing are independent. The website displays the package
version from the manifest.

## Catalog examples

Copy-owned interactive sources live in `catalog/experiences/`. Edit their
recipe or sound controller there; keep host, input adapters and demo files
separate. `apps/www` imports these sounds while owning website presentation. The
[GitHub source registry](../catalog/README.md) installs minimal recipes and
sound controllers with integration guidance as owned source. Repository demos
remain separate from installation.
`registry.json` owns discovery metadata and installation file manifests; website
metadata is derived from it. No creative recipes are generated into the runtime.

`pnpm test:package` keeps deterministic manifest/source checks for every registry
item. It also uses the exact-pinned shadcn CLI to build registry payloads from
the local checkout and run real `add` commands in separate framework-free
consumers. It checks installed paths and bytes, requires only the packed
`audiobits` dependency, and rejects framework or component configuration added
by installation. No GitHub registry request is needed for PR coverage.

The check compiles every registry item's canonical integration, usage and
edited-recipe examples at control and seed extrema, and public documentation
and Skill snippets against the packed public package and actual installed source. It also executes
three official Skill examples: Confirmation, sustained Thruster and Lightsaber.
It retains recipe validation, silent load, gesture activation, signal, update,
Stop, and disposal checks for all installed integrations in Chromium, along with
the three repository demonstration entrypoints. Output and retained evidence
distinguish manifest/source validation, exact consumer snippets, actual shadcn
installation, and browser/runtime verification.

For an explicit network integration check, run
`pnpm test:package:github --revision=<reviewed-full-SHA>` from a clean checkout
at that published commit. This uses `owner/repo/item#<SHA>` for every registry
item and runs the same consumer checks. It rejects missing refs, a revision
different from the checkout, and dirty source; it never substitutes `main`.
The installer output reports the CLI version, source commit, and items tested.
Run `pnpm test:package:latest` separately to exercise the same consumer checks
with actual `npx shadcn@latest`, keeping the CI lock internal. Add
`--github --revision=<reviewed-full-SHA>` from that clean, published checkout
to verify the documented GitHub journey. This requires network access.
GitHub resolution remains an external integration check, separate from required
PR coverage. The site browser tests verify displayed catalog source and UI
interaction/lifecycle behavior.

`/catalog` keeps one engine for the catalog sound rows. The output strip is a
desktop row and a compact mobile dock. Install and usage actions precede the
collapsed Recipe editor; Copy usage uses accepted recipe data, current parameters and
seed. `/catalog/[slug]` uses that same session contract for one catalog sound. Each mounted workbench owns one engine and
disposes it when the visitor leaves the entry. Restore in the Recipe section
restores the catalog recipe, primary controls and seed 42; Reset variation
changes only the seed. JSON Apply reports validation issues and preserves
last-valid playback; applying valid data stops current voices. No JavaScript
text is evaluated.

`pnpm test` typechecks every TypeScript docs fence and generated examples across
control/seed extrema through public exports. `pnpm test:browser` bundles the
exact displayed host examples, then exercises activation, Stop, and disposal
alongside catalog signal checks and the catalog UI. Generated inputs/bundles and
browser artifacts stay under ignored directories.
