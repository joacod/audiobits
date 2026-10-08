# AudioBits agent rules

AudioBits is a browser-audio project with a public npm package.

Complete the requested task with the smallest coherent change.

## Scope contract

- Treat the user's request as the scope contract.
- When a prompt provides Goal / Scope / Do not / Verification / Stop when,
  those sections are authoritative.
- Do not perform adjacent improvements, compatibility work, infrastructure
  changes, documentation rewrites, refactors, cleanup, or feature work unless
  required to complete the requested task.
- Do not fix unrelated failures. Mention them briefly as deferred notes and
  leave them unchanged.
- Do not inspect the repository for additional work after the requested task
  and focused verification are complete.
- Preserve unrelated worktree changes.
- Do not create plans, specs, ADRs, abstractions, or new process machinery
  unless the task actually requires an architectural decision.
- Do not modify CI, release infrastructure, package boundaries, or public APIs
  unless the requested task explicitly concerns them.
- Do not commit, push, branch, publish, or release unless explicitly requested.
- Derive the current `audiobits` version from `packages/audiobits/package.json`
  or generated metadata instead of hardcoding it in prose or tests. Keep exact
  versions in changelogs, release/migration/prerelease history and other
  version-specific records; never rewrite history during a normal version bump.

## Changesets

- Include a Changeset when a PR meaningfully changes the published package's
  user-visible behavior, public API, exported recipes, runtime behavior or
  package-shipped documentation, unless the user explicitly says not to.
- Choose the smallest correct semver: patch for compatible bug fixes or shipped
  package corrections; minor for new backward-compatible public functionality;
  major for backward-incompatible public changes.
- Website-only, CI/release infrastructure, tests-only, agent/process docs and
  internal refactors without published behavior changes generally need no Changeset.
- During ordinary feature/fix work, do not run `changeset version`, `npm publish`,
  `npm stage publish` or `npm stage approve`. Release timing belongs to the
  Version Packages PR and release workflow.

## Architecture boundaries

- `packages/audiobits` remains framework-independent and has zero runtime
  dependencies unless explicitly reconsidered.
- Recipes remain portable, serializable, versioned data and contain no UI or
  application state.
- Prove missing audio primitives with a concrete sound/use case before adding
  them; prefer composition first.
- Avoid speculative DAW, MIDI, recording, streaming, framework adapters, MCP,
  AudioWorklet, WASM, and other scope expansion.

## Verification discipline

- Run the smallest check set that can validate the requested change.
- Chromium is the only prerelease browser verification target.
- Do not perform Firefox, WebKit, Safari, device, OS, or compatibility work
  unless explicitly requested.
- Do not run `release:prepare` or equivalent release gates unless explicitly
  asked to prepare/verify a release.
- Never hide failures with sleeps, retries, timeout increases, weaker
  assertions, ignored errors, or skips.
- When investigating a flake, reproduce the violated product/test/environment
  invariant directly.
- CI environment setup belongs in centralized repository scripts, not
  individual tests.
- Automated Chromium tests do not establish subjective listening quality or
  broader browser/device compatibility.

## Instruction hierarchy

- Read the nearest nested `AGENTS.md` before changing a subproject.
- `docs/development.md` is the command/reference guide.
- Read `docs/releases.md` only for an explicit release/publication task.
- Do not load website design/Impeccable context unless the task involves
  substantial `apps/www` design or UX work.

## Delivery

- Stop once the requested work and focused verification are complete.
- Keep tracked content public: no credentials, personal details, machine paths,
  diagnostics, or captures. Inspect complete changed content before handoff.
- Report what changed and which checks were run.
- Mention directly relevant unresolved issues.
- Mention unrelated discoveries only as deferred notes; do not act on them.
