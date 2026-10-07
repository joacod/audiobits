# Project instructions

## Scope and status

AudioBits is a browser-native procedural audio library with a separate public
documentation and demo site in one monorepo. Read [the roadmap](docs/roadmap.md)
and the selected OpenSpec change before implementation. The repository has a
workspace foundation and a three-sound development preview. Step 02 playback
and manual listening passed; Step 03 dynamic controls are implemented with
automated evidence and maintainer manual acceptance. Step 04 routing/lifecycle APIs are implemented with automated evidence and
maintainer manual acceptance;
Steps 05–06 remain proposed. Use the
roadmap and each change's verification note for current status.

- Work on the explicitly selected step. Do not automatically start the next.
- Explain material scope changes before implementing them. Keep changes small.
- Read relevant files first and preserve unexpected worktree changes.
- Planning approval does not authorize runtime implementation or publication.
- Ask before destructive changes, commits, branches, pushes, PRs, deployments,
  npm publication, or outbound messages unless already explicitly authorized.

## Main README during implementation

- Until all implementation steps are complete, keep the root `README.md` limited
  to the project name, a brief description, unreleased status, and license.
- Do not add usage examples, installation instructions, feature lists,
  documentation navigation, planning details, step status, verification evidence,
  or localhost links to the root README during this period.
- Keep implementation documentation in the relevant package README, `docs/`,
  or OpenSpec change. Runtime documentation requirements do not authorize
  expanding the root README.
- After implementation is complete, expand the root README only when explicitly
  requested as a separate documentation task.

## Public repository hygiene

- Every tracked file, including specs, examples, fixtures, comments, and agent
  instructions, must be suitable for a public audience.
- Never copy private handoffs, conversation logs, credentials, personal details,
  local absolute paths, machine configuration, or private repository links.
- Reference other projects by name or a verified public URL when useful. This
  project must be understandable without access to them.
- Use relative repository links. Do not commit generated local diagnostics,
  browser profiles, audio captures, or build artifacts accidentally.
- Before handoff, inspect the complete changed content, including new files,
  for private information, secrets, local paths, and misleading claims.

## Architecture boundaries

- One publishable runtime package, `packages/audiobits`; use folders before
  creating more packages. The root, site, and examples are private workspaces.
- The runtime has no React, Next.js, DOM UI, or framework dependencies and aims
  for zero runtime dependencies. Do not add speculative dependencies.
- Imports and recipe validation must work without browser globals. Create the
  audio context lazily through an explicit user-gesture start path.
- Recipes are versioned JSON data. Keep callbacks and native nodes outside the
  recipe schema; never evaluate recipe strings as code.
- Preserve the distinction between reusable sound definitions and individual
  voices. Define resource ownership, effect tails, and disposal for every path.
- Use audio-context time for sound scheduling. UI animation is not an audio clock.
- Keep runtime safety and focused tests with each feature. Chromium is the only
  initial browser gate; do not expand the matrix before the core milestone.
- Native escape hatches are explicit and caller-owned unless ownership is
  transferred by a documented API. Never imply native graphs are serializable.

## Monorepo workflow

- Use pnpm workspaces and exact direct dependency versions, with `workspace:*`
  for internal dependencies. Verify current stable compatibility during setup.
- The website imports the library through its public package exports, never
  through relative source imports or TypeScript aliases into package internals.
- Build library output before the site; watch library output during local work.
  A library edit must be testable locally without npm publication.
- Keep site deployment and npm publishing separate. Docs-only changes do not
  require a library version. Runtime changes include relevant docs and examples.
- Do not publish development API documentation as if it were the npm release.
- No backend, accounts, telemetry, registry, MCP server, worklet, WASM, or
  monorepo orchestrator without a demonstrated requirement and approved scope.

## OpenSpec workflow

- Use the installed CLI and its version-matched instructions; the planning
  baseline was authored with OpenSpec 1.14.0 and the `spec-driven` schema.
- Read proposal, design, delta specs, and tasks for the selected change.
- `openspec/specs` describes completed, archived behavior. Future requirements
  remain in `openspec/changes`; artifact completeness is not implementation.
- Do not archive a change with unmet tasks or missing acceptance evidence.
- Keep task checkboxes accurate. Record verification with the relevant step.
- Later changes depend on earlier contracts. Reconcile them after an API change
  before starting the next step; do not silently preserve stale designs.
- Use `OPENSPEC_TELEMETRY=0 openspec validate --all --strict --no-interactive`
  for spec validation. Application verification commands must come from actual
  package scripts once those exist.

## Evidence and handoff

Keep pure tests, browser checks, listening review, performance measurements, and
release checks distinct. Mocks do not establish audible quality. Do not claim
Safari, Firefox, or mobile support from Chromium results.

Report files changed, behavior or decisions changed, intentional exclusions,
verification commands and results, remaining gaps, and the next step. Stop at
the selected step's review boundary.
