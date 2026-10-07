# Step 02 verification

Status: recipe playback implemented; local automated checks and maintainer
manual verification passed. The maintainer confirmed manual verification on
2026-10-06. Browser/version and listening output were not supplied. This change
is not archived; Step 03 has not started.

## Implemented scope

- `scripts/recipe-descriptor.mjs` is the finite structural authority. The build
  generates readonly recipe types and frozen schema metadata in
  `packages/audiobits/src/recipe/generated.ts`, plus `schema.json`. Tests check
  generation drift. Validation adds bounded input inspection, aggregate budgets,
  unique layer IDs, and timeline checks without browser globals.
- Accepted recipes are copied, sorted by object key, and deeply frozen. Internal
  plans preserve layer order, normalize a minimum 2 ms attack, and convert dB to
  linear amplitude. Deferred schema forms are rejected rather than accepted as
  placeholders. Playback checks source/filter frequencies against Nyquist
  before allocating or stealing resources.
- `createAudio()` stays lazy. Startup creates and resumes the owned context
  synchronously in the gesture path, shares pending operations, reports failures,
  and permits retry. A native resume that remains pending has a two-second
  activation deadline. This wall-clock deadline never schedules sound.
  Disposal rejects pending starts immediately and closes the context once.
- Each successful play builds independent oscillators, layer/recipe filters,
  envelopes, output gain, and pan. Gate, frequency automation, release, and
  source stops use context time. Stop holds the current gain before release;
  zero decay ramps directly to sustain. Future cancellation is silent.
- Sources and connections are finalized after natural completion. Filters have
  a bounded 50 ms tail allowance and output ends with a 5 ms fade. Explicit
  sound/engine disposal finalizes immediately. Suspension finalizes records
  without depending on future `onended` events or audio-clock progress.
- Defaults are 32 active reservations per engine, eight per sound, and -12 dB
  master gain. Oldest-voice stealing fades for 5 ms; at most one retiree exists
  beyond each applicable limit. A further steal finalizes the previous retiree.
  Ordinary stopped voices keep reservations until their release ends.
- The confirmation fixture uses the study's two sine layers and lowpass values.
  Automated measurements support its default headroom; the maintainer confirmed
  manual verification. Curated data is exported separately through
  `audiobits/recipes`, with JSON Schema at `audiobits/schema.json`.
- The site and vanilla consumer use public package exports, with Play, mute,
  Stop all, state/error feedback, no page-load playback, and teardown. Development
  documentation describes the executable subset and keeps future APIs proposed.

## Baseline and executed checks

Local macOS arm64: Node 24.21.0, pnpm 12.9.1, OpenSpec 1.14.0,
Playwright 1.63.0, Chromium 153.0.8010.12. The pinned toolchain was selected
without changing global installations or dependencies. Production checks used
`NODE_ENV=production`; the final browser run disabled Next telemetry.

| Command | Result |
| --- | --- |
| `pnpm lint` | ESLint, formatting, and relative Markdown file-target checks passed |
| `pnpm typecheck` | Runtime, site, and vanilla types passed, including generated site types |
| `pnpm test` | 25 tests passed: six existing supervisor tests and 19 recipe/runtime checks; schema drift check passed |
| `pnpm test:package` | Strict publint, ten-file archive allowlist, isolated offline install, NodeNext consumer types, and browser-free Node imports passed |
| `pnpm test:browser` | Library/site/vanilla production builds and eight Chromium checks passed |
| `OPENSPEC_TELEMETRY=0 openspec validate --all --strict --no-interactive` | Seven changes passed |
| `git diff --check` | Passed |

The packed archive contains metadata, README, LICENSE, two public entry modules
and their declarations, shared validation/declaration chunks, and JSON Schema.
The external consumer imports validation, a lazy engine, and confirmation data
with neither `window` nor `AudioContext`. No workspace-source fallback or runtime
dependency is required. Package verification is local, not npm release evidence.

## Pure and mocked evidence

Pure checks cover versions/unknown fields, cycles, accessors, prototypes,
nonfinite values, sparse/extended arrays, input/issue budgets, deferred forms,
aggregate filter/point budgets, timelines, immutable snapshots, deterministic
normalization, envelope math, and Nyquist checks.

Mocked lifecycle checks cover synchronous creation/resume, shared starts,
rejection and timeout retry, immediate cancellation of unresolved startup,
partial allocation recovery, disposal races, independent/future voices,
release from current attack, repeated Stop, sound disposal, native state mapping,
mute ramps, partial graph cleanup, and 500 repeated plays with resource bounds.
These establish control flow and ownership; they do not establish audible quality.

## Chromium evidence

Browser checks cover the three existing foundation scenarios plus:

- Offline signal, eight-voice overlap, silent pre-onset cancellation, and Stop
  during attack. The release test pauses offline rendering at 40 ms, retargets
  the envelope/output from their current values, then resumes. It verifies
  energy during release, silence after completion, and bounded sample jumps.
- Native overlap/completion, future cancellation, 300-play stress, suspension,
  disposal while suspended, and a pending-resume disposal race. Resume rejection
  and the pending race are explicitly injected; graphs and contexts are native.
- Real autoplay blocking from a page-load script in a fresh Chromium instance
  using `--autoplay-policy=document-user-activation-required`. The native resume
  remains suspended, startup reports its deadline error, and a subsequent button
  gesture resumes, plays, finishes, and disposes without replaying old input.
- Site gesture/mute/Stop controls and client-side route teardown closing the
  owned native context; vanilla gesture and controls through built exports.

Offline rendering used mono output at 48000 Hz, onset at 50 ms, default -12 dB
master gain, and simultaneous identical voices:

| Measurement | One voice | Eight voices |
| --- | --- | --- |
| Absolute peak | 0.0435723 | 0.3485785 |
| Sum of squared samples | 1.5023317 | 96.1492258 |
| Peak before onset | 0 | 0 |
| Peak after 375 ms | 0 | 0 |
| Finished graphs | 1 | 8 |

Every sample was finite. Cancelled output had zero energy. The attack-stop
fixture retained 0.0030734 squared-sample energy in its release window, became
silent after 100 ms, and had a maximum adjacent-sample jump of 0.0004755.
These are signal measurements, not a listening-quality or arbitrary-mix guarantee.

## Listening review and gate

The maintainer confirmed manual verification of the local confirmation preview
on 2026-10-06 after the requested single/repeated playback, mute, and Stop all
review. This completes the manual listening gate separately from the automated
measurements. No browser/version, output-device details, or individual listening
observations were provided; do not invent those details or infer broader support.

All Step 02 tasks are complete. Stop at its review boundary. Do not begin Step 03
or archive this change automatically.

## Public-content review and exclusions

Inspected changed/new source, configuration, generated schema/types, tests,
examples, documentation, and packed contents. A focused scan found no personal
absolute paths or credential patterns; relative Markdown file links resolve.
No private handoffs, conversation logs, source aliases, generated browser
reports, local profiles, audio captures, or build outputs are included.

- No new dependencies, dependency/version changes, release tooling, commits,
  branches, pushes, PRs, deployments, or npm publication were performed.
- Dynamic controls/noise/variation, buses/shared effects, native interop,
  caching, gallery polish, and Steps 03–06 remain untouched.
- Existing CI scripts include the expanded suites; hosted Linux CI was not run.
  Clean-checkout installation was not repeated; Step 01 retains its separate
  clean-install evidence. The updated archive consumer was isolated locally.
- Browser tests required local port access outside the filesystem sandbox;
  an initial sandbox `listen EPERM` was resolved for the executed checks.
  Early builds emitted the existing Fumadocs webpack cache-analysis warnings.
- No Safari, Firefox, mobile, hardware-output, or performance claims are made.
  The link check covers local file targets, not remote URLs or heading anchors.
