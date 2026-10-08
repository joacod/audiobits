# Independent site and library releases

## Current release state

AudioBits is publicly available on npm. Changesets prerelease mode has been exited, and only the
runtime package is publishable.
The [release workflow](../.github/workflows/release.yml) stages npm releases for
manual approval; it does not directly publish them. Site deployment remains
disabled. Root, site and example workspaces remain private.

Prerelease verification target: current Chromium. Other browsers and operating
systems are unverified and deliberately deferred.

## Release verification

Run this gate only when explicitly asked to prepare or verify a release candidate,
under the Node and pnpm versions pinned in the repository:

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

[The manual npm candidate workflow](../.github/workflows/npm-candidate.yml)
runs this gate and uploads archive evidence. [The manual site candidate
workflow](../.github/workflows/site-candidate.yml) prepares development site output
independently. Neither workflow publishes or deploys; Next build output still
needs provider packaging before deployment.

## Artifact and approval

Successful package rehearsal retains the `.tgz` and `evidence.json` under ignored
`node_modules/.cache/audiobits-release/`. Inspect the archive allowlist/content,
version, SHA-256, source identity and dirty-source flag. Keep artifacts and
local diagnostics out of Git. Obtain approval for the exact digest/version and
publication action; listening acceptance is separate from artifact approval.
Recreate and review after any shipped-file change.

## Publication

The production flow is Changesets → Version Packages PR → release gate →
automated npm staged publish → human 2FA approval. On pushes to `main` or a manual
run on `main`, Changesets selects versioning when changesets are pending, staging
when an unpublished version exists, or no action otherwise. The version job
creates or updates **Version Packages** for maintainer review and merge.

The staging job runs `pnpm release:prepare` from a clean GitHub-hosted checkout,
checks clean-source evidence, matching package version, archive existence and
SHA-256, then submits that exact verified tarball using `npm stage publish`.
It ends when npm accepts the stage. The maintainer inspects the staged package
and approves it separately with 2FA before it becomes public. No `NPM_TOKEN` or
long-lived npm publishing secret is used; only the staging job has OIDC access.
Git tags and GitHub Releases are not part of this workflow yet.

Before activation, the maintainer must configure the npm Trusted Publisher for
this repository and `release.yml`, allowing staged publishing, and enable
GitHub Actions to create pull requests. These external settings are not
configured by the repository. The workflow pins npm 11.19.0 and uses the
repository's Node/pnpm toolchain and centralized Linux/Chromium setup without
dependency caches in the staging job.

Package publication and site deployment remain independent. After registry
verification, stable site builds require `AUDIOBITS_DOCS_CHANNEL=stable`, a
non-private nonzero stable package version, matching `AUDIOBITS_RELEASED_VERSION`,
and `AUDIOBITS_DOCS_SOURCE` containing the reviewed full source commit SHA.
These inputs attest release alignment; the build does not verify npm itself.
Development/preview output remains labelled Development or Unreleased. Stable
docs-only fixes use the confirmed version and release-aligned source line.

## Recovery

If npm publication fails or its outcome is ambiguous, verify registry existence
and integrity before retrying. Do not republish an already-published version;
correct published defects with a new version. Retain the prior stable site when
package publication fails.

If site deployment fails, retain the prior deployment and report the mismatch.
Retry or roll back hosting independently; never republish npm to retry a site
operation.
