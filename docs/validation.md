# Validation

Use unit, type, browser and packed-package checks for the affected boundary.
Automated tests check technical behavior; audible quality is evaluated through curation.

## Test selection

Start with the smallest relevant existing checks. Add or modify a test only for
a meaningful uncovered behavior or an actual regression. New features alone do
not require new tests. Prefer unit/type tests for pure logic, Chromium for native
audio and browser lifecycle, and packed consumers for installation contracts.

Keep website coverage representative: audio activation, cancellation, Stop,
disposal, copied source and a few navigation journeys. Do not test every component,
framework control, style token or viewport. New catalog sounds normally reuse the
existing host checks and add only their unit or installed-consumer contracts.
Test counts and coverage percentages are not targets.

Consolidate before adding cases. Add input, parameter or stress permutations only
for a concrete risk. Test the actual interface without adding controls just for
automation. Explain the gap when adding a browser case; no separate test plan is
needed. Reuse passing checks and build outputs unless a relevant change or failure
invalidates them. Stop after the requested work and focused verification pass.

Fix flaky tests at the product, test or environment cause. Reproduce the failing
condition directly. Do not hide failures with sleeps, retries, longer per-test timeouts,
weaker assertions, ignored errors or skips. Prefer standard tool setup; keep a
workaround only when a demonstrated failure requires it, in the shared setup
script rather than individual tests.

## Verification tiers

- **Focused local checks:** run affected units, types or Chromium tests. Reuse
  valid build outputs. The pre-push hook runs `pnpm verify:push`: lint, formatting,
  links, library build and workspace types against a clean checkout of the pushed
  commit. `pnpm verify:local` additionally runs units/contracts, Skill consistency
  and MCP checks when a full non-browser preflight is useful. Hooks do not replace
  affected browser/package checks. Changed browser tests must run directly.
- **Routine CI:** draft PRs do not run checks. Opening or updating a ready PR,
  reopening it, or marking it ready selects affected boundaries from the PR merge
  base, including renames and deletions. Returning to draft cancels an older run.
  Require the aggregate `checks` status: scope selection, `quality` (units and
  generated contracts) and `chromium-integration` (builds and integration) must all
  succeed. Standalone lint and workspace typechecking run locally; builds and
  installed-consumer contracts still compile types where required. Web edits and
  automated PRs do not run local hooks, so CI does not certify their lint or full
  workspace types. There is no duplicate Repository checks run after merging.
- **Required browser baseline:** `pnpm test:browser` builds once and runs the
  existing native-runtime suite plus a bounded set of representative website
  journeys tagged `@required`. Keep this baseline small as the catalog grows.
- **Explicit full regression:** `pnpm test:browser:full` or the Repository checks
  workflow's manual run executes all retained Chromium tests. Specialized graphics,
  stress and whole-song playback checks belong here. Run it only when requested.
- **Publishing:** every candidate runs package compilation, types, units,
  schema/capability consistency, native runtime Chromium and packed-artifact
  verification. It needs no Next.js build or server and never selects safety
  from the version-bump diff. Website regressions remain PR/full-regression
  gates. Run release preparation only when requested. See [releases](releases.md).

### PR scope selection

[The selector](../scripts/ci/select-scope.mjs) combines distribution boundaries
without a per-experience browser ownership map. Shared, CI, dependency and unknown
changes select the bounded baseline plus package, consumer and build checks.
Mixed changes combine their checks; adding prose does not broaden browser coverage.

| Changed boundary                   | Required evidence                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------- |
| README/contributor prose           | Local formatting/lint/types and CI links; changed executable fences select baseline/distribution checks |
| Package README or metadata only    | Package units and packed artifact, including the shipped README in Chromium                             |
| Runtime/compiler/schema/API/build  | Package artifact, installed catalog/Skill consumers, native suite and website baseline                  |
| Catalog recipe/controller/registry | Contracts, installed consumers, production HTML, native suite and website baseline                      |
| Website presentation/behavior      | Website types/build, production HTML, native suite and website baseline; no installed consumer sweep    |
| Skill/MCP                          | Generated consistency, protocol, installed examples, native suite and website baseline                  |
| Shared/CI/dependencies/unknown     | Units/contracts, package artifact, consumers, production HTML and bounded browser baseline              |

New or modified browser specs join the website baseline in one execution,
including untagged regressions. Native cases run once in the runtime suite;
`@site` cases in mixed files stay in the website run. `@extended` cases run only
in explicit full runs. Deleted specs retain the baseline. Publication retains
its independent main-branch workflow and complete candidate checks.

Two workers and zero retries apply throughout. Let the selected suite finish;
do not impose global test or CI time budgets to enforce speed. Investigate slow
tests or setup steps individually. Provisioning failures remain fatal. Keep static
metadata, commands and pagination in production HTML checks; use Chromium where
actual interaction or native audio matters. See [development](development.md#verification-by-task)
for commands and environment setup.

## Browser policy

Current Chromium is the only automated browser verification target. Other
browsers and physical devices require an explicit verification request.

Background interruptions and device changes are outside automated coverage.
Compare signal properties within Chromium; native sample identity is not guaranteed.

Chromium touch input and injected AudioContext behavior verify application event
handling and lifecycle. Simulated persisted page transitions in the Skill harness
verify cancellation and fresh-gesture recovery, not actual back-navigation.
Neither proves physical-device or iOS browser behavior.
Prefer existing shared coverage; do not add browser-policy simulations or input
matrices as substitutes for device evidence.

For held touch, check nonzero native output before release and verify that
navigation transfers the same context. Compare cold direct entry separately.
Script evaluation can grant artificial user activation in browser automation;
exclude that side effect when investigating native activation eligibility.

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
