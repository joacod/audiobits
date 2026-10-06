# AudioBits

Procedural sound for interactive web applications, browser games, and creative
experiences, with a framework-independent runtime and editable sound recipes.

AudioBits is **unreleased**. The workspace foundation, minimal documentation
site, and vanilla package consumer are implemented. Audio playback and recipe
APIs are planned; the name and npm identifier remain provisional.

## Run the development preview

Use the Node version in [.node-version](.node-version) and the pnpm version
pinned in [package.json](package.json).

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open [the local preview](http://127.0.0.1:3000). The page displays
“AudioBits workspace ready” from the library's public export. The command builds
the library first, then watches it alongside the site. Stop both with Ctrl+C.

No npm publication is needed to test library changes. All workspaces, including
the runtime, are private until a separately approved release.

## Development and scope

[Local development](docs/development.md) covers verified build, test, package,
and Chromium commands. [Step 01 evidence](openspec/changes/01-workspace-foundation/verification.md)
records results and limitations.

The first audio milestone targets Chromium and three sounds: a refined
confirmation, a variable impact, and a continuously controlled thruster.
Broader browser validation follows once the core works.

- [Product scope](docs/product.md): intended users and boundaries.
- [Implementation roadmap](docs/roadmap.md): steps and review gates.
- [Architecture](docs/architecture.md): proposed recipes and runtime ownership.
- [Release design](docs/releases.md): independent site and npm releases.

## License

[MIT](LICENSE).
