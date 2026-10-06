# Local development and tooling design

Status: target workflow for Step 01. No package manifest, build, or development
server exists yet. Commands below must be implemented and verified before they
become onboarding instructions.

## Tool choices

Use pnpm workspaces, TypeScript, tsdown, Next.js App Router, compatible React,
Tailwind CSS, shadcn/ui with Base UI, Fumadocs MDX, Vitest, Playwright, Changesets,
publint, ESLint, and Prettier. No Turborepo or Nx is needed for this graph.
Add tools at the step that uses them; do not install presentation libraries just
to reserve them. The runtime has no framework dependencies.

On 2026-10-06 official documentation identifies Node 24 as LTS, pnpm 12 as the
current release line, Next.js 16.3.8 in its documentation, and TypeScript 6.0 as
a released line. Use these as candidates, not an untested compatibility promise.
Step 01 resolves current stable compatible releases, pins exact direct versions,
pins the package manager and Node baseline, and commits one lockfile. Do not use
canary builds or inherit older dependency versions from reference projects.

Verify tsdown declaration generation, Next/Fumadocs MDX integration, UI primitive
compatibility, and the test runner's Node requirements before locking the stack.
Record chosen versions in executable configuration, not repeated prose tables.

## Workspace linkage

The site and vanilla example declare a dependency on the local package:

```json
{
  "private": true,
  "dependencies": {
    "audiobits": "workspace:*"
  }
}
```

`audiobits` is the provisional package identifier. The workspace protocol requires
local resolution; it does not silently fetch another package with the same name.
No global `npm link`, registry upload, or release bump is needed for local work.

The library exports built ESM and declarations from `dist`. The website imports
those public exports. Do not alias imports to `src`: that could conceal broken
exports, missing generated files, and declaration/package problems.

## Development loop

Implement these root script contracts in Step 01:

| Target command | Required behavior |
| --- | --- |
| `pnpm dev` | Build the library once, then run its watcher and the site server; propagate failures and terminate both on exit |
| `pnpm build:lib` | Build ESM, declarations, and applicable generated metadata |
| `pnpm build:site` | Build the library first, then the website from that checkout |
| `pnpm build` | Build all applicable workspaces in dependency order |
| `pnpm typecheck` | Check runtime, site, and consumer types |
| `pnpm lint` | Check configured source and documentation rules |
| `pnpm test` | Run pure unit tests |
| `pnpm test:browser` | Run the pinned Playwright Chromium suite |
| `pnpm test:package` | Build, pack, validate, and install the tarball in an isolated consumer |

The first build must complete before Next starts. Confirm that edits emitted by
tsdown cause the site to update; use Next's `transpilePackages` for the workspace
if required by the selected integration. A browser refresh is acceptable if
audio state cannot safely survive a hot update. Dispose the previous engine on
unmount or hot replacement; never retain two contexts accidentally.

Prefer existing pnpm process support or a small explicit supervisor with correct
exit handling. Do not leave orphan watchers or add a large task orchestrator.

## Verification without publishing

There are two distinct checks:

1. Workspace integration: a library edit changes the local gallery and its tests.
2. Distribution integration: a clean consumer installs a locally packed tarball,
   imports its exports, typechecks, and plays a sample in Chromium.

The second check must run outside workspace resolution, with no source aliases
or access to unpublished source required. Inspect the archive file list for
metadata, declarations, license, and accidental internal/private files. Keep
temporary tarballs and consumer output untracked. No registry publication is
part of either check.

Once Step 02 exists, a library API change must update its tests and affected
site examples in the same change. CI builds the site after the library and
typechecks copied examples to catch drift.

## Independent deployment

Configure the site host to access the whole monorepo even if its app directory
is `apps/www`. Install from the root lockfile and invoke the root site build.
Library changes must trigger relevant site builds/previews; a path filter that
watches only `apps/www` is incorrect. Keep deploy credentials at the host or CI
boundary, not in repository files.

Hosting provider selection is deferred until deployment is requested. Next.js
does not require choosing a provider during library setup. See the separate
[release design](releases.md) for development versus stable documentation.

## References

- [pnpm workspaces](https://pnpm.io/workspaces)
- [tsdown watch mode](https://tsdown.dev/options/watch-mode)
- [Next.js local package support](https://nextjs.org/docs/app/api-reference/config/next-config-js/transpilePackages)
- [Node release policy](https://nodejs.org/en/about/previous-releases)
- [Fumadocs](https://www.fumadocs.dev/docs/ui)
