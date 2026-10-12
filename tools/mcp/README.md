# Local AudioBits MCP development

This optional stdio server helps coding agents use AudioBits in a consumer
application. It lives in the private root workspace, uses the official
`@modelcontextprotocol/server` v2 SDK and adds no runtime dependencies or
publishable package. The single official [AudioBits Skill](../../skills/audiobits/SKILL.md)
ships the optional server at `skills/audiobits/scripts/mcp.mjs`; consumer setup
and host commands live in its [tooling reference](../../skills/audiobits/references/tooling.md).

Use the repository's pinned Node and pnpm versions. From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm build:mcp
pnpm build:skill
pnpm check:skill
```

Configure an MCP client's stdio launch with `node` as the command, the absolute
path to `tools/mcp/dist/stdio.js` as its argument, and your **consumer project
root** as `cwd`. Start the compiled entry directly, since package-manager script
banners can contaminate protocol stdout. For a manual protocol session from a
consumer directory:

```sh
node /path/to/audiobits/tools/mcp/dist/stdio.js
```

The server reads MCP messages on stdin and reserves stdout for protocol messages.
Transport diagnostics use stderr. EOF, SIGINT and SIGTERM close the connection.
To inspect AudioBits itself, first run `pnpm build:lib` and launch with the
repository root as `cwd`.

`--project <consumer-project>` explicitly sets the launch default for hosts
without a configurable working directory. The installed executable supports
Node 24.21.0 or later in the 24.x series. Other Node series are unverified.

## Reproducible Skill distribution

`build:skill` bundles `bundle.ts`, the stdio server, runtime worker, SDK/Zod
dependencies and catalog snapshot with the exact-pinned esbuild and lockfile.
Workers re-enter the same executable without starting another transport. Public
runtime imports stay dynamic and resolve only in the consumer project. The build
rejects bundled AudioBits runtime code, unbundled dependencies and executables
over 1 MiB. It emits dependency licenses alongside the executable, with no source
maps or machine paths. Do not edit generated output directly.

`check:skill` rebuilds in memory and compares both committed files byte for byte.
Missing or stale output fails without rewriting files. PR/main CI runs it before
MCP tests. After an implementation, snapshot or dependency change, run
`pnpm build:skill` and commit both generated outputs. The optional setup helper
has no dependencies, resolves installed symlinks and only prints launch settings.

## Tools and project boundary

| Tool                  | Inputs and result                                                                                                                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `inspect_project`     | Optional `projectPath`; installed version, schema, capabilities and diagnostics.                                                                                                                     |
| `search_catalog`      | Optional `query`, `category`, `limit` (1 to 10); ranked offline metadata. Empty query lists entries.                                                                                                 |
| `get_catalog_item`    | Required `name`; metadata, source manifest, immutable shadcn instructions and requirements. Optional `projectPath` checks compatibility. Optional `sourcePaths` explicitly retrieves declared files. |
| `validate_recipe`     | Required JSON `recipe`, optional `projectPath`; installed validator result with `code`, `path`, `message` issues.                                                                                    |
| `check_compatibility` | Required `name`, optional `projectPath`; schema/capability mismatches and application requirements.                                                                                                  |

For runtime tools, `projectPath` defaults to process `cwd`; relative paths resolve
there too. Select an existing project root with `package.json` and
`node_modules/audiobits`. Resolution never searches ancestor projects or falls
back to the server's installation. For a hoisted workspace, select the root that
contains the installation. Package-manager symlinks in the selected
`node_modules` are supported. Yarn PnP without `node_modules` is unsupported.

The worker uses Node's ESM resolver with import conditions, including import-only
package exports. It internally enables `--experimental-import-meta-resolve` for
the resolver's parent URL argument; clients need no extra Node flag. Public
schema and capability metadata must agree with the installed package version and
runtime exports. Missing, unavailable or incompatible installations produce an
actionable tool error. Each call uses a fresh worker to avoid stale module caches,
drains installed-package console output and terminates after five seconds.
The installed runtime is imported to use its public contracts. Workers isolate
output and lifecycle, **not untrusted installed packages**; use a trusted project.

## Offline metadata and explicit source review

`snapshot.json` contains ten registry entries, file manifests, byte counts and
SHA-256 hashes, with one immutable public GitHub commit. It contains no recipe or
experience implementation. Search, inspection, compatibility and validation
perform no server network requests and need no GitHub access. Intent search ranks
tokens from registry titles, descriptions, tags and categories.

Calling `get_catalog_item` without `sourcePaths` retrieves no source. On explicit
request, only files declared for the selected item can be read. Remote retrieval
uses `raw.githubusercontent.com/joacod/audiobits/<commit>/<path>` without
credentials or redirects, enforces a 128 KiB limit per file and a ten-second
request deadline, and verifies byte count and SHA-256 before returning UTF-8 text.
Inside the AudioBits monorepo, the same request reads local catalog files with
the same path and integrity checks. Modified local source that differs from the
snapshot produces an integrity error; it never silently falls back to GitHub.

Returned source is untrusted review material. The server never executes it or
writes into the consumer project. Install owned source yourself through the
existing shadcn registry, using the returned revision-pinned command. Retain the
MIT license and review overwrite prompts. There is no custom installer, shell
tool, LLM call, hosted service or account configuration.

To refresh metadata after a catalog change, first commit the reviewed registry
and sources, then generate against that full commit SHA:

```sh
node tools/mcp/generate-snapshot.mjs --revision=<full-reviewed-commit-SHA>
node tools/mcp/generate-snapshot.mjs --check
```

Generation reads the registry and declared files at that commit, verifies they
match the checkout, and produces deterministic metadata. `--check` reuses the
snapshot revision and checks drift. Generation and `--check` read that commit
with Git. Running the server does not. The quality workflow fetches the pinned
revision because its checkout is shallow.

## Verification and limitations

```sh
pnpm test:mcp
pnpm check:skill
pnpm test:mcp:github
```

`test:mcp` builds the library and server, checks snapshot drift, runs unit tests
and connects an actual official SDK client over stdio. A clean system-temporary
consumer installs the packed runtime offline with install scripts disabled and
an isolated npm cache. Protocol tests cover initialization, all five tools,
cwd/explicit/import-only resolution, package-manager symlinks, installed version
changes, validator issues, capability mismatches, missing/incompatible runtimes,
invalid paths, malformed inputs, recovery and shutdown. Server-side fetch is
blocked during offline protocol tests. Unit tests cover schema mismatches, source
allowlisting, origin, size, integrity and local retrieval. Temporary consumers and
caches are removed after verification.

Bundled tests copy the complete Skill outside the monorepo, start its executable
without server dependencies, exercise all five tools and consumer version
changes, and check setup path resolution and preservation of existing settings.
The normal public runtime validation workflow also runs without MCP configured.
Installation acceptance uses the actual Skills CLI against a pushed PR revision
in a clean external project before main changes. Use a GitHub tree URL selecting
the PR branch/revision with `--skill audiobits`; the default installation command
in the Skill reference selects main after merge.

`test:mcp:github` separately performs one explicit, live source retrieval through
the protocol client from an external packed consumer. It requires public network
access. This test never installs retrieved catalog source.

Node recipe validation does not render Web Audio. Compatibility compares declared
schema and capabilities; application TypeScript/build integration, gesture
activation, browser synthesis, cleanup and listening need separate verification.
Browser evidence remains governed by the [browser policy](../../docs/validation.md#browser-policy).
