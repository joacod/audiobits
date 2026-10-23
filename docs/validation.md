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
- **Full regression:** `pnpm test:browser:full` (also `pnpm test:browser`) or the
  Repository checks workflow's manual run executes all retained Chromium tests.
  Full regression includes native stress, graphics, acoustic comparisons,
  documentation and layout checks. Untagged extended tests run on their owning
  PRs, including the complete Riff Reactor song. The short playback test and
  deterministic complete-song controller test remain separate evidence.
- **Publishing:** every candidate runs package compilation, types, units,
  schema/capability consistency, native runtime Chromium and packed-artifact
  verification. It needs no Next.js build or server and never selects safety
  from the version-bump diff. Website regressions remain PR/full-regression
  gates. See [releases](releases.md).

### PR scope selection

[The selector](../scripts/ci/select-scope.mjs) is the explicit ownership mapping.
Unknown paths, shared activation/global layout, dependency/toolchain/CI changes,
new catalog ownership and mixed boundaries select the broad checks.

| Changed boundary                                       | Required evidence                                                                                                         |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| README/contributor prose                               | Formatting, lint and links; changed executable fences broaden verification                                                |
| Package README or metadata-only changes                | Package types/units and packed artifact, including the exact shipped README in Chromium                                   |
| Runtime, compiler, schema, public API or package build | Package artifact, all catalog/Skill consumers and full native/website regressions                                         |
| Catalog recipe/controller                              | Existing contracts, actual shadcn-installed consumers and complete owning experience test files                           |
| Owned website behavior                                 | Website types/build, production HTML contracts and complete affected interaction files                                    |
| Skill/MCP                                              | Generated consistency, protocol and executable installed examples, generic host lifecycle and relevant browser host tests |
| Shared, mixed or unknown                               | Full local preflight, package artifact, consumers, production HTML and complete Chromium suite                            |

New/modified browser specs run as complete files without smoke filtering, even
when they contain no `@smoke` tests. Deleted specs broaden selection. Main pushes
run the non-browser preflight without repeating the PR browser suite. Local
`test:browser:smoke` remains available for a deliberate short check.

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

## Local audit measurements (2026-10-22)

Single local runs used the same machine, Node 24.22.1, pnpm 12.9.1 and two
Chromium workers. Build caches were retained; these observations are not a
controlled cache benchmark, timing budgets or field Core Web Vitals.

| Phase/check                               | Before        | After                            | Evidence boundary                                                                                                   |
| ----------------------------------------- | ------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `verify:local`                            | 39.6 s        | 32.9 s                           | Preflight plus scope/security checks; one-run variation is not a coverage reduction                                 |
| Production site/vanilla builds            | 13.2 s        | 15.8 s                           | Both builds retained for website changes                                                                            |
| Combined packed-artifact/consumer checker | 49.4 s        | 3.2 s artifact; 47.6 s consumers | Separate commands reuse packing/install checks; real installs remain mandatory for relevant PRs                     |
| Card hit areas and pagination             | 9.9 s         | 2.8 s                            | Every static route/link checked in production HTML; representative clicks and both boundaries retained              |
| Install/usage clipboard test              | 5.2 s         | 2.8 s                            | Every command checked in production HTML; real recipe, experience and shared-source clipboard interactions retained |
| Desktop/mobile sidebar navigation         | 3.6 / 4.5 s   | 0.6 / 0.9 s                      | Representative route categories, selection and Back/Forward retained                                                |
| Complete Riff song                        | About 1.1 min | About 1.1 min                    | Extended native end-to-end integration retained on relevant PRs                                                     |

The independent publication gate completed in 14.0 s with Next.js production
output temporarily unavailable: 2.4 s package build/types/units, 0.7 s native
preparation, 7.3 s native Chromium and 3.3 s artifact verification. The complete
repository browser run took 227.5 s, separately from publication. Production HTML
checks took 0.5 s. The final automation split also passed its three focused cases
and the native gate; no assertions were discarded.

Cold production script requests, including automatic prefetch until network
idle, were measured with fresh Chromium contexts. Raw and gzip sizes below use
decimal kB and sum requested script bodies, not field transfer timings.

| Route                   | Before raw / gzip  | After raw / gzip   |
| ----------------------- | ------------------ | ------------------ |
| `/catalog/confirmation` | 1,986.3 / 547.4 kB | 1,309.0 / 369.2 kB |
| `/catalog/echo-vision`  | 1,623.8 / 477.2 kB | 1,528.9 / 445.9 kB |
| `/catalog/lightsaber`   | 1,623.8 / 477.2 kB | 1,262.6 / 352.0 kB |

The client boundary removes eager immersive dependencies. Disabling automatic
prefetch on audio-prepared navigation links also prevents visible links from
fetching those renderers. Confirmation requested no Three.js renderer scripts;
Echo Vision and Lightsaber requested their renderers. The existing synchronous
navigation activation, engine handoff and touch/lifecycle tests passed.

The refreshed production dependency audit was clean. The full audit still
reported development-only `braces` exposure through ESLint/shadcn tooling for
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), with no
patched release listed. It remains deferred without an override or suppression.
Hosted Linux CI, branch-protection configuration and OIDC publication have not
been exercised by these local checks.
