# Independent site and library releases

Status: release design, not configured automation or publication authorization.

## Two outputs from one repository

| Output | Build input | Release action |
| --- | --- | --- |
| Documentation/demo site | Site and local library from the same checkout | Website deployment |
| npm runtime | Validated archive of `packages/audiobits` | Explicit package publication |

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

The earliest candidate is the Step 03 core, after an explicit decision to use
the reduced release scope described in [the roadmap](roadmap.md). Requirements:

- Three working sounds with documented controls and cleanup behavior.
- Focused unit tests and Chromium runtime/browser checks pass.
- Listening review confirms the shipped sounds and control transitions.
- Clean tarball consumption verifies ESM imports, declarations, and browser use.
- Node import/recipe validation works without browser globals or side effects.
- README and quick start describe only implemented, verified APIs.
- Archive contents, license attribution, public docs, and diffs are reviewed.
- Browser limitations and known issues are stated accurately.
- Final npm identity, ownership, and naming decision are confirmed.
- The exact artifact/version and publication action receive explicit approval.

Do not require Firefox/WebKit/mobile acceptance or ten showcase sounds for this
small release. Do not defer core ownership, disposal, validation, or failed-start
handling merely because compatibility work is deferred.

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
