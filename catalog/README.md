# Owned AudioBits source

The [GitHub source registry](https://ui.shadcn.com/docs/registry/github) installs
individual recipes and experiences from this repository. You own the copied
source and can edit it without a catalog package, registry server or monorepo
checkout. `audiobits` is the only runtime dependency. Retain the included MIT
license when redistributing source.

## Install and review

Run these commands from an existing project with a `package.json`:

```sh
npx shadcn@4.21.4 registry validate joacod/audiobits
npx shadcn@4.21.4 list joacod/audiobits
npx shadcn@4.21.4 view joacod/audiobits/confirmation
npx shadcn@4.21.4 add joacod/audiobits/confirmation
npx shadcn@4.21.4 add joacod/audiobits/energy-charge
npx shadcn@4.21.4 add joacod/audiobits/reactive-thruster
npx shadcn@4.21.4 add joacod/audiobits/lightsaber
```

For reproducible installs, append `#<reviewed-full-commit-SHA>` to each GitHub
address. All eleven entries use `registry:item` and explicit
`registry:file` targets relative to the project root (`~/`); React, Tailwind,
Next.js, framework detection and `components.json` are unnecessary.

Use `view <address>` to inspect the payload without a project config. For
`add --dry-run`, `--diff` and `--view`, see the preview limitation below.
On an existing-file conflict,
review the overwrite prompt and decline to keep your changes. Avoid
`--overwrite` unless replacing your owned source is intentional. Keep copies
under version control; later installs are source updates to review, not automatic
runtime upgrades. Once copied, builds and playback need only your local source
and the installed `audiobits` runtime, with no registry access.

## Preview limitation in shadcn 4.21.4

Normal installation skips framework setup for these universal items. However,
`add --dry-run`, `--diff` and `--view` enter the CLI's component preflight and
prompt for `components.json`. Decline that prompt in an unconfigured application;
it may otherwise begin framework setup. This is an
[upstream CLI limitation](https://github.com/shadcn-ui/ui/blob/main/packages/shadcn/src/commands/add.ts),
not a runtime requirement of the copied source.

Use a disposable review directory for these modes. Create three files there:

`package.json`:

```json
{ "private": true }
```

`tsconfig.json` (the alias mapping satisfies the CLI's config resolver):

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] }
  }
}
```

`components.json` (these fields satisfy the CLI schema, with no Tailwind install):

```json
{
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "",
    "baseColor": "slate",
    "cssVariables": false
  },
  "aliases": {
    "components": "@/src/sounds",
    "utils": "@/src/sounds/utils"
  }
}
```

To inspect conflicts, copy your current `src/sounds/` files into the same paths
inside this review directory. From that directory run:

```sh
npx shadcn@4.21.4 add joacod/audiobits/confirmation --dry-run
npx shadcn@4.21.4 add joacod/audiobits/confirmation --diff
npx shadcn@4.21.4 add joacod/audiobits/energy-charge --dry-run
npx shadcn@4.21.4 add joacod/audiobits/energy-charge --diff
```

Append a reviewed commit ref as above. These commands only review changes.
Delete the disposable directory afterward and perform the actual install in
your application, where no `components.json` is required. Existing shadcn
projects can use their own config for previews.

## Recipes and experiences

[registry.json](../registry.json) is the canonical discovery and distribution
manifest. It contains eight recipes: `confirmation`, `impact`, `thruster`,
`tactile-click`, `gentle-rejection`, `glass-notification`, `whoosh`, and `power-up`;
and three experiences: `energy-charge`, `reactive-thruster`, and `lightsaber`. Use any ID with
`view` or `add`. Metadata records classification, categories, schema version,
required public capabilities and complete source/license manifests. The website
derives discovery titles, descriptions and source lists from this registry;
visual families, control labels and display order belong to the website.

Recipes install under `src/sounds/recipes/<id>/`; experiences under
`src/sounds/experiences/<id>/`. These targets mirror the canonical source layout
so relative imports survive copying and installation.

See [recipe ownership](recipes/README.md) for editing and verification.

## Confirmation

Installation writes `src/sounds/recipes/confirmation/recipe.ts` and `LICENSE`.
Import the owned recipe from your application:

```ts
import { createAudio } from "audiobits";
import { confirmation } from "./sounds/recipes/confirmation/recipe";

const audio = createAudio();
const sound = audio.sound(confirmation);
// Inside an async click or other direct user gesture:
await audio.start();
sound.play();
// When removing this integration:
await audio.dispose();
```

The recipe preserves the existing confirmation tone. You may change its pitches,
envelopes or gain locally, keeping recipe schema version 1. The npm package ships
only the engine and recipe language; install creative source separately.

## Lightsaber

Installation writes five acoustic recipes in `recipe.ts`, the motion mapper,
controller, browser host, canvas stage, standalone demo, README and MIT license
under `src/sounds/experiences/lightsaber/`. It supports persistent ignition,
motion-controlled hum, rapid swings, target clashes, and deliberate retraction.
See the [experience guide](experiences/lightsaber/README.md) for ownership,
keyboard and touch controls, cooldowns, and teardown.

## Energy Charge

Installation writes `recipe.ts`, `progress.ts`, `host.ts`, `index.html`,
`README.md` and `LICENSE` under `src/sounds/experiences/energy-charge/`. All relative
imports stay within that directory. See the [experience guide](experiences/energy-charge/README.md).

- `recipe.ts` is reusable sound data.
- `progress.ts` is the reusable controller for application-supplied progress.
- `host.ts` adds browser activation, mute, Stop and lifecycle cleanup with its
  own engine. Call its `dispose()` when removing an SPA view.
- `index.html` is an optional standalone demo, not your application's entrypoint.
  It references `./host.ts` and requires a TypeScript-aware browser build tool.

For independent playback, see [optional standalone demo](#optional-standalone-demo).
Installation never writes a root `index.html`, build configuration, CSS or
framework setup. Your application can import the recipe or controller without
using the demo. Customize sound data,
progress mapping or presentation independently; start audio in a user gesture
and dispose owned resources during teardown.

## Reactive Thruster

Installation includes the complete recipe, pointer controller, host, demo, guide
and license under `src/sounds/experiences/reactive-thruster/`. The same item also
includes canonical Impact and its license under `src/sounds/recipes/impact/`.
The host imports `../../recipes/impact/recipe`; keep that path intact. No
runtime internals or site-private modules are needed. See
the [experience guide](experiences/reactive-thruster/README.md).

All entries use public runtime APIs and recipe schema 1. The TypeScript source
supports bundler module resolution; it is not precompiled JavaScript.
Browser verification targets Chromium.

## Optional standalone demo

Integrate copied recipes or controllers into an existing application with its
own toolchain. AudioBits is framework-independent and does not require Vite.

To run a catalog HTML demo independently, use a local server that handles
TypeScript imports. Vite is one optional development tool. From a project with
`package.json` and the complete copied or installed source manifest:

```sh
npm install audiobits
npm install --save-dev vite typescript
npx vite
```

Open the printed local URL at the demo's `index.html` path. Registry installs use
`/src/sounds/experiences/energy-charge/index.html` or
`/src/sounds/experiences/reactive-thruster/index.html`. Preserve relative paths,
including Reactive Thruster's Impact recipe. Vite and TypeScript serve the demo;
`audiobits` remains its only runtime dependency.
