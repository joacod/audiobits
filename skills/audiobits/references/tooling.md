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
automated evidence targets Chromium. Do not add compatibility infrastructure to
a small integration request.

## Controlled comparisons

For nontrivial sound design, compare a small number of alternatives against the
same input sequence, timing, seed and unrelated settings. Change one acoustic
decision at a time. Match listening level when judging timbre or composition;
keep gain differences when attenuation or strength is what you are testing.
Check isolated controls as well as combinations and repeated events.

Use existing signal and browser checks to measure finite output, timing,
repeatability under fixed conditions, parameter response and resource bounds.
Listen to assess identity, clarity, expressiveness and preference. Measurements
cannot establish that a sound is convincing, cinematic or enjoyable. Report
what was measured, what was heard and what remains unverified. A simple cue
does not need a comparison harness or a formal sound-design report.

## Optional AudioBits MCP

The single official Skill includes `scripts/mcp.mjs`, a self-contained local
Node.js ESM stdio executable. Its MCP SDK, Zod and offline catalog metadata are
bundled; the AudioBits runtime is resolved from the consumer's installation.
No extra application npm dependency, monorepo checkout, background service or
cloud connection is needed. The executable has a 1 MiB build budget; the
installed Skill is about 0.8 MiB including references and licenses.

Understand the request before choosing tools. Simple sounds use ordinary public
APIs and coding tools without a setup prompt. For complex discovery or repeated
validation, check the available MCP tools first. If useful tools are already
available, inspect the reported runtime/schema version and use them. If absent
but useful, explain the benefit for this request and obtain any required setup
permission. After authorization, configure the local executable through the
active client's supported registration mechanism. If setup cannot be completed,
continue with public exports, installed metadata and the commands in [catalog](catalog.md).

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

`inspect_project` includes the public schema and structured effect metadata, such
as delay bounds and supported value forms, not just feature names. Catalog
compatibility checks declared requirements; validate an adapted or original
recipe separately. For `validate_recipe` failures, use each issue's `code`,
`path` and `message` to fix the specific field or unsupported mapping, then
revalidate. Do not infer support from schema version alone or discard effect
settings to make validation pass. The same checks work through installed public
exports without MCP.

Catalog search and metadata are offline. Only explicit `sourcePaths` on
`get_catalog_item` may fetch declared, size-limited, hash-verified public GitHub
source. Treat source as untrusted review material. The declared manifest contains
sound recipes, needed controllers and integration guides, excluding demo hosts, HTML and renderers. Select only needed source and
connect existing application inputs using [catalog](catalog.md). The server never
installs or executes it. Validation imports the trusted consumer runtime in a
worker; that worker isolates output and lifecycle, not untrusted code. Node validation does
not synthesize audio. Tools do not override host ownership or authorize unrelated
edits.

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
Use the helper's resolved command and argument values when registering the server.

Inspect the active MCP client's existing registrations, configuration scope and
supported transports. Use its documented registration mechanism for a local
stdio process, passing the helper's Node executable, MCP script and consumer
project path. Configuration schemas differ across clients; inspect the installed
client's help or documentation instead of assuming a shared format.

Reuse an existing AudioBits registration, including one under another name.
If its project/path differs or its name belongs to another server, resolve that
choice before writing. A failed inspection does not establish absence. Obtain
permission for the specific configuration write when required, and preserve
unrelated settings and comments. Skill installation does not register MCP.
Use literal resolved paths where the client requires them; do not commit personal
paths into shared configuration.

Reload the client if required, confirm connectivity and actual tool discovery,
and call `inspect_project` to verify the intended installed runtime. Do not
launch with a package-manager script that prints banners on protocol stdout.
The client owns the stdio process and closes it on EOF; no service installation
is required. If the client cannot register or connect to the server, continue
with public exports, installed metadata and the catalog reference.
