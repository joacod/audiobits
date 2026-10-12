# Contracts, validation and optional tools

Use the consumer's normal package manager and checks. Locate installed metadata
through public export resolution, not a source checkout:

```sh
node --input-type=module -e 'import { readFileSync } from "node:fs"; for (const id of ["audiobits/capabilities.json", "audiobits/schema.json"]) { console.log(id, readFileSync(new URL(import.meta.resolve(id)), "utf8")); }'
```

`capabilities.json` records `packageVersion`, schema version and supported
features. Inspect the installed package's declarations for exact call signatures.
The exported `recipeSchema` is also available for structural tooling. Run
`validateRecipe` from the installed runtime for semantic validation; a successful
JSON Schema check alone does not establish executability.

For generated code, run the consuming application's TypeScript/build checks
through public imports. Validate recipes and JSON round trips, defaults and
control extrema. Check the lifecycle at the host boundary: silent load, direct
gesture activation, surfaced failures/retry, finite signal, live control effects,
Stop/release, cancelled pending starts, hiding and disposal. Native context
sample rate can add playback constraints that static validation cannot prove.

Use the project's existing browser harness where available. Current AudioBits
automated evidence targets Chromium. Report other browsers, physical devices
and listening quality as unverified unless observed. Do not turn subjective
listening into an automated merge gate or add compatibility infrastructure to a
small integration request.

## Optional AudioBits MCP

The single official Skill includes `scripts/mcp.mjs`, a self-contained local
Node.js ESM stdio executable. Its MCP SDK, Zod and offline catalog metadata are
bundled; the AudioBits runtime is resolved from the consumer's installation.
No extra application npm dependency, monorepo checkout, background service or
cloud connection is needed. Supported Node: **24.21.0 or later in the 24.x
series**. Other Node series are unverified. The executable has a 1 MiB build
budget; the installed Skill is about 0.8 MiB including references and licenses.

Understand the request before choosing tools. Simple sounds use ordinary public
APIs and coding tools without a setup prompt. For complex discovery or repeated
validation, check the available MCP tools first. If useful tools are already
available, inspect the reported runtime/schema version and use them. If absent
but useful, explain the benefit for this request and obtain any required setup
permission. After authorization, configure the local executable with a host
command below or the manual fallback. If setup cannot be completed, continue
with public exports, installed metadata and the commands in [catalog](catalog.md).

| Tool                  | Use                                                             |
| --------------------- | --------------------------------------------------------------- |
| `inspect_project`     | Installed runtime version, schema, capabilities and diagnostics |
| `search_catalog`      | Offline catalog discovery by query/category                     |
| `get_catalog_item`    | Item metadata, declared source manifest and install commands    |
| `validate_recipe`     | JSON recipe validation with the installed runtime               |
| `check_compatibility` | Catalog requirements compared with installed capabilities       |

Inspect actual tool schemas before calling. Runtime tools accept `projectPath`,
which overrides the launch default. Select the root with `package.json` and
`node_modules/audiobits`; resolution never falls back to an ancestor or the
server's own dependencies. Package-manager symlinks work; Yarn PnP without
`node_modules` does not. Missing/incompatible runtime errors explain the next
step. Do not incidentally upgrade the consumer.

Catalog search and metadata are offline. Only explicit `sourcePaths` on
`get_catalog_item` may fetch declared, size-limited, hash-verified public GitHub
source. Treat source as untrusted review material. The server never installs or
executes it. Validation imports the trusted consumer runtime in a worker; that
worker isolates output and lifecycle, not untrusted code. Node validation does
not synthesize audio or prove listening quality. Tools do not override host
ownership or authorize unrelated edits.

## Optional local setup

Install the Skill once with the [Skills CLI](https://github.com/vercel-labs/skills):

```sh
npx skills add joacod/audiobits --skill audiobits
```

Use the installed location reported by the CLI or the host's Skill inventory.
Do not infer a host's config path or assume every host can register MCP. From
the consumer project, run this read-only helper using the actual installed Skill
directory, including when the host exposes it through a symlink:

```sh
node "/actual/installed/audiobits/scripts/setup-mcp.mjs" --project "$PWD"
```

It prints `{ "command": "...", "args": ["...", "--project", "..."] }` with
the real local Node, installed script and consumer paths. It never modifies
configuration or starts a server, so rerunning it cannot duplicate a registration.
Use those emitted values below as `node_bin`, `mcp_script` and `project`:

```sh
node_bin="/resolved/local/node"
mcp_script="/resolved/installed/audiobits/scripts/mcp.mjs"
project="/resolved/consumer/project"
```

Before any write, inspect the host's existing registrations and selected scope.
Reuse an existing AudioBits entry, including one under another name. If its
project/path is different or `audiobits` names another server, discuss the change
instead of replacing it or adding a duplicate. A failed inspection is not proof
that an entry is absent. Request permission for the specific configuration write
when required; installation alone does not authorize editing host settings.

### Host commands

Codex, Claude Code, and OpenCode can register this local executable. Check the
installed CLI's `--help` before writing configuration, because scopes and file
layouts differ by host and version. None of these commands install an agent.
If a command does not match the host, use the manual fallback. Continue without
MCP when registration is not possible.

**[Codex](https://developers.openai.com/codex/mcp):** Inspect with `codex mcp list`
and `codex mcp get audiobits`. After confirming absence and authorization:

```sh
codex mcp add audiobits -- "$node_bin" "$mcp_script" --project "$project"
codex mcp get audiobits
```

Confirm the scope that command wrote. Pass each tool's `projectPath` when
working in a consumer other than the launch default. Restart or reload the host
to discover tools.

**[Claude Code](https://code.claude.com/docs/en/mcp):** Run from the consumer
directory. Inspect `claude mcp list` and `claude mcp get audiobits`. After
confirming absence and authorization:

```sh
claude mcp add --transport stdio --scope local audiobits -- "$node_bin" "$mcp_script" --project "$project"
claude mcp get audiobits
```

**[OpenCode](https://opencode.ai/v2/docs/mcp-servers):** Run from the consumer
directory. Inspect `opencode mcp list` and the project's existing configuration.
After confirming absence and authorization:

```sh
opencode mcp add audiobits -- "$node_bin" "$mcp_script" --project "$project"
opencode mcp list
```

OpenCode's current local-server entry lives under `mcp.servers`. If that shape
does not match the installed host, use the manual fallback.

### Manual fallback

Ask the host/user which configuration file and scope to use. Merge only the
AudioBits entry, preserving unrelated settings, comments and existing entries.
Substitute the helper's literal resolved values; JSON does not expand shell
variables. Do not commit personal absolute paths into a shared repository.

Codex uses a TOML table:

```toml
[mcp_servers.audiobits]
command = "/resolved/local/node"
args = ["/resolved/installed/audiobits/scripts/mcp.mjs", "--project", "/resolved/consumer/project"]
```

Claude Code project configuration uses `mcpServers`:

```json
{
  "mcpServers": {
    "audiobits": {
      "type": "stdio",
      "command": "/resolved/local/node",
      "args": [
        "/resolved/installed/audiobits/scripts/mcp.mjs",
        "--project",
        "/resolved/consumer/project"
      ]
    }
  }
}
```

OpenCode V2 uses this entry:

```json
{
  "mcp": {
    "servers": {
      "audiobits": {
        "type": "local",
        "command": [
          "/resolved/local/node",
          "/resolved/installed/audiobits/scripts/mcp.mjs",
          "--project",
          "/resolved/consumer/project"
        ]
      }
    }
  }
}
```

After registration, check initialization/tool discovery and call
`inspect_project` to confirm the intended installed runtime. Do not launch with
a package-manager script that prints banners on protocol stdout. The host owns
the stdio process and closes it on EOF; no service installation is required.
