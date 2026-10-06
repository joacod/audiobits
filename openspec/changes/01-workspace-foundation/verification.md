# Step 01 verification

Status: workspace foundation implemented; local automated checks passed.
Awaiting the Step 01 review boundary. This change is not archived and Step 02
has not started.

## Implemented scope

- Four pnpm workspaces: private root, guarded private runtime, private Next.js
  site, and private vanilla consumer. All direct dependencies are exact-pinned;
  local library dependencies use `workspace:*`.
- `audiobits` exposes only the pure `workspaceStatus` marker. tsdown emits ESM
  and declarations. The runtime has zero runtime dependencies and no browser
  initialization. No engine or placeholder sound API was added.
- Next.js imports built public exports using `transpilePackages`. A minimal
  Fumadocs MDX page, Tailwind styles, and keyboard-operated Base UI disclosure
  establish the site toolchain. The vanilla consumer uses Vite.
- The development supervisor completes the initial library build, starts the
  watcher and site, propagates child failures, and stops owned process groups.
  SIGTERM escalates to SIGKILL after a grace period for unresponsive children.
- Package validation, TypeScript checks, formatting, relative Markdown file
  checks, focused supervisor tests, and a Chromium-only CI workflow are added.
  README and development guidance now document implemented commands.

## Baseline and dependency resolution

Executed on local macOS arm64 with Node 24.21.0 and pnpm 12.9.1. Exact tooling
versions live in `.node-version`, `package.json`, workspace manifests, and the
single lockfile. Temporary tooling was used for local validation; no global
Node installation was changed.

Stable registry metadata and peer contracts were checked before installation.
TypeScript 6.0 was selected because TypeScript ESLint does not yet accept 7.0.
ESLint 9 was selected because Next's React/import/accessibility plugins do not
yet accept ESLint 10. The latest TypeScript ESLint tag referenced an unavailable
transitive package, so the preceding complete stable release was used.
Next/Fumadocs/Vite versions also satisfy pnpm's 48-hour release-age safeguard;
strict peer validation remains enabled. Only required native-tool install
scripts are allowlisted.

These are compatible stable selections, not a claim that every tool is the
latest release. shadcn presentation components and Changesets are deferred to
steps that use them, as required by the tooling design.

## Executed checks

| Command | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | Passed in the working checkout |
| `pnpm install --frozen-lockfile --offline` | Passed in an isolated source copy with no dependency/build outputs, using the populated pnpm store |
| `pnpm lint` | ESLint, in-scope formatting, and relative Markdown file targets passed |
| `pnpm typecheck` | Runtime, site, and vanilla types passed, including generated Next/MDX types |
| `pnpm test` | Six supervisor checks passed: initial build failure, nonzero/zero watcher exit, SIGINT/SIGTERM cleanup, and interruption of a stalled initial build |
| `pnpm test:package` | publint strict, five-file archive allowlist, offline isolated npm install, NodeNext typecheck, and Node import passed |
| `pnpm build` | Library, site, and vanilla production builds passed |
| `pnpm exec playwright install chromium` | Pinned Chromium available |
| `pnpm test:browser` | Three Chromium checks passed from the clean source copy, including its production build |
| `OPENSPEC_TELEMETRY=0 openspec validate --all --strict --no-interactive` | Seven changes passed |
| `git diff --check` | Passed |

The clean source copy repeated package and type checks outside the original
checkout. It reused cached dependency archives, so this is clean workspace
installation evidence, not an empty-cache network-download claim.

The archive contains exactly `package.json`, `README.md`, `LICENSE`,
`dist/index.js`, and `dist/index.d.ts`. The temporary external consumer resolves
only its installed package. Its Node import runs without `window` or
`AudioContext`. A separate missing-workspace fixture made offline installation
fail with “no package named audiobits is present”, demonstrating that
`workspace:*` does not fall back to a registry package.

## Development loop and Chromium evidence

In the isolated source copy, library output and Next output were moved aside
before `PORT=3200 pnpm dev`. The initial build recreated library exports before
site startup. Playwright Chromium displayed the public marker value, then a
source edit was emitted by tsdown and appeared after a page refresh. The source
was restored afterward. SIGINT closed the server and all 16 recorded descendants
of the development process, including watcher and server children.

Playwright 1.63.0 used Chromium 153.0.8010.12. Production browser checks covered:

- Public export display and a keyboard-operated Base UI disclosure.
- Fumadocs rendering of the development-only MDX page.
- The vanilla consumer displaying its built public import.

Supervisor tests also cover a grandchild that ignores SIGTERM and a stalled
initial build that ignores SIGTERM. Both are terminated by the grace-period
escalation. A successful but unexpected watcher exit is treated as failure.

## Public-content review

Reviewed all changed and new source, configuration, documentation, and lockfile
content locally. Scanned for personal absolute paths and credential patterns,
checked manifest privacy and exact direct versions, verified relative Markdown
file targets, inspected the complete packed file list, and confirmed the package
license matches the unchanged root license. Generated diagnostics, browser
reports, dependency folders, tarballs, and build output remain ignored.

No source aliases into package internals, private project links, deployment
credentials, or unsupported audio claims were introduced. This review covers
local files and the locally packed archive; remote history, hosted previews,
and registry artifacts were not inspected.

## Limitations and intentional exclusions

- Next's Turbopack MDX worker failed with a local port-permission error in this
  environment. The verified foundation explicitly uses webpack. Fumadocs emits
  webpack cache-analysis warnings; clean builds, MDX rendering, and library
  edit visibility passed despite those warnings.
- Repeated signal delivery exposed a supervisor shutdown bug during validation;
  shutdown was made idempotent and the final six checks passed.
- Installation reports deprecated transitive analyzer/codegen packages and the
  required ESLint 9 compatibility line. No unsupported peer override was added.
- CI configuration is present and its commands passed locally; GitHub-hosted
  Linux results have not been verified. Windows process-tree cleanup is unverified.
- The relative-link check does not validate remote URLs or heading anchors.
- Browser checks are Chromium automation. They establish neither other-browser
  or mobile support nor human listening quality. No audio signal, live-engine,
  listening, or performance evidence exists at this step.
- Audio playback/recipes, gallery polish, release metadata/Changesets,
  deployments, and npm publication remain deferred. No deployment or npm
  publication was performed.

Next review: accept Step 01, then explicitly select Step 02 recipe playback.
