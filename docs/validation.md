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
- **Routine CI:** quality/build checks, actual packed-package consumers and
  `pnpm test:browser:smoke`. Native `@smoke` tests cover signal, activation,
  cancellation, routing, cleanup and representative interaction models. The
  smoke run stops at the first failure. Quality also runs on `main`; Chromium
  runs on PRs, avoiding a duplicate merged-main run. Keep required PR checks
  enabled in branch protection.
- **Full regression:** `pnpm test:browser:full` (also `pnpm test:browser`) includes
  smoke plus retained stress, graphics, acoustic comparisons, documentation and
  layout regressions. Run for explicit verification, broad changes and release
  preparation. Untagged tests are extended coverage, not disabled tests.
- **Publishing:** the release gate retains full Chromium and packed-package
  verification before publishing the verified archive. See [releases](releases.md).

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
