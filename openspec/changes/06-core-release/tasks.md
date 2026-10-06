# Tasks

Prerequisite: Normally Steps 01–05 accepted. An explicitly selected early-core scope may depend on Steps 01–03 only, with no claims about unimplemented later capabilities. All tasks below are unimplemented. Work on this change
only when selected; stop after its acceptance review. Command names must match
the actual package scripts created in Step 01.

## 1. Candidate scope and package

- [ ] 1.1 Select full or explicitly approved early-core candidate scope and list its shipped capabilities; verify release notes exclude unimplemented features.
- [ ] 1.2 Prepare version metadata/Changeset and package allowlist; verify clean build, publint, declaration resolution, schema exports, tree-shaking, and archive file review.
- [ ] 1.3 Run the isolated tarball quick start in Chromium and Node import tests; record exact candidate version/source and results without publication.

## 2. Guidance and documentation

- [ ] 2.1 Generate shipped recipe schema/capability metadata and drift checks; verify all advertised operations have executor/validation coverage.
- [ ] 2.2 Write the concise AudioBits Skill and API references from the tested package; typecheck and run its examples and avoid MCP/migration scaffolding.
- [ ] 2.3 Update README and stable/development documentation behavior for the candidate; verify no unverified npm identifier or deployment URL is presented as active.

## 3. Release preparation and gate

- [ ] 3.1 Prepare separate disabled/manual protected npm and site workflow contracts, including failure handling and concurrency; verify dry preparation performs no registry write or deployment.
- [ ] 3.2 Review licensing, naming/package ownership readiness, public content, and source maps; record unresolved activation inputs instead of inventing credentials or ownership.
- [ ] 3.3 Record unit, Chromium, package, listening, and performance evidence in verification.md; state excluded browsers and known limitations, then present the concrete candidate for separate publication/deployment approval.
