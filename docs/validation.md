# Validation

Use unit, type, browser and packed-package checks for the affected boundary.
Automated tests check technical behavior; audible quality is evaluated through curation.

## Test selection

Add or modify tests when they protect meaningful, previously uncovered behavior
or reproduce an actual regression. New production code alone does not require a
new test. Prefer the cheapest level that demonstrates the invariant reliably:
unit tests for validation, compilation, scheduling decisions and ownership
accounting; Chromium for native signal, activation and browser lifecycle.
Improve or consolidate existing tests before adding repetitive cases. Explain
why a new browser test needs native behavior and why existing coverage is
insufficient, without creating a separate testing document.

Do not add viewport, input-method, audio-parameter or stress permutations without
a concrete regression risk. Counts and implementation details are not test goals.
Keep tests deterministic and maintainable. Never weaken legitimate failure
detection merely to make checks pass.

## Verification tiers

- **Focused local checks:** run affected units, types or Chromium tests. Reuse
  valid build outputs. `pnpm verify:local` shares CI's non-browser lint, formatting,
  links, type, unit/contract, Skill and MCP checks. Run it before code PRs;
  documentation-only edits can use focused static checks.
- **Routine CI:** select affected boundaries from the PR merge base, including
  both sides of renames and added/deleted files. The stable `quality` and
  `chromium-integration` jobs always report. The `checks` aggregation requires
  selection and both jobs to succeed, rejecting failure, cancellation, missing
  results and unexpected skips. Require `checks` in branch protection; existing
  required job names remain available. Workflows have no whole-workflow path filters.
- **Required browser baseline:** `pnpm test:browser` builds once and runs the
  existing native-runtime suite plus a bounded set of representative website
  journeys. The website budget is approximately 8–12 meaningful cases, covering
  gesture playback, activation recovery, cancellation, prepared navigation,
  preview replacement/Stop/disposal, workbench settings and copy fidelity, and
  docs navigation/search/mobile menus. Adding a sound normally adds no routine
  website case. Protect item-specific contracts with unit and installed consumer
  checks instead.
- **Explicit full regression:** `pnpm test:browser:full` or the Repository checks
  workflow's manual run executes all retained Chromium tests with a five-minute
  Playwright limit. Distinct graphics, acoustic, stress and long-form evidence
  remains here. Riff Reactor's whole-song native playback is `@extended` evidence;
  deterministic complete-song controller tests and short native playback protect
  routine changes.
- **Publishing:** every candidate runs package compilation, types, units,
  schema/capability consistency, native runtime Chromium and packed-artifact
  verification. It needs no Next.js build or server and never selects safety
  from the version-bump diff. Website regressions remain PR/full-regression
  gates. See [releases](releases.md).

### PR scope selection

[The selector](../scripts/ci/select-scope.mjs) combines distribution boundaries
without a per-experience browser ownership map. Shared, CI, dependency and unknown
changes select the bounded baseline plus package, consumer and build checks.
Mixed changes combine their checks; adding prose does not broaden browser coverage.

| Changed boundary                   | Required evidence                                                                                    |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------- |
| README/contributor prose           | Formatting, lint and links; changed executable fences select the baseline and distribution checks    |
| Package README or metadata only    | Package types/units and packed artifact, including the shipped README in Chromium                    |
| Runtime/compiler/schema/API/build  | Package artifact, installed catalog/Skill consumers, native suite and website baseline               |
| Catalog recipe/controller/registry | Contracts, installed consumers, production HTML, native suite and website baseline                   |
| Website presentation/behavior      | Website types/build, production HTML, native suite and website baseline; no installed consumer sweep |
| Skill/MCP                          | Generated consistency, protocol, installed examples, native suite and website baseline               |
| Shared/CI/dependencies/unknown     | Local preflight, package artifact, consumers, production HTML and bounded browser baseline           |

New or modified browser specs join the required website cases in one execution,
so untagged regressions execute and baseline cases never run twice. Native cases
already covered by the runtime configuration are excluded from that website run;
`@site` regressions in mixed files remain selected. `@extended` deliberately marks
long-form or specialized evidence for explicit full runs, never ordinary owner
selection. To run an affected untagged case locally, override the baseline filter:
`AUDIOBITS_BROWSER_SUITE=regression pnpm exec playwright test <file> --grep='test title'`. Deleted specs retain the
baseline. Main pushes run the non-browser preflight; manual runs request full
regression. Two workers and zero retries apply throughout.

The routine Chromium job has a six-minute limit, with three minutes maximum for
provisioning. Native execution has a two-minute global limit and the website
baseline has 90 seconds, leaving time for failure reports. Explicit changed-file
regressions have three minutes; manual full jobs have twelve minutes overall.
Provisioning failures remain fatal. The centralized setup records OS installation,
headless-shell download and verified clocked audio startup separately.

Production HTML checks cover every route's metadata, catalog command and ordered
pagination. Browser checks retain real clipboard bytes, accepted settings, focus
and feedback, link hit areas, navigation boundaries, pointer/touch cancellation,
audio activation, Stop and ownership/disposal. Two workers and zero retries are
shared by full and native-only configurations. The native-only configuration
excludes `@site` cases in mixed files. The catalog/native-automation comparison
keeps its existing assertions in a separate browser case; core offline/live
no-hold automation checks also run in the publication gate.

The Skill factory exercise dispatches simulated persisted `pagehide`/`pageshow`
in Chromium, including a delayed native resume. It proves cancellation and
fresh-gesture recovery in that harness, not physical-device or real back-navigation
behavior.

Tests follow exposed behavior. Immersive stages use their actual pointer/touch
interactions and existing shortcuts; they do not need duplicate action panels or
new keyboard alternatives to satisfy a checklist. Ordinary navigation, forms,
documentation and existing controls retain keyboard and focus expectations.
Shared runtime lifecycle tests plus representative host checks should protect
common invariants; do not reproduce every lifecycle/stress case for every sound.
Hooks provide early feedback and never replace focused verification.

## Browser policy

Current Chromium is the only automated browser verification target. Other
browsers and operating systems are unverified and deliberately deferred.

Background interruptions and device changes are outside automated coverage.
Compare signal properties within Chromium; native sample identity is not guaranteed.

Chromium touch input and injected AudioContext behavior verify application event
handling and lifecycle. They do not validate iOS browser activation policy.
Prefer existing shared coverage; do not add browser-policy simulations or input
matrices as substitutes for device evidence.

For held touch, check nonzero native output before release and verify that
navigation transfers the same context. Compare cold direct entry separately.
Script evaluation can grant artificial user activation in browser automation;
exclude that side effect when investigating native activation eligibility.

## Checks by boundary

| Boundary          | Evidence                                                                                                               |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Pure recipe layer | Valid/invalid fixtures, unknown keys/versions, bounds, JSON round trip, immutable snapshot, stable issue paths         |
| Compiler          | Parameter extrema, reference resolution, automation order, duration/release calculation, seeded choices                |
| Native signal     | Chromium OfflineAudioContext: finite samples, non-silence, expected duration, energy regions, peak/headroom            |
| Live engine       | Chromium AudioContext: gesture start, overlap, scheduled cancellation, stop/dispose, pending-start races, voice limits |
| Site              | Exposed gestures/controls, error recovery, route cleanup, example typechecking                                         |
| Package           | Built ESM exports, declarations, metadata, tree-shaking check, SSR-safe import, isolated tarball consumer              |

Offline rendering can test signal properties, but not autoplay, actual device
interruption, page lifecycle, or live context cleanup. Mocks can test race logic,
with representative real-browser coverage for the corresponding public workflow.

## Signal and resource invariants

Use these property and resource bounds with documented gain and concurrency.

- All rendered samples are finite. Curated single-voice default peaks remain
  below -6 dBFS at the master; eight simultaneous finite core voices must stay
  below 0 dBFS. Keep quality tuning and resource limits distinct.
- Active and retiring voice counts obey [voice ownership invariants](architecture.md#bounds-and-mixing).
  After finite tails, stop, or disposal, owned counts return to baseline.
- Retain shared extended Chromium stress checks such as 1000-voice cancellation
  for owned voice/connection cleanup. Run them when resource behavior changes or
  during full verification, not for every sound. They do not prove zero
  browser-internal memory retention.
- Offline duration matches gate plus release/tail within one render quantum
  where applicable. Check the actual energy falloff with tolerances rather than
  exact sample equality.

Document the number of simultaneous voices and default master settings used for
peak checks. These checks do not guarantee clipping-free output for arbitrary
recipes, native extensions, or maximum engine concurrency.

## Public-content review

Review all changed and new files, not just the tracked diff. Inspect prose,
examples, comments, configuration, generated package files, and source maps for
private paths, personal information, credentials, internal links, and unsupported
claims. Check relative Markdown links. Preserve the license.

Record the scope of review accurately: a local content review does not establish
that remote Git history, hosted previews, or registry artifacts were inspected.
