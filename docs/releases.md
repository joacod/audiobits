# Package publication and recovery

## Delivery boundaries

Only the runtime package is publishable.
The [release workflow](../.github/workflows/release.yml) directly publishes npm releases
through OIDC Trusted Publishing and then creates matching Git tags and GitHub
Releases. Root, site and example workspaces
remain private.

Current Chromium is the only automated browser verification target. Other
browsers and operating systems are unverified and deliberately deferred.

## Release verification

Use `pnpm release:prepare` as the explicit release verification entry point.
Run it only when asked to prepare or verify a release candidate, under the Node
and pnpm versions pinned in the repository:

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm release:prepare
```

On Linux, run [centralized audio setup](../scripts/ci/setup-linux-audio.sh) before
browser verification. The gate runs lint, typechecking, units, production builds,
Chromium integration and `test:package`. The package rehearsal includes strict
publint, archive inventory, a clean offline consumer install, SSR-safe imports,
TypeScript examples, tree-shaking and packed Chromium host checks. Automated
correctness does not establish listening quality or physical-device support.

## Verified artifact

Successful package rehearsal retains the `.tgz` and `evidence.json` under ignored
`node_modules/.cache/audiobits-release/`. Inspect the archive allowlist/content,
version, SHA-256, source identity and dirty-source flag. Keep artifacts and
local diagnostics out of Git. Merging the Version Packages PR is the human
release decision; listening acceptance remains separate from automated artifact
verification. Recreate and review after any shipped-file change.

## Publication

The production flow is Changesets → Version Packages PR → maintainer merge →
release gate → direct npm publish via OIDC → public availability verification →
Git tag → GitHub Release. On pushes to `main` or a manual run on `main`,
Changesets selects versioning when changesets are pending, publication when an
unpublished version exists, or no action otherwise. An already-published version
causes no publication, including after an infrastructure-only workflow change.
The version job creates or updates **Version Packages**; its maintainer review
and merge is the human release decision.

The publish job runs `pnpm release:prepare` from a clean GitHub-hosted checkout,
checks clean-source evidence, matching package version, archive existence and
SHA-256, then publishes that exact verified tarball without repacking:

```sh
npm publish "$RELEASE_ARCHIVE" --access public --tag latest
```

No `NPM_TOKEN` or long-lived npm publishing secret is used. npm authentication
is exclusively OIDC Trusted Publishing. Only the publish job has
`id-token: write`; its GitHub permission is `contents: read`. The Version
Packages job has no OIDC permission.

After publication succeeds, a separate GitHub Release job uses the workflow's
normal `GITHUB_TOKEN` with `contents: write` and no OIDC permission. It checks out
the exact published `github.sha`, derives the version from the package manifest,
and checks the public registry for that exact version every 15 seconds for up
to 10 minutes. npm publish-time security scanning can delay public availability;
finalization fails clearly if the version does not appear within this bound.

Only after availability verification does the job create `v<package-version>`
at that exact release commit and a release titled `audiobits v<package-version>`.
Notes contain only that version's section of the package changelog. An existing
tag at a different commit fails without moving it; a matching tag and existing
release are treated as complete.

The maintainer must configure the npm Trusted Publisher for this repository and
`release.yml`, with **`npm publish` permission enabled**, and enable GitHub
Actions to create pull requests. These external settings are not configured by
the repository. The workflow defines the npm version and uses the repository's
Node/pnpm toolchain and centralized Linux/Chromium setup without dependency
caches in the publish job.

Package publication and website delivery are independent. The site reads its
package version from `packages/audiobits/package.json`. Before delivering site
changes, review the source and examples against the published API; a site build
does not verify npm availability.

## Recovery

If npm publication fails or its outcome is ambiguous, verify registry existence
and integrity before retrying. Do not republish an already-published version;
correct published defects with a new version. Retain the prior stable site when
package publication fails.

If public availability verification or GitHub Release finalization fails after
npm accepts publication, use GitHub Actions **Re-run failed jobs** to retry only
the downstream GitHub Release job. It checks existing tags/releases again and
does not republish the immutable npm version.

If site deployment fails, retain the prior deployment and report the mismatch.
Retry or roll back hosting independently; never republish npm to retry a site
operation.
