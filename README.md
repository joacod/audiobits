<p align="center">
  <img src=".github/readme/hero.png" width="100%" alt="AudioBits: Sound that reacts. Procedural sound effects for the web, with a colorful waveform crossing bold white lettering on a black background." />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/audiobits"><img src="https://img.shields.io/npm/v/audiobits?style=flat" alt="npm version" /></a>
  <a href="https://github.com/joacod/audiobits/actions/workflows/ci.yml"><img src="https://github.com/joacod/audiobits/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI status on main" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat" alt="MIT license" /></a>
</p>

**AudioBits** is a framework-independent, browser-native procedural audio library
with zero runtime dependencies. Generate sound effects from editable recipes,
copy catalog sounds, and connect sound parameters to application state. No
required audio files.

[Live catalog](https://www.audiobits.dev/catalog) ·
[Documentation](https://www.audiobits.dev/docs) ·
[Agents (Skill)](https://www.audiobits.dev/docs/agents) ·
[MCP server (optional)](https://www.audiobits.dev/docs/mcp) ·
[npm](https://www.npmjs.com/package/audiobits) ·
[Catalog source](https://github.com/joacod/audiobits/tree/main/catalog)

## Quick start

Install in a browser application with a bundler:

```sh
npm install audiobits
```

Or install a ready-made sound from the [catalog](catalog/README.md):

```sh
npx shadcn@latest add joacod/audiobits/<item>
```

See the [documentation](https://www.audiobits.dev/docs) and the
[package README](packages/audiobits/README.md) for the full example.

## Use with coding agents

Install the official AudioBits Skill:

```sh
npx skills add joacod/audiobits --skill audiobits
```

The Skill includes an optional MCP server. See the
[agents guide](https://www.audiobits.dev/docs/agents) and
[MCP docs](https://www.audiobits.dev/docs/mcp).

## Explore AudioBits

### Recipes you own

Copy or install ready-to-use recipes from the [source registry](catalog/README.md),
import their local files, preview them in the
[live catalog](https://www.audiobits.dev/catalog), and adjust supported
[parameters and seeds](https://www.audiobits.dev/docs/parameters). Use them as
starting points for your own sounds. See the
[recipe guide](https://www.audiobits.dev/docs/recipes) for editable, versioned
recipe data.

### Interactive examples

[Energy Charge](https://www.audiobits.dev/catalog/energy-charge),
[Reactive Thruster](https://www.audiobits.dev/catalog/reactive-thruster), and
[Lightsaber](https://www.audiobits.dev/catalog/lightsaber) demonstrate sound driven
by application state and events. Install their reusable sound controllers through
the [source registry](catalog/README.md) and connect your existing controls.
The showcases' visuals and input adapters remain separate.

The npm package owns the engine and recipe language. Recipes and interactive
examples are copy-owned application source.

## Why AudioBits?

- **Procedural by design.** Generate effects in the browser without managing
  prerecorded audio assets.
- **Responsive to state.** Update supported live parameters as an interaction
  changes.
- **Portable recipes.** Edit and share versioned JSON sound definitions.
- **Framework-independent.** Zero runtime dependencies.

## Learn more

- [Documentation](https://www.audiobits.dev/docs) and
  [live catalog](https://www.audiobits.dev/catalog).
- [Catalog source](catalog/README.md) and
  [catalog documentation](https://www.audiobits.dev/docs/catalog).
- [Contributing](CONTRIBUTING.md): setup, contribution paths, and focused PRs.
- [Browser verification and evidence limits](docs/validation.md#browser-policy).

[MIT license](LICENSE), with [0BSD catalog source](catalog/README.md).
