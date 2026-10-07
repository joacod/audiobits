# Tasks

Prerequisite: Normally Steps 01–05 accepted. An explicitly selected early-core scope may depend on Steps 01–03 only, with no claims about unimplemented later capabilities. Preparation is implemented for local acceptance review. The full Steps 01–05
candidate is selected. See verification.md for executed evidence and unresolved
pinned-toolchain/production activation inputs; publication remains disabled.
Stop after this change's acceptance review. Command names must match
the actual package scripts created in Step 01.

## 1. Candidate scope and package

- [x] 1.1 Select full or explicitly approved early-core candidate scope and list its shipped capabilities; verify release notes exclude unimplemented features.
- [x] 1.2 Prepare version metadata/Changeset and package allowlist; verify clean build, publint, declaration resolution, schema exports, tree-shaking, and archive file review.
- [x] 1.3 Run the isolated tarball quick start in Chromium and Node import tests; record exact candidate version/source and results without publication.

## 2. Guidance and documentation

- [x] 2.1 Generate shipped recipe schema/capability metadata and drift checks; verify all advertised operations have executor/validation coverage.
- [x] 2.2 Write the concise AudioBits Skill and API references from the tested package; typecheck and run its examples and avoid MCP/migration scaffolding.
- [x] 2.3 Update README and stable/development documentation behavior for the candidate; verify no unverified npm identifier or deployment URL is presented as active.

## 3. Release preparation and gate

- [x] 3.1 Prepare separate disabled/manual protected npm and site workflow contracts, including failure handling and concurrency; verify dry preparation performs no registry write or deployment.
- [x] 3.2 Review licensing, naming/package ownership readiness, public content, and source maps; record unresolved activation inputs instead of inventing credentials or ownership.
- [x] 3.3 Record unit, Chromium, package, listening, and performance evidence in verification.md; state excluded browsers and known limitations, then present the concrete candidate for separate publication/deployment approval.
