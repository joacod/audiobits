# Step 03 verification

Status: dynamic sounds implemented; local automated checks and maintainer
manual verification passed. The maintainer confirmed manual verification on
2026-10-06. This change is not archived; Step 04 has not started.

## Implemented scope

The descriptor and generated data support one-shot/sustained recipes, at most
16 named controls, bounded mappings/variation, oscillator and white-noise sources,
and onset frequency automation. Layer gain accepts direct numeric/mapped/random
values; envelopes and Q remain numeric. Validation checks all extrema, references,
control modes, timelines, and existing aggregate budgets without browser globals.

Playback resolves a fresh seeded plan using xorshift32 (13/17/5 shifts, public
zero seed mapped to `0x6d2b79f5`). Property traversal is explicit, and every voice
exposes its actual seed and a frozen requested-parameter snapshot. Invalid play
controls/seeds and sample-rate/Nyquist violations fail before allocation or
stealing. Live updates validate all keys first, reuse the same graph, and ramp
native targets from their current values. Stopped/retiring/ended/disposed voices
reject updates. Sustained voices use existing reservations, stealing, release,
suspension, and disposal semantics.

Each noise layer owns one mono one-second buffer. Its last 20 ms crossfades into
its first 20 ms; playback wraps to the sample after that prefix. Sample rates are
bounded to 8000–192000 Hz. A buffer retains at most 768000 sample bytes, with one
additional temporary generation buffer; no shared cache is retained. Sixteen
layers and existing voice limits bound simultaneous allocation. Buffer-source
references are cleared during every finalization path. These are owned resource
bounds, not claims about garbage collection or total browser memory.

The study's impact and thruster fixtures are exported through `audiobits/recipes`.
The site and vanilla example use built public exports for impact intensity and
one retained thruster voice with live throttle, Stop, mute, errors, hide cleanup,
and teardown. No saturation was added because listening has not established a
need for it. Package/API docs and architecture/roadmap status reflect the draft
implementation and completed listening gate.

## Listening gate

The maintainer confirmed manual verification on 2026-10-06 after the requested
review of confirmation, impact, and thruster at defaults and control extrema,
repeated impacts, rapid throttle changes, Stop behavior, and sustained noise
across loop boundaries. This completes the Step 03 listening gate separately
from automated signal and lifecycle checks.

No browser/version, output-device category, or individual listening observations
were supplied. Do not invent those details or infer other-browser/device support.
The Step 02 confirmation evidence remains a separate earlier review. Automated
samples, native graphs, and UI checks alone do not establish sound quality.

## Executed checks

Local macOS arm64 with Node 24.21.0, pnpm 12.9.1, OpenSpec 1.14.0,
Playwright 1.63.0, and Chromium 153.0.8010.12. The pinned toolchain was selected
without changing global installations or dependencies. Production browser
checks used `NODE_ENV=production` and `NEXT_TELEMETRY_DISABLED=1`.

| Command | Result |
| --- | --- |
| `pnpm lint` | ESLint, formatting, and relative Markdown file-target checks passed |
| `pnpm typecheck` | Runtime, site, and vanilla types passed |
| `pnpm test` | 34 tests passed: six supervisor and 28 recipe/runtime checks; generated-artifact drift passed |
| `pnpm test:package` | Strict publint, ten-file allowlist, isolated offline install, NodeNext declaration consumer, and browser-free imports passed |
| `pnpm test:browser` | Library/site/vanilla production builds and 12 Chromium checks passed |
| `OPENSPEC_TELEMETRY=0 openspec validate --all --strict --no-interactive` | Seven changes passed |
| `git diff --check` | Passed |

The pure/mocked suite covers parameter extrema and references, invalid supplied
controls, play-only updates, atomic failures, ended-voice errors, known PRNG
vectors, deterministic traversal, noise replay at 44.1/48 kHz, loop-boundary
sample adjacency, partial noise allocation failure, future cancellation,
rapid retargeting from current ramps, 1000 updates without new resources, and
sustained start/stop/disposal bounds. Mocks establish ownership/control flow,
not audible quality.

Chromium checks retain the confirmation, activation/retry, overlap, release,
and package/site foundation gates. Dynamic additions cover offline extrema,
seeded signal replay within the same browser/sample rate, eight simultaneous
impacts, sustained release during attack and sustain, silent pre-onset
cancellation, rapid throttle ramps, native graph reuse, native sound/engine
disposal while sustained playback is active, and resource stress. Both public
consumers trigger repeated impacts and keep one thruster voice through slider
updates. Site teardown uses real client route navigation; visibility changes
and the vanilla `pagehide` event are scripted host events, not physical
backgrounding or operating-system interruption evidence.

## Signal measurements

Mono offline output, explicit seed 42, onset at 50 ms, and -12 dB master-equivalent
gain. Sustained fixtures stop at 2.2 seconds unless testing attack release.
All samples were finite; pre-onset and post-cleanup windows were exactly silent.
Every graph finished. Seeded impact replay checksums matched at each sample rate;
no equality is claimed across sample rates.

| Fixture / control | Peak at 44.1 kHz | Peak at 48 kHz |
| --- | --- | --- |
| Impact intensity 0 | 0.0155917 | 0.0151465 |
| Impact intensity 0.5 | 0.0270156 | 0.0267216 |
| Impact intensity 1 | 0.0471177 | 0.0450580 |
| Eight default impacts | 0.2161250 | 0.2137726 |
| Thruster throttle 0 | 0.0056412 | 0.0056638 |
| Thruster throttle 0.2 | 0.0075306 | 0.0075471 |
| Thruster throttle 1 | 0.0280000 | 0.0286582 |
| Thruster rapid retargeting | 0.0256027 | 0.0247228 |
| Thruster stopped during attack | 0.0128457 | 0.0130612 |

Confirmation's repeated 48 kHz check retained peak 0.0435723 for one voice and
0.3485785 for eight. Single dynamic fixtures had maximum adjacent-sample changes
below 0.004434. At full throttle, the first loop window had maximum adjacent
changes 0.0035161 at 44.1 kHz and 0.0023655 at 48 kHz. Across the sustained
checks, 50 ms RMS windows around the first loop boundary remained between
0.98 and 1.05 times neighboring steady windows. The test permits 0.5–2 times
for that regression check. These characterize signal continuity and amplitude,
not seam audibility, subjective force, fatigue, or arbitrary-mix headroom.

## Resources, cost, and package size

At 48 kHz a thruster owns ten nodes and one 192000-byte sample buffer. One master
node belongs to the engine. A native 1000-start/stop stress run configured two
voice reservations plus one retiree and reached at most 31 owned nodes and
576000 retained sample bytes. One sustained voice received 1000 live updates
without replacing its buffer or allocating nodes. Normal release, future
cancellation, suspension, sound disposal, and engine disposal returned owned
counts to baseline; final engine disposal left zero nodes and voices.
Instrumentation retained test references to inspect disconnection and cleared
buffer properties; it did not measure browser heap reclamation.

A local Chromium baseline measured 100 fresh impact definitions and 100 impact
play calls. Definition preparation includes validation/snapshot; play includes
seeded compilation, noise generation, graph construction, and scheduling. The
first preparation was about 0.1 ms, median below timer resolution, p95 0.1 ms,
and maximum 0.4 ms. The first play was about 1.1 ms, median 1.3 ms, p95 1.5 ms,
and maximum 1.5 ms. Timing was collected with the browser suite running in
parallel, without a browser warm-up guarantee; these are local observations,
not universal latency promises or portable CI timing thresholds.

The measured one-buffer cost and bounded storage support the initial one-second
allocation choice without a cache. The maintainer confirmed the requested
listening review; no individual seam observations were supplied. Retained bytes and graph
counts have explicit regression gates, while CPU timing remains a recorded
baseline until comparable measurements justify a threshold.

Built runtime JavaScript includes the engine entry and shared validation/schema
chunk; curated recipes remain a separate import. Package-size measurements
include the actual packed development archive and sums of emitted JavaScript
bytes/gzip bytes. The archive is 18874 bytes. All three JavaScript files
total 41117 bytes (11468 bytes as the sum of separate gzip streams); the engine
entry plus shared validation/schema chunk total 38243 bytes (10629 gzip bytes). They are local package evidence, not a release
or registry size claim.

## Public-content review and exclusions

Inspected changed/new source, generated types/schema, fixtures, tests, consumers,
API docs, planning-status edits, and packed contents. A focused scan found no
personal absolute paths or credential patterns. Relative Markdown file targets
resolve. Generated builds, browser diagnostics, profiles, audio captures, and
local toolchain paths are not tracked.

No dependency/version changes, additional packages, root README expansion,
commits, branches, pushes, PRs, deployment, npm publication, caches, saturation,
buses, shared effects, or native interop were added. Steps 04–06 remain untouched.
The OpenSpec change is not archived. Hosted CI and a new clean-checkout install
were not run. No other-browser, mobile-device, physical-interruption, or manual
output-device details were supplied. Step 01 retains its separate clean-install
evidence.

The first sandbox browser attempt failed to bind localhost (`listen EPERM`);
local port access allowed the executed suite. An intermediate demo assertion
matched Next.js's empty route-announcer alert; scoping it to the audio region
fixed the test without changing runtime behavior. Type generation emitted the
existing environment warning when `NODE_ENV` was inherited; production browser
builds explicitly set its production value.

All Step 03 tasks are complete, including maintainer listening acceptance.
Stop at this change's review boundary. Do not begin Step 04 or archive this
change automatically. Release readiness, publication, and any reduced Step 06
selection remain separate decisions.
