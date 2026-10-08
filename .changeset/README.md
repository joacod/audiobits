# AudioBits version notes

Changesets versions the runtime only. The workspace, site and vanilla example
remain private and ignored by Changesets. Tagging and automatic commits are disabled.

AudioBits `0.1.0` is prepared as the stable publishable candidate but has not yet
been published to npm. Prerelease mode was exited with `pnpm changeset pre exit`
and `pnpm changeset version`. Changesets consumed the applied notes and prerelease
state and retained the `0.1.0-rc.0` history in the runtime changelog.

Use `pnpm changeset` for later runtime notes and `pnpm changeset status` to inspect
unapplied notes. Do not add a synthetic version note to suppress a status result.

See [release preparation](../docs/releases.md) for independent publication and
site activation. No Changesets command is wired to publish or deploy.
