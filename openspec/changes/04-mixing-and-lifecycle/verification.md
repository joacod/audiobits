# Step 04 verification

Status: implemented; local automated checks and maintainer manual verification
passed. The maintainer confirmed manual validation on 2026-10-06. This change is not archived; Steps 05–06 have not started.

## Scope

Named buses form a single-parent tree rooted at master, with at most 32 live
buses. Gain and mute use separate stages. Playback validates bus ownership
before allocation or stealing. Reparenting rejects cycles and foreign engines,
removes the previous route, and refreshes effects for active routed voices.
Subtree disposal immediately finalizes routed voices and owned effects; master
requires engine disposal. Name lookup reuses live buses and recreates disposed
names.

Shared delay is an additive wet send, with seconds 0–2, feedback 0–0.9, and wet
0–1. Zero time with positive feedback is rejected. Valid settings are copied;
replacement builds before altering the old effect. Natural tails use a
conservative feedback estimate including descendant tail allowance, capped at
five seconds with a final 5 ms output fade and audio-clock cleanup sentinel.
Cut detaches effect input and fades old wet output, retaining settings for fresh
playback. Repeated reset retains at most one fading old graph. Suspension,
interruption, closed-context cleanup, and disposal finalize without future clock
progress.

Native access requires startup. The tap helper checks context identity and
rejects duplicate taps/destination connections. Caller-created nodes and sources
remain caller-owned. The vanilla consumer reads an analyser without a second
speaker route, and detaches/cancels/disconnects it on teardown. Both public
consumers demonstrate shared delay, bus routing, and a 100 ms volume ramp. Their hide path invalidates
pending starts, cuts tails, and suspends. Return requires a fresh Play gesture.

## Acceptance and evidence boundaries

The maintainer confirmed manual validation on 2026-10-06 after the requested
review of shared delay, volume ramps, mute/unmute, thruster release, and Stop all.
This completes the Step 04 listening gate separately from automated signal and
lifecycle checks.

No browser/version, output-device details, or individual observations were
supplied. Do not infer physical OS-interruption coverage or other-browser/device
support from this acceptance. No automated signal result establishes audible
quality.

Physical operating-system/device interruption has not been induced. Interrupted
state transitions are mocked; Chromium exercises native suspension, resumption,
closure, and delayed resume promises. Page visibility is a scripted host event;
site teardown uses actual client navigation and vanilla teardown uses a scripted
pagehide event. These establish application cleanup paths, not physical
backgrounding or device compatibility. Other browsers and mobile remain outside
the initial gate.

## Executed checks

Local macOS arm64 with Node 24.21.0, pnpm 12.9.1, OpenSpec 1.14.0,
Playwright 1.63.0, and Chromium 153.0.8010.12. The existing pinned toolchain
was used without dependency changes. Site/browser builds used
`NODE_ENV=production` and `NEXT_TELEMETRY_DISABLED=1`.

| Command | Result |
| --- | --- |
| `pnpm lint` | ESLint, formatting, and relative Markdown targets passed |
| `pnpm typecheck` | Runtime, site, and vanilla types passed |
| `pnpm test` | 42 tests passed; generated-artifact drift passed |
| `pnpm test:package` | Strict publint, ten-file allowlist, isolated offline install, NodeNext declarations, and browser-free imports passed |
| `pnpm test:browser` | Production library/site/vanilla builds and 18 Chromium checks passed |
| `OPENSPEC_TELEMETRY=0 openspec validate --all --strict --no-interactive` | Seven changes passed |
| `git diff --check` | Passed |

Unit coverage includes cycles, foreign buses/native taps, duplicate route
replacement, subtree disposal/name reuse, gain/mute separation, invalid delay
updates before allocation, zero-delay without feedback, partial allocation
cleanup, bounded audio-clock tails, idle reparenting without tail extension,
repeated cut/reset, suspension during blocked resume, simulated interruption,
and retiring capacity under mixed cut stress. Existing recipe/control/resource
checks continue to pass. Mocks establish ownership/control flow, not native
signal or audible quality.

The packed package remains private and has zero runtime dependencies. Its
isolated declaration consumer now checks routing, delay, cut tails, native
analyser attachment/detachment, and bus disposal in addition to prior APIs.
The archive measured 23396 bytes locally; this is development package evidence,
not a registry release size.

## Native signal and resource results

Native mono OfflineAudioContext checks rendered confirmation at 44.1/48 kHz,
50 ms onset, -12 dB bus gain, and shared delay of 0.2 seconds, 0.9 feedback,
and 0.5 wet. All samples were finite. Peak output was 0.0435668 at 44.1 kHz
and 0.0435723 at 48 kHz. Natural-tail energy between 0.5 and 1 second was
0.490751 and 0.533349 respectively; after a running-context cut at 0.4 seconds,
that window was exactly silent at both rates. Every run was exactly silent
from six seconds through the seven-second render, verifying the capped tail.
These characterize the signal, not subjective delay/fade quality or arbitrary
mix headroom.

A native 200-cycle combined finite/sustained/bus/cut stress run configured two
active reservations and one retiree. It peaked at 39 owned nodes against a
45-node regression budget, returned to six base bus nodes after suspension,
two master nodes after subtree disposal, and zero after engine disposal.
The caller-owned analyser was detached/disconnected separately. Prior sustained
stress now peaks at 32 nodes because master has two stages; voice graphs remain
ten nodes and retained noise storage remains bounded at 576000 bytes for the
three allowed graphs at 48 kHz. Instrumentation checks node disconnection and
owned buffer references, not browser heap reclamation.

Chromium UI checks verify both consumers through public exports, including
volume controls, delay enable/disable, mute, cut Stop all, native context
suspension, delayed-resume invalidation, no stale oscillator allocation, and a
fresh gesture after return. Existing activation/retry, signal, controls,
framework teardown, and pure package-consumption gates remain in place.

## Public-content review and exclusions

Inspected complete changed/new runtime, consumers, tests, declaration-consumer
fixture, package/API docs, OpenSpec design/tasks, and status documentation.
A focused scan found no personal absolute paths or credential patterns.
Relative Markdown targets resolve. Builds, diagnostic logs, browser profiles,
and test artifacts remain untracked/ignored.

No dependency or version changes, new packages, root README expansion,
deployment, npm publication, Changeset,
worklet, cache, microphone/streaming API, or gallery redesign was added.
The package is unreleased, so no released-version migration or Changeset is
needed. Steps 05–06 remain untouched. Hosted CI and a fresh checkout install
were not run; the isolated packed consumer was run locally.

The first sandbox browser attempt failed to bind localhost (`listen EPERM`);
local port access allowed the executed suite. Native mixed stress exposed a
cut-path bug that reclassified retirees as active reservations; the corrected
path preserves retiree status, and unit/native regression checks pass.

All Step 04 tasks are complete, including maintainer manual acceptance and
public documentation review. Stop at this change's review boundary. Do not
archive or start Step 05 automatically.

## Changed files

| Area | Files |
| --- | --- |
| Runtime and exports | `packages/audiobits/src/runtime/bus.ts`, `packages/audiobits/src/runtime/engine.ts`, `packages/audiobits/src/index.ts` |
| Public consumers | `apps/www/app/confirmation-demo.tsx`, `examples/vanilla/src/main.ts`, `examples/vanilla/index.html` |
| Verification | `packages/audiobits/tests/engine.test.ts`, `tests/browser/audio-harness.ts`, `tests/browser/mixing.spec.ts`, `scripts/test-package.mjs` |
| Development documentation | `packages/audiobits/README.md`, `apps/www/content/docs/index.mdx`, `docs/architecture.md`, `docs/development.md`, `docs/roadmap.md`, `AGENTS.md` |
| Step 04 records | `design.md`, `tasks.md`, `verification.md` in this change |

## Offline fixture evidence correction

The shared-delay signal fixture's original `onended`-driven cut checkpoint was
not deterministic: the main-thread callback could arrive after offline rendering
advanced. The [Step 05 CI follow-up](../05-gallery-and-docs/verification.md#ci-delay-fixture-follow-up)
records the reproduction and corrected fixture. Native offline rendering now
pauses at audio-clock checkpoints; a test-only running-state adapter selects the
5 ms cut-fade branch while paused. The signal remains native, but running-state
selection is simulated. Historical sample results above remain observations
from their original local run, not proof of a reliable callback timing gate.
Runtime APIs and maintainer manual acceptance are unchanged.
