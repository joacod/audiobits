# Independent site and library releases

Status: private candidate preparation is configured; publication and deployment
remain disabled. Local evidence does not establish production readiness.

## Two outputs from one repository

| Output                  | Build input                                   | Release action               |
| ----------------------- | --------------------------------------------- | ---------------------------- |
| Documentation/demo site | Site and local library from the same checkout | Website deployment           |
| npm runtime             | Validated archive of `packages/audiobits`     | Explicit package publication |

Root, site, and example workspaces stay `private: true`. Initially keep the
library private too; make it publishable only in the explicitly approved first
release change. No branch merge, site deploy, or Changeset alone publishes npm.

Changesets records user-facing library changes. A docs-only edit has no library
version bump. A library change updates affected examples and docs atomically,
but deploying those changes is still separate from package publication.

## Documentation channels

Local development and previews consume `workspace:*` and identify the checkout
as development/unreleased. Before the first npm release, any public site clearly
states that the library is unreleased and offers no misleading npm installation.

After the first release, stable documentation builds from a release-aligned ref.
Docs-only fixes can deploy from that line without republishing the package. If
main contains unreleased library changes, its site is a development preview with
an explicit version/channel label; do not replace stable documentation with it.

A minimal release branch plus host production-ref setting is sufficient; do not
build a multi-version documentation router initially. Before an npm release,
prepare both the package and matching stable site artifacts from the same source.
If npm publication fails, retain the prior stable site. If the subsequent site
deployment fails, retain its prior deployment and report the temporary mismatch.

## First core release gate

Release preparation verifies the implemented sound set and reasonable 0.1 API:

- Eight working sounds with documented controls and cleanup behavior.
- Focused unit tests and Chromium runtime/browser checks pass.
- Listening review confirms the shipped sounds and control transitions.
- Clean tarball consumption verifies ESM imports, declarations, and browser use.
- Node import/recipe validation works without browser globals or side effects.
- README and quick start describe only implemented, verified APIs.
- Archive contents, license attribution, public docs, and diffs are reviewed.
- Browser limitations and known issues are stated accurately.
- Final npm identity, ownership, and naming decision are confirmed.
- The exact artifact/version and publication action receive explicit approval.

Run the final Chromium, Firefox and WebKit matrix before release. Listening and
physical-device evidence remain separate. Never defer ownership, validation or
failed-start handling because publication is disabled.

## Publication workflow

Prepare Changesets and release checks early, but leave publication disabled until
the first core gate. Use a separately invoked, protected release workflow; build
from a reviewed ref, run applicable checks, validate package contents, and publish
only the intended runtime package. Serialize releases to avoid version races.

Prefer npm trusted publishing/OIDC with provenance where supported. First-package
bootstrap and trusted-publisher configuration depend on the final npm owner and
registry setup; confirm the supported flow at release time. Do not fabricate an
existing package configuration or store a long-lived token in the repository.

Inspect source maps and generated metadata for private paths. Use a package
file allowlist rather than shipping the whole repository. The repository Skill
can be available separately; a compact guide may be included if deliberately
listed and kept in sync with the installed version.

## Failure and recovery

Validate the built archive before publishing. A failed release must report
whether the version actually exists before retrying; do not blindly resubmit.
Published versions are immutable: correct defects with a new patch and, when
appropriate and authorized, deprecate a broken version. Do not assume npm can
be rolled back by overwriting a version.

Website rollback restores a known deployment/ref without changing npm. Package
release failures do not require rebuilding unrelated website content.

## References

- [Changesets](https://github.com/changesets/changesets)
- [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/)
- [publint](https://publint.dev/)

## Private candidate preparation

Candidate scope follows the implemented runtime and curated sound set. The private candidate is
`0.1.0-rc.0`; Changesets 3.0.3 applied the initial minor note in `rc` mode.
It includes curated recipes, schema-1 oscillator/white-noise
sources and filters, seeded variation, play/live controls, bounded voices,
buses/shared delay, explicit native interop and lifecycle APIs. Deferred
features in the recipe study remain unavailable.

Run the preparation gate from the repository root under the pinned Node version:

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm release:prepare
```

`release:prepare` runs lint, types, units, the full Chromium integration suite,
and the isolated packed-package check. `pnpm test:package` is also a focused
rehearsal: strict publint, a complete archive allowlist/content review, offline
consumer install, Node imports without browser globals, declaration resolution,
metadata versions, packaged Markdown examples, unused-import tree-shaking, and
native Chromium playback/Stop/disposal of the exact quick start and Skill host.
It starts an ephemeral loopback server and requires the installed Chromium binary.
No registry authentication, registry write or hosting account is used.

On success the focused check retains the candidate archive and `evidence.json`
in ignored `node_modules/.cache/audiobits-release/`. Evidence identifies the
archive SHA-256, bytes, version, file inventory, source commit, dirty-source flag,
Node and Chromium versions, and results. A dirty source commit is a baseline,
not the candidate's complete source identity; the archive digest identifies the
actual reviewed bytes. Recreate and review after any shipped-file change. Local
artifacts and diagnostics must not enter Git.

The generated `audiobits/capabilities.json` derives recipe enums from the schema
descriptor and version/status from the manifest. `pnpm test` rejects metadata
or schema drift. Runtime capability inventory is deliberately compact and
reviewed against focused API tests; it is not inferred from roadmap prose.
The schema describes structure; `validateRecipe` also checks semantic and
resource constraints. The archive deliberately ships its Skill, controlled
sound reference, package README, and Changesets changelog.

### Separate workflow contracts

[The npm candidate workflow](../.github/workflows/npm-candidate.yml) is manually
invoked, serialized in its own concurrency group, runs the full preparation
gate, and uploads the reviewed archive/evidence. Its publication job is
unconditionally disabled and fails closed if its guard alone is removed.
It names the future `npm-production` environment and limits OIDC permission to
that disabled job. The environment name does not establish configured reviewers
or npm ownership. No publish command or production token is present.

[The site candidate workflow](../.github/workflows/site-candidate.yml) is
independently invoked and serialized. It prepares development site output
without changing library versions. Its deployment job is likewise disabled;
provider commands, account configuration and protected `site-production`
reviewers remain release-time inputs. A Next build artifact needs provider
packaging before deployment; uploading it does not establish deployability.
Neither workflow invokes the other. A failed gate uploads no success candidate
and reaches no production job. These are local-reviewed contracts, not evidence
of a successful hosted run.

Default site builds label the private candidate Unreleased. After separately
approved package activation, previews still label local output Development.
A stable build additionally requires all of:

- `AUDIOBITS_DOCS_CHANNEL=stable`.
- A non-private package with a nonzero stable version (no prerelease suffix).
- `AUDIOBITS_RELEASED_VERSION` matching the package version, supplied only after
  successful registry verification of the approved artifact.
- `AUDIOBITS_DOCS_SOURCE` containing the reviewed full source commit SHA.

Incorrect channel values, private/prerelease candidates, mismatched versions,
and missing source identity fail the site build. These inputs are release
attestations; the build does not query npm or prove publication itself. Channel
and version labels on every API page derive from the same build metadata.
For stable docs-only corrections, retain the confirmed package version and build
from the release-aligned source line. Do not promote stable docs on a failed
package publication. If site deployment fails, retain the previous deployment
and report the mismatch; never republish npm to retry a site operation.

### Remaining activation inputs

Before an actual release, confirm the final npm identifier, name availability,
owner and first-package bootstrap method. Then configure required reviewers and
allowed source refs for each production environment and confirm the selected
hosting provider. Prefer npm trusted publishing where the confirmed bootstrap
flow supports it; recheck [npm's current instructions](https://docs.npmjs.com/trusted-publishers/)
at activation. No ownership or hosted URL is assumed by this candidate.

Obtain approval for the exact digest/version, separately transition out of
Changesets prerelease mode and make only the runtime publishable, then rerun
and review the resulting stable archive. An approved RC digest does not identify
those newly changed stable bytes. Configure publication to consume the approved
archive, and verify registry existence/integrity before retrying any ambiguous
failure. Keep the previously stable site on failure. Published defects require
new versions; website rollback changes only the hosting deployment.

Current PR checks and ignored archive evidence identify actual candidate bytes.
Foundation acceptance is historical; new sounds and exact candidate artifacts
need listening review before release. Production inputs remain unresolved.
