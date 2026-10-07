# Workspace foundation: design

## Context

Step 00 planning review. This is a proposed change; no implementation or validation is implied
by the presence of these artifacts.

## Goals / Non-Goals

Deliver the bounded outcomes in [the proposal](proposal.md) and the scenarios in
[the capability spec](specs/workspace-development/spec.md). Broader browser validation,
automatic npm publication, and unrelated ecosystem work are outside this step.

## Decisions

Follow [the development design](../../../../development.md). Use Node 24 LTS
and current compatible stable dependencies; pin exact direct versions. Confirm
tsdown declarations, Next/Fumadocs, shadcn/Base UI, and Vitest/Playwright work
together before locking. Record exact versions in configuration.

Create a private root and private `www` and vanilla workspaces. Initially mark
the runtime private as a publication guard. Use package exports pointing to
`dist`, ESM only, declarations, and a narrow file allowlist. Use a minimal pure
export to prove package boundaries; do not create empty engine classes.

The site declares `audiobits: workspace:*` and imports only public exports.
Build once before starting concurrent watcher/server processes. Propagate exit
codes and stop child processes on termination. Verify rebuild detection in
Next; use `transpilePackages` if needed, not aliases into source.

Create a tiny vanilla TypeScript consumer with the smallest suitable browser
build setup, using Vite only for that concrete consumer/test need. The package
test installs the built tarball into an isolated temporary consumer outside
workspace resolution. Never require publication for development.

CI installs the frozen lockfile and runs lint, typecheck, unit/package checks,
site build, and Chromium smoke checks as applicable. Keep audio behavior out of
placeholder tests. No Firefox/WebKit jobs or deployment credentials.

## Risks / Trade-offs

- Watching built files adds a build boundary → test fresh start and an edit, and
  document refresh behavior instead of claiming unverified hot reload.
- Workspace resolution can hide package defects → require the isolated tarball test.
- A minimal shell can invite premature design work → leave gallery polish to Step 05.

## Migration Plan

There is no previous package/API to migrate. Add only the foundation, update
README with commands actually verified, and stop at the Step 01 gate.
