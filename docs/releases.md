# Independent site and library releases

## Current release state

AudioBits is publicly available on npm. Changesets prerelease mode has been exited, and only the
runtime package is publishable.
Automated npm publication and site deployment remain disabled. Root, site and example
workspaces remain private.

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

Automated publication requires a separately approved change: confirm npm identity, ownership
and bootstrap, configure protected production environments/reviewers and allowed
refs. The runtime is already publishable and out of Changesets prerelease mode.
Approve the verified stable archive bytes before publication. Prefer npm
trusted publishing/OIDC where the confirmed bootstrap supports it; the disabled
`npm-production` job alone requests `id-token: write`. It currently has no publish
command. Configure publication to consume the approved archive.

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
