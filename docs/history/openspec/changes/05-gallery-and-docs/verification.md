# Step 05 verification

Status: implemented with local automated evidence and maintainer manual
acceptance. The maintainer confirmed manual validation on 2026-10-06. This change is not archived. Step 06 has not started.

## Scope and decisions

The home page and `/sounds` provide three curated cards, with stable routes for
confirmation, impact, and thruster. Shared navigation, restrained theme tokens,
labelled controls, visible focus, primary reset, seed, and current-value copy
support keyboard use and narrow layouts. The sticky mixer keeps mute, effects
volume, Stop all, shared delay, and audio/error state visible while scrolling.
Each mounted gallery owns one engine; navigation between sound views disposes
it. Hide invalidates pending startup, cuts tails, and suspends. Return requires
a fresh Play gesture. Failed activation shows Retry Play and can recover.

The editor bounds UTF-8 text to 32 KiB before JSON parsing. It displays at most
ten path-specific diagnostics from the public validator. Invalid JSON, unknown
fields, unsupported schema values, and oversized input preserve the last valid
sound. Curated cards require their existing playback kind and primary parameter
range/default/mode. Additional parameters use recipe defaults. Valid Apply
stops playback and replaces/disposes the old sound. Reset/Restore restores the
bundled recipe, seed 42, and primary control defaults. No recipe text is
executed as JavaScript.

Copies contain the entire accepted recipe, current parameters, and next-play
seed with activation, hide, Stop, and disposal setup. They intentionally use
the default dry route separately from gallery mixer settings. Raw Web Audio
comparisons use the bundled definitions, including the same seeded noise,
loop seam, stereo panning, headroom, live smoothing, release and filter allowance.
Edited recipes retain the AudioBits example; their bundled raw comparison is
hidden until Restore. Shared delay and voice stealing are outside the disclosed
single-voice comparison. Both displayed host implementations are typechecked
and exercised, rather than maintaining a separate illustrative snippet.

Fumadocs provides Quick start, Recipes, Playback and lifecycle, Parameters,
Buses and effects, Native interop, and API reference. Documentation fences
compile against public exports. Normal API navigation contains no planning
material. Build metadata identifies the local package version/source, with
Unreleased for private/0.0.0 packages and Development for other local versions.
No production build is automatically labelled stable; a release-aligned stable
site remains a separate release/publication decision.

## Executed checks

Local macOS arm64, pnpm 12.9.1, TypeScript 6.0.3, OpenSpec 1.14.0,
Playwright 1.63.0, Chromium 153.0.8010.12. The available command runtime was
Node 24.2.0, below the repository's pinned/minimum 24.21.0. The pinned Node
version was not available locally; repeat verification under it before treating
this as pinned-toolchain or release evidence. No dependency or engine setting
was changed to hide this mismatch. Production builds used `NODE_ENV=production`
and `NEXT_TELEMETRY_DISABLED=1`; the watch loop used `NODE_ENV=development`.

| Command/check | Result |
| --- | --- |
| `pnpm lint` | ESLint, formatting, and relative Markdown file targets passed |
| `pnpm typecheck` | Runtime, site, and vanilla types passed |
| `pnpm test` | 43 tests passed, including docs/example compilation and generated schema drift |
| `pnpm build:site` | Production site and public library build passed; 14 static pages generated |
| `pnpm test:browser` build phase | Library, site, vanilla, and both browser bundles built; default localhost bind blocked by sandbox |
| `pnpm exec playwright test --config node_modules/.cache/step05-browser.config.mjs` | 25 Chromium checks passed against the production build on isolated local ports |
| `OPENSPEC_TELEMETRY=0 openspec validate --all --strict --no-interactive` | Seven changes passed |
| `git diff --check` | Passed |

The ordinary browser command could not bind localhost within the sandbox.
After local-port access, the default vanilla port was occupied. Its existing
server was preserved. An ignored temporary config and transpiled copies of the
same specs changed only site/vanilla URL ports to 3105/4175. All 25 checks then
passed. The tracked default scripts/config remain unchanged. These temporary
files are local diagnostics, not public repository content.

The compilation check covers six TypeScript docs fences plus 54 generated
AudioBits/raw combinations over the three controls and seeds 0, 42, and
4294967295. Chromium exercises all six exact displayed host implementations
through gesture activation, Stop, and disposal, ending with six closed contexts.
Gallery checks cover silent load, one context, applied/invalid recipe handling,
current copy values, reset, invalid seeds, keyboard sliders/buttons/disclosure,
failed activation/retry, route disposal, reduced-motion mode, docs links, valid
sound routes, and unknown-route 404. Previous native signal/resource and
visibility/late-resume regressions continue to pass.

## Native comparison and presentation evidence

Raw and managed dry signals were compared in 68 scenarios at 44100 and 48000 Hz:
all three sounds, controls 0/0.5/1, seeds 0/42/4294967295, early Stop, pre-onset
cancellation, and rapid live thruster retargets. Every sample was finite; largest
absolute sample difference was 4.554749466478825e-9. Every late window after
1.6 seconds was exactly silent. This establishes the tested native signal
comparison, not perceptual quality or all browser/sample-rate equivalence.
The first comparison exposed omitted stereo panning in the standalone example;
adding the matching panner resolved it.

A development supervisor run used the existing initial-build/watch/site commands
with an isolated site port. A temporary confirmation layer ID edit reached the
gallery's recipe editor after watcher output and reload. Restoring the exact
source also reached the editor; the runtime source has no final diff. The
supervisor and its children were stopped afterward. Refresh is the supported
loop; state-preserving hot updates are not promised. Development screenshot
capture caused a caret-style hydration warning during capture; production
checks had no page errors. This is not a claimed clean hot-update guarantee.

Desktop 1280×960 and narrow 390×844 layouts were visually inspected. Chromium
keyboard checks ran at the narrow viewport with reduced motion enabled and no
horizontal document overflow. This is layout evidence, not mobile-browser
support. No animation or analyser visualization was justified; no second audio
context, microphone access, or visualization dependency was added. Existing
Base UI primitives and native controls supply the interaction; no third-party
component source was copied and no additional attribution notice was required.
The standalone comparison is original repository MIT code.

Production client-reference/build manifests were measured with deduplicated
route and shared JavaScript files, excluding polyfills, CSS, HTML, source maps,
and network protocol overhead. Gzip counts sum independently compressed files:

| Route | JS files | Bytes | Gzip bytes |
| --- | --- | --- | --- |
| `/` and `/sounds` | 10 each | 531609 | 162413 |
| `/sounds/[slug]` | 10 | 531609 | 162413 |
| `/docs/[[...slug]]` | 15 | 752800 | 237921 |

These are current build measurements, not a previous-build delta or actual
browser transfer trace. Optional visualization integration adds no dependency
or executable visualization bytes. Raw example source is 9641 bytes and is
passed as display text, not executed by the gallery.

## Listening acceptance and remaining gaps

Only the previously accepted confirmation, impact, and thruster definitions
are included; no extra recipe was added. Prior core listening acceptance remains
in Steps 02–04. On 2026-10-06, after the Step 05 listening checklist was presented,
the maintainer reported that the gallery was manually validated. This is
maintainer-reported acceptance, separate from automated evidence. No browser,
output-device details, or individual sound observations were supplied; none are
inferred from the acceptance.

| Sound | Prior core evidence | Step 05 gallery listening |
| --- | --- | --- |
| Confirmation | Step 02 maintainer acceptance | Maintainer-reported gallery acceptance; no individual observations supplied |
| Impact | Step 03 maintainer acceptance | Maintainer-reported gallery acceptance; no individual observations supplied |
| Thruster | Step 03 maintainer acceptance; Step 04 mixing acceptance | Maintainer-reported gallery acceptance; no individual observations supplied |

The presented review checklist covered confirmation Play/reset; impact at 0,
0.5, and 1; sustained thruster throttle changes and Stop/reset; shared delay,
volume, mute/unmute, and Stop all; and absence of unexpected replay on
navigation/hide/return. The maintainer's overall acceptance completes Task 3.2;
it is not an independently observed record of each checklist item. Automated
checks cannot establish audible quality. Recheck with pinned Node
24.21.0 before release. Physical device interruption, other browsers, hosted CI,
and a clean checkout install were not exercised.

## Public review and exclusions

Reviewed all changed/new site components, raw/code generators, docs pages,
browser/unit checks, build script, instructions, roadmap, and OpenSpec records.
Focused scans found no credentials, personal absolute paths, private repository
links, or conversation logs. Relative repository Markdown targets resolve;
docs route links are exercised in Chromium. Generated Next agent files from
local development were preserved outside the repository. Screenshots, generated
example inputs, browser profiles, and builds remain outside tracked content.

Runtime APIs, bundled recipe data, vanilla application source, package versions,
dependencies, lockfile, root README, and Step 06 are unchanged. No package test
rerun was required for unchanged package output. No branch, commit, push, PR,
archive, deployment, npm publication, or outbound message was performed.
All Step 05 tasks are checked, including maintainer manual acceptance.
Stop at this change's review boundary; do not start Step 06 automatically.

## Changed files

- Site: `apps/www/app/confirmation-demo.tsx`, `gallery-page.tsx`, `recipe-tools.tsx`,
  `page.tsx`, `layout.tsx`, `globals.css`, and `sounds/page.tsx` plus
  `sounds/[slug]/page.tsx`.
- Site helpers: `apps/www/lib/gallery.ts`, `raw-example.ts`, and `site-build.ts`.
- Public MDX: `apps/www/content/docs/index.mdx`, `recipes.mdx`, `lifecycle.mdx`,
  `parameters.mdx`, `buses.mdx`, `native.mdx`, and `api.mdx`.
- Checks: `scripts/build-audio-tests.mjs`, `scripts/site-examples.test.ts`,
  `tests/browser/audio-harness.ts`, `foundation.spec.ts`, and `gallery.spec.ts`.
- Project records: `AGENTS.md`, `docs/development.md`, `docs/roadmap.md`,
  `docs/website.md`, and this change's design, tasks, and verification.

## CI delay-fixture follow-up

The supplied CI log for commit `29cdaa7` used Ubuntu and pinned Node 24.21.0
with Chromium 153.0.8010.12. It reports 24 browser checks passing and the
shared-delay cut signal check failing on both attempts. This is evidence from
provided CI output, not a separately fetched or subsequently green run.

The old fixture invoked cut from a source's main-thread `onended` callback.
Offline rendering could advance before that callback was delivered. A local
250 ms busy-thread reproduction retained tail energy 0.4907506777059492 instead
of cutting it and also missed the natural-tail cap checkpoint. The correction
pauses the native offline renderer at explicit audio-clock checkpoints for
natural-tail scheduling and cut. During cut only, a test-only context adapter
reports running state so the runtime's 5 ms fade branch executes while rendering
is paused. Audio nodes, automation, and sample generation remain native; the
running-state selection is simulated. This replaces the old fixture's claim of
an entirely native running-context cut operation. Runtime behavior is unchanged.

The regression deliberately delays the host thread by 50 ms. It checks actual
cut time within one 128-frame render quantum of 0.4 seconds, positive energy
during the 5 ms fade, exact silence in the subsequent tail window, and the
unchanged natural-tail cap. Local cuts occurred at 0.4005442176870748 seconds at
44.1 kHz and 0.4 seconds at 48 kHz; cut tail energy and late peaks were zero.

`node scripts/build-audio-tests.mjs` and `pnpm lint` passed. The focused command
`pnpm exec playwright test --config node_modules/.cache/step05-browser.config.mjs --grep 'adapted running cut' --repeat-each=10`
passed all ten repetitions using the previously documented isolated ports and
available local Node 24.2.0. These are 40 native renders, with the running-state
adapter explicitly identified above. The corrected full CI run remains pending.
No library, gallery, dependency, workflow, or Step 06 change accompanies this fix.
