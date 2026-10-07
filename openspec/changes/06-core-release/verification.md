# Step 06 verification

Status: release preparation implemented for local acceptance review. The full
accepted Steps 01–05 scope is selected. The runtime remains private; no registry
publication, hosted deployment, or production activation occurred. Candidate
acceptance and verification under pinned Node remain pending. This change is
not archived.

## Candidate identity and scope

Changesets 3.0.3 applied the initial minor note in `rc` prerelease mode, producing
`0.1.0-rc.0`. Its applied note is retained under `.changeset/pre/`. The initial
`changeset init` was interactive, so the explicit configuration was written and
then exercised through `pre enter rc` and `version`. No commit or tag was made.
`changeset status` subsequently reports changed packages without unapplied
notes, as the versioned candidate remains uncommitted. This is not a publication
result and no artificial extra release note was added.

The candidate includes confirmation, impact, thruster, schema-1 recipes,
oscillator/white-noise sources, three filter kinds, seeded variation, play/live
controls, bounded voices, buses/shared delay, native output taps and lifecycle
APIs. It advertises no sequencing, spatialization, caching, registry, MCP,
worklet, framework adapter or wider browser support. Runtime source, recipe
schema semantics and curated sound definitions are unchanged.

The retained archive is `audiobits-0.1.0-rc.0.tgz`: 25333 bytes, SHA-256
`e51f698841d8ac998076f4e977b84f4b16173e150a0f2e5de613a7491ae5705a`.
The rehearsal retains the archive and machine-readable `evidence.json` under
ignored `node_modules/.cache/audiobits-release/`. The source baseline is
`8480450f251a8fc1bfb9b2f1187a6d7733dc5d20` with uncommitted Step 06 changes;
the baseline commit alone does not identify candidate source. The archive hash
identifies the tested bytes. Repack and review after changing any shipped file.

The archive contains 14 files: MIT license, package manifest, README, Changesets
changelog, Skill and control reference, three JavaScript files, three declaration
files, schema JSON and capabilities JSON. No source maps, source TypeScript,
site files, test fixtures, private diagnostics or production credentials ship.
License matches the root license. `sideEffects: false` and zero runtime/peer
dependencies are checked. The final npm identifier and ownership remain
unconfirmed; the local import identifier does not imply registry availability.

## Executed checks

Local macOS arm64, pnpm 12.9.1, Changesets 3.0.3, TypeScript 6.0.3,
OpenSpec 1.14.0, Playwright 1.63.0, Chromium 153.0.8010.12. Available verification
Node is 24.2.0, below pinned/minimum 24.21.0. The bundled alternate Node is
24.19.0, also below the pin. Repository engines and `.node-version` were not
relaxed. Repeat the gate under 24.21.0 before considering it pinned-toolchain
release evidence. Normal sandbox pnpm identity checks stalled on registry
access; approved tool access ran the pinned pnpm successfully.

| Command/check | Result |
| --- | --- |
| `pnpm typecheck` | Runtime, site, vanilla and public documentation types passed |
| `pnpm test` | 46 passed, including metadata, stable-channel and workflow boundaries |
| `pnpm lint` | ESLint, formatting and relative Markdown file targets passed |
| `NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 pnpm test:browser` | Library/site/vanilla and both test bundles built; 26 Chromium checks passed |
| `pnpm test:package` | Strict publint, offline isolated archive install, imports, declarations, example types, tree-shaking, native Chromium hosts and archive review passed |
| `pnpm install --offline --frozen-lockfile --config.engine-strict=false` in fresh source snapshot | 672 packages installed from existing store; zero downloads; library build and 46 unit tests passed |
| `OPENSPEC_TELEMETRY=0 openspec validate --all --strict --no-interactive` | Seven changes passed |
| `quick_validate.py packages/audiobits/skill` under available Python 3.11 with PyYAML | Skill valid; other available Python runtimes lacked PyYAML |
| `git diff --check` | Passed |
| `NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 pnpm release:prepare` | Passed: lint, types, 46 unit tests, production builds, 26 Chromium checks and isolated package rehearsal |

The fresh source snapshot copied current tracked and non-ignored new source
files into a new temporary directory with no dependencies or build outputs.
This is an independent source snapshot, not a Git checkout or hosted CI run.
The installation's explicit engine override allowed the older local Node;
it is not pinned-Node acceptance. The ordinary Chromium script used its tracked
ports and configuration; no alternate port/configuration was needed.

## Package and guidance evidence

The tarball installs into a private system-temporary consumer through offline npm,
with scripts disabled, an empty consumer cache and no workspace dependency.
The consumer resolves ESM and declarations through installed package exports,
validates all three recipes and creates/disposes engines without browser globals.
Public JSON schema and capability exports are resolved separately from runtime.
Every archive file is checked for repository/consumer paths and obvious private
path/credential markers, with a manual complete-content review as a separate gate.

All four packaged README TypeScript fences and the Skill control fence typecheck
against the installed archive. The quick-start and controlled-thruster host
execute their exact packaged code in Chromium, with caller-owned analyser probes.
Both load without a context, start from real button gestures, produce finite
nonzero native samples, stop to exact silence with zero owned voices, dispose
and close their sole contexts without page errors. The controlled host also
executes a live throttle update. This demonstrates native signal and lifecycle
behavior, not human listening quality. Existing integration checks exercise
failed starts, hide/late-resume invalidation, routing, effects and teardown.

An unused `createAudio` import bundles to exactly the same minified output as
a baseline with no library import. This verifies the tested unused-entry
case; it does not establish every downstream bundler configuration. Metadata
generation uses schema enums and package version/status; `pnpm test` checks drift.
Thirty combinations of playback kind, source/waveform/noise color and filter
validate/compile in pure tests and execute through the native graph in 48 kHz
Chromium offline renders. Every render is finite, has nonzero energy, reaches
exact silence after release and cleans up once. Existing dynamic/mixing tests
cover controls, seeded replay and runtime operations.

## Performance and listening boundaries

The current Chromium resource scenario observed ten nodes per thruster,
32 peak counted voice nodes, 576000 peak owned sample bytes and zero nodes/voices
after cleanup. In the aggregate run, preparation median was 0 ms at the browser timer's
available resolution and p95 about 0.2 ms; scheduling median was about 1.2 ms
and p95 about 1.4 ms. Zero rounded preparation time is not zero computation. The combined
routing/effects scenario peaked at 39 counted nodes and returned to zero.
These are instrumented local scenario measurements during a concurrent test
run, not all-browser heap measurements or universal latency claims.

The retained compressed archive is about 25 KiB. Current runtime output is
33.45 kB engine entry, 15.41 kB validation chunk and 2.87 kB optional curated
recipe entry before gzip. The 68 native managed/raw comparisons still report
maximum absolute sample difference 4.554749466478825e-9. The shared-delay cut
fixture retains its disclosed test-only running-state adapter; do not describe
it as a wholly native running-context cut measurement.

Sound data and runtime algorithms are unchanged. Listening acceptance is
inherited from maintainer-reported Steps 02–04 core acceptance and Step 05
gallery acceptance on 2026-10-06. No new independently observed listening
session occurred, and no browser/device details or per-sound observations are
invented. Confirm candidate acceptance separately. Firefox, WebKit, Safari,
iOS/mobile and physical device interruption remain outside the evidence.

## Workflow and documentation gates

The npm and site preparation workflows have only manual triggers, read-only
preparation permissions, separate concurrency groups, and disabled production
jobs with separate environment names and failing activation stubs. YAML contract
tests check those boundaries. Neither preparation path writes the registry,
deploys, or invokes the other path. No hosted workflow run or actual protected
environment configuration was tested.

The private candidate stays Unreleased on the site. Public API page labels and
page metadata derive from common package/channel metadata. Copied examples read
version from the public capabilities export. Stable selection requires a
non-private stable package, matching released-version attestation and reviewed
full source commit; invalid inputs fail. Unit tests check private/prerelease,
mismatched-version, invalid-source and invalid-channel rejection. These local
attestations do not themselves prove registry publication.

Remaining activation inputs: pinned Node evidence, maintainer candidate
acceptance, final npm identifier/availability/ownership and bootstrap procedure,
required reviewers/allowed refs, OIDC binding, hosting provider/account and
provider artifact packaging. The reviewed RC is not a stable npm release.
Changing version/private state creates new candidate bytes requiring another
review and separately authorized publication/deployment. Failure handling and
stable docs-only operation are specified in [release preparation](../../../docs/releases.md).

## Changed files and public review

- Package: manifest, README, Changesets changelog, generated capabilities JSON,
  shipped Skill and its control reference.
- Release tooling: root manifest/lockfile, `.changeset/`, metadata generation/copy,
  isolated archive rehearsal and pure release/workflow checks.
- Site: shared channel validation/component, metadata, docs channel labels,
  public metadata import for copied examples, TypeScript JSON import support.
- Browser checks: native primitive matrix, harness and version label expectation.
- Records: AGENTS, roadmap, release/development guides and Step 06 design/tasks/verification.

Root README, runtime APIs/compiler/validation, curated recipe definitions, vanilla
source remain unchanged. Existing CI moves its Chromium-install step before
`test:package`, which now exercises native Chromium hosts. No unrelated dependency
updates, migration scaffolding, production credential setup, branch, commit,
push, PR, archive, publication, deployment or outbound message occurred.
All 45 changed/new files and every archive file were reviewed for public
suitability. Marker scans found only the intentional private-path/credential
regex in the package checker, with no actual secret or personal path found. Next action is this candidate's acceptance and unresolved release gates;
there is no automatically authorized next implementation step.
