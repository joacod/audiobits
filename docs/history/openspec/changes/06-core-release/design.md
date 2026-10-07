# Core release readiness: design

## Context

Normally Steps 01–05 accepted. An explicitly selected early-core scope may depend on Steps 01–03 only, with no claims about unimplemented later capabilities. The full Steps 01–05 candidate is now implemented for local review; actual
checks and remaining activation gates are recorded in [verification](verification.md).

## Goals / Non-Goals

Deliver the bounded outcomes in [the proposal](proposal.md) and the scenarios in
[the capability spec](specs/release-distribution/spec.md). Broader browser validation,
automatic npm publication, and unrelated ecosystem work are outside this step.

## Decisions

Use [the release design](../../../../releases.md). Default candidate includes
completed Steps 01–05. If early-core scope is explicitly selected, constrain
every capability list, Skill example, and release note to Steps 01–03. Do not
require ten sounds or other-browser validation.

Prepare a candidate archive before seeking publication approval. Verify exact
file contents, ESM declarations, schema metadata, license, source-map paths, and
clean consumer behavior. Include zero-runtime-dependency and tree-shaking checks.
The package quick start must actually play and clean up in Chromium.

Add compact schema/capability metadata from shipped implementation and a concise
repository Skill with progressively loaded references. Do not generate MCP code
or migration entries for a nonexistent second schema. Verify Skill examples
against the same candidate package.

Use Changesets for runtime version notes; keep root/site/examples private.
Keep library private until the final approved release change. Configure a
separate manual/protected npm workflow with concurrency control and trusted
publishing when the final owner/first-package bootstrap supports it. Do not
activate production credentials or infer permission from a green build.

Prepare stable site output from release-aligned source and keep main previews
explicitly development. Docs-only stable fixes can deploy independently without
a package bump. Hosting account/provider and npm ownership are release-time
inputs, not prerequisites for local development.

## Risks / Trade-offs

- Early release may be mistaken for full product scope → release only an explicit
  capability inventory and Chromium validation statement.
- Successful workflow setup is not successful publication → record artifact
  identity and real results separately.
- A site can lead the package → keep release-aligned stable builds and development
  labels; do not promote a new stable site after a failed npm publish.

## Migration Plan

For first publication, confirm name/ownership and bootstrap rules, review the
exact candidate, and obtain explicit approval before making the package
publishable and invoking release. For updates, version changes through Changesets.
Recover published defects with a new version rather than overwriting artifacts.

## Open Questions

The npm owner/final identifier, hosting provider, and protected production
environment are selected only when an actual release/deployment is requested.
Release readiness can be verified locally without them; keep activation disabled.

## Implemented preparation decisions

Changesets 3.0.3 versions the private runtime in `rc` mode; the initial minor
note yields `0.1.0-rc.0`. Root/site/example workspaces remain private and ignored.
Package allowlisting deliberately includes its README, changelog, Skill and
control reference alongside ESM, declarations, schema and generated capabilities.
No runtime APIs or recipe definitions changed.

The local package rehearsal retains ignored archive/digest evidence, installs
that archive offline in an isolated consumer, typechecks its exact Markdown
fences, compares unused-import output with a baseline, and runs the quick start
and Skill host through native Chromium signal/Stop/disposal checks.

Manual npm/site preparation workflows are independent, serialized and read-only.
Their future production jobs name separate environments, are unconditionally
disabled, and contain only a failing activation message. Reviewer protection,
OIDC binding, bootstrap and provider packaging are unresolved activation inputs.
Stable channel selection fails for private/prerelease packages or absent matching
released-version/source attestations; default builds remain development/unreleased.
