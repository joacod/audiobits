# Local AudioBits MCP development

This optional stdio server helps coding agents use AudioBits in a consumer
application. It lives in the private root workspace, uses the official
`@modelcontextprotocol/server` v2 SDK and adds no runtime dependencies or
publishable package. Skill distribution and a standalone executable belong to
PR 07.

Use the repository's pinned Node and pnpm versions. From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm build:mcp
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
snapshot revision and checks drift. Git is needed for generation, not execution.

## Verification and limitations

```sh
pnpm test:mcp
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

`test:mcp:github` separately performs one explicit, live source retrieval through
the protocol client from an external packed consumer. It requires public network
access. This test never installs retrieved catalog source.

Node recipe validation does not render Web Audio. Compatibility compares declared
schema and capabilities; application TypeScript/build integration, gesture
activation, browser synthesis, cleanup and listening need separate verification.
Browser evidence remains governed by the [browser policy](../../docs/validation.md#browser-policy).
