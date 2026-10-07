# Implementation roadmap

Status: Step 00 planning complete; Step 01 foundation implemented; Step 02
recipe playback implemented with automated evidence and maintainer manual
verification. Step 03 is implemented with automated evidence and maintainer
manual verification. Step 04 is implemented with automated evidence and
maintainer manual acceptance. Step 05 gallery and documentation are implemented
with local automated evidence and maintainer manual acceptance.

Read [AGENTS.md](../AGENTS.md) before implementation. Every numbered step is an
OpenSpec change with its own proposal, design, and tasks. Runtime changes also
have behavioral delta specs. Complete one authorized step, present its evidence,
and stop for review before continuing.

## Steps

| Step | Change | Outcome | Review gate |
| --- | --- | --- | --- |
| 00 | [Project contracts](../openspec/changes/00-project-contracts/proposal.md) | Public product brief, architecture, recipe study, release design, and ordered plan | Spec validation, link checks, public-content review |
| 01 | [Workspace foundation](../openspec/changes/01-workspace-foundation/proposal.md) | Library package, minimal site, local linking, package tests, CI | Clean checkout can build and consume the packed package |
| 02 | [Recipe playback](../openspec/changes/02-recipe-playback/proposal.md) | Versioned recipe validation and a confirmation sound | Chromium playback, lifecycle checks, and listening review |
| 03 | [Dynamic sounds](../openspec/changes/03-dynamic-sounds/proposal.md) | Variable impact and live thruster | Three-sound core, smooth controls, bounded resources |
| 04 | [Mixing and lifecycle](../openspec/changes/04-mixing-and-lifecycle/proposal.md) | Buses, shared effects, explicit native interop, interruption policy | Chromium integration and cleanup scenarios |
| 05 | [Gallery and docs](../openspec/changes/05-gallery-and-docs/proposal.md) | Polished listening experience and useful developer documentation | Local edit loop, keyboard usability, coherent examples |
| 06 | [Core release](../openspec/changes/06-core-release/proposal.md) | Release candidate, package metadata, agent guidance, separate release workflows | Clean package consumer, documented evidence, explicit publication approval |

The default order is 00 → 01 → 02 → 03 → 04 → 05 → 06. Step 00 is a
documentation-only change and intentionally uses OpenSpec's `skip_specs` flag.
Future specs remain in change directories until implemented and archived.
The existence of complete artifacts does not mean their tasks are implemented.

## Small core release option

After Step 03, the three-sound core may be sufficient for a small `0.1.0`
release. This is optional, not an automatic publication trigger. Explicitly
select the reduced Step 06 scope before proceeding: include only capabilities
actually implemented in Steps 01–03, a usable quick start, and all applicable
package, safety, listening, and public-content checks. Do not mark Steps 04–05
complete or ship their proposed APIs in release documentation.

The early release needs no full gallery, ten-sound catalog, or cross-browser
matrix. [Release gates](releases.md) apply equally to early and later releases.

## Later compatibility milestone

After the core gate, propose a separate OpenSpec change for Firefox and WebKit
automation plus real Safari/iOS and mobile checks. Reuse the established signal
and lifecycle tests, investigate actual differences, and update support claims
only with evidence. This milestone is deliberately not an initial CI dependency.

## Deferred work

Add offline rendering/caching only after a measured benefit and a semantic
equivalence design. Add 3D spatialization, sequenced ambience, extra effects,
registry distribution, MCP, and framework adapters only through new scoped
changes. The [ten-experience study](recipe-study.md) records their design pressure
without authorizing their implementation.

## Verification and execution

OpenSpec checks:

```sh
OPENSPEC_TELEMETRY=0 openspec validate --all --strict --no-interactive
OPENSPEC_TELEMETRY=0 openspec status --change 01-workspace-foundation
git diff --check
```

Application scripts in [local development](development.md) are now available.
See [Step 01 evidence](../openspec/changes/01-workspace-foundation/verification.md)
for foundation verification and [Step 02 evidence](../openspec/changes/02-recipe-playback/verification.md)
for playback verification. [Step 03 evidence](../openspec/changes/03-dynamic-sounds/verification.md)
records dynamic controls and maintainer listening acceptance. [Step 04 evidence](../openspec/changes/04-mixing-and-lifecycle/verification.md)
records routing and lifecycle checks and maintainer manual acceptance.
Step 05 implementation and automated checks are recorded in
[its verification note](../openspec/changes/05-gallery-and-docs/verification.md);
its maintainer listening review is accepted. Step 06 remains unimplemented.
At each gate, record exact commands and outcomes, browser/version where relevant,
listening evidence, and unresolved limitations in that change's verification note.
