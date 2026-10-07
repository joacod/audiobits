# AudioBits version notes

Changesets versions the runtime only. The workspace, site and vanilla example
remain private and ignored by Changesets. Runtime is private but versioned;
tagging and automatic commits are disabled.

The initial minor change has been applied in `rc` prerelease mode, producing
`0.1.0-rc.0`. Its note remains until a separately approved stable version
transition. Use `pnpm changeset` for later runtime notes and
`pnpm changeset status` to inspect unapplied notes. After versioning, the
applied note lives under `.changeset/pre/`; with no new note, status may report
changed packages without changesets while the candidate is uncommitted. Do not
add a synthetic version note just to suppress that result. Do not exit prerelease mode or make
the package publishable as part of local candidate verification.

See [release preparation](../docs/releases.md) for independent publication and
site activation. No Changesets command is wired to publish or deploy.
