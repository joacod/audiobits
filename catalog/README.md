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

## Application integration

Each recipe installs only `recipe.ts` and `LICENSE` under
`src/sounds/recipes/<id>/`. Use the examples below in `src/integration.ts`.
Connect `play()` directly to a user gesture, handle activation errors, call
`stop()` on cancellation, and `dispose()` when removing the integration.
For sustained Thruster, connect `update(throttle)` to live application state.
The application owns visibility, suspension, and shared-engine lifecycle; see
the [lifecycle guide](https://www.audiobits.dev/docs/lifecycle).

### Confirmation

`npx shadcn@latest add joacod/audiobits/confirmation`

```ts
import { createAudio } from "audiobits";
import { confirmation } from "./sounds/recipes/confirmation/recipe";

const audio = createAudio();
const sound = audio.sound(confirmation);
let request = 0;

// Bind directly to a button click; surface a failed start and allow retry.
export async function play() {
  const token = ++request;
  await audio.start();
  if (token !== request) return;
  sound.play({ parameters: {}, seed: 42 });
}

export function stop() {
  request++;
  audio.stopAll({ tails: "cut" });
}

// Call when removing this integration.
export async function dispose() {
  stop();
  await audio.dispose();
}
```

### Impact

`npx shadcn@latest add joacod/audiobits/impact`

```ts
import { createAudio } from "audiobits";
import { impact } from "./sounds/recipes/impact/recipe";

const audio = createAudio();
const sound = audio.sound(impact);
let request = 0;

// Bind directly to a button click; surface a failed start and allow retry.
export async function play() {
  const token = ++request;
  await audio.start();
  if (token !== request) return;
  sound.play({ parameters: { intensity: 0.5 }, seed: 42 });
}

export function stop() {
  request++;
  audio.stopAll({ tails: "cut" });
}

// Call when removing this integration.
export async function dispose() {
  stop();
  await audio.dispose();
}
```

### Thruster

`npx shadcn@latest add joacod/audiobits/thruster`

```ts
import { createAudio } from "audiobits";
import { thruster } from "./sounds/recipes/thruster/recipe";

const audio = createAudio();
const sound = audio.sound(thruster);
let request = 0;
let voice: ReturnType<typeof sound.play> | undefined;

// Bind directly to a button click; surface a failed start and allow retry.
export async function play() {
  const token = ++request;
  await audio.start();
  if (token !== request) return;
  voice?.stop();
  voice = sound.play({ parameters: { throttle: 0.2 }, seed: 42 });
}

// Connect your application's live throttle to this function.
export function update(throttle: number) {
  voice?.set({ throttle });
}

export function stop() {
  request++;
  audio.stopAll({ tails: "cut" });
  voice = undefined;
}

// Call when removing this integration.
export async function dispose() {
  stop();
  await audio.dispose();
}
```

### Tactile click

`npx shadcn@latest add joacod/audiobits/tactile-click`

```ts
import { createAudio } from "audiobits";
import { tactileClick } from "./sounds/recipes/tactile-click/recipe";

const audio = createAudio();
const sound = audio.sound(tactileClick);
let request = 0;

// Bind directly to a button click; surface a failed start and allow retry.
export async function play() {
  const token = ++request;
  await audio.start();
  if (token !== request) return;
  sound.play({ parameters: { intensity: 0.5 }, seed: 42 });
}

export function stop() {
  request++;
  audio.stopAll({ tails: "cut" });
}

// Call when removing this integration.
export async function dispose() {
  stop();
  await audio.dispose();
}
```

### Gentle rejection

`npx shadcn@latest add joacod/audiobits/gentle-rejection`

```ts
import { createAudio } from "audiobits";
import { gentleRejection } from "./sounds/recipes/gentle-rejection/recipe";

const audio = createAudio();
const sound = audio.sound(gentleRejection);
let request = 0;

// Bind directly to a button click; surface a failed start and allow retry.
export async function play() {
  const token = ++request;
  await audio.start();
  if (token !== request) return;
  sound.play({ parameters: {}, seed: 42 });
}

export function stop() {
  request++;
  audio.stopAll({ tails: "cut" });
}

// Call when removing this integration.
export async function dispose() {
  stop();
  await audio.dispose();
}
```

### Glass notification

`npx shadcn@latest add joacod/audiobits/glass-notification`

```ts
import { createAudio } from "audiobits";
import { glassNotification } from "./sounds/recipes/glass-notification/recipe";

const audio = createAudio();
const sound = audio.sound(glassNotification);
let request = 0;

// Bind directly to a button click; surface a failed start and allow retry.
export async function play() {
  const token = ++request;
  await audio.start();
  if (token !== request) return;
  sound.play({ parameters: { brightness: 0.5 }, seed: 42 });
}

export function stop() {
  request++;
  audio.stopAll({ tails: "cut" });
}

// Call when removing this integration.
export async function dispose() {
  stop();
  await audio.dispose();
}
```

### Whoosh

`npx shadcn@latest add joacod/audiobits/whoosh`

```ts
import { createAudio } from "audiobits";
import { whoosh } from "./sounds/recipes/whoosh/recipe";

const audio = createAudio();
const sound = audio.sound(whoosh);
let request = 0;

// Bind directly to a button click; surface a failed start and allow retry.
export async function play() {
  const token = ++request;
  await audio.start();
  if (token !== request) return;
  sound.play({ parameters: { size: 0.5 }, seed: 42 });
}

export function stop() {
  request++;
  audio.stopAll({ tails: "cut" });
}

// Call when removing this integration.
export async function dispose() {
  stop();
  await audio.dispose();
}
```

### Power-up

`npx shadcn@latest add joacod/audiobits/power-up`

```ts
import { createAudio } from "audiobits";
import { powerUp } from "./sounds/recipes/power-up/recipe";

const audio = createAudio();
const sound = audio.sound(powerUp);
let request = 0;

// Bind directly to a button click; surface a failed start and allow retry.
export async function play() {
  const token = ++request;
  await audio.start();
  if (token !== request) return;
  sound.play({ parameters: { intensity: 0.5 }, seed: 42 });
}

export function stop() {
  request++;
  audio.stopAll({ tails: "cut" });
}

// Call when removing this integration.
export async function dispose() {
  stop();
  await audio.dispose();
}
```

## Interactive experiences

Each item installs its recipes, reusable controller, concise guide, and license.
Connect your application state and events to the controller using its guide:

- [Energy Charge](experiences/energy-charge/README.md): `recipe.ts`, `progress.ts`, `README.md`, `LICENSE`.
- [Reactive Thruster](experiences/reactive-thruster/README.md): `recipe.ts`, `pointer.ts`, `README.md`, `LICENSE`.
- [Lightsaber](experiences/lightsaber/README.md): `recipe.ts`, `controller.ts`, `README.md`, `LICENSE`.

Reactive Thruster accepts throttle without Impact. Lightsaber owns five acoustic
recipes in one file; its motion helper is showcase geometry and is not installed.
The browser hosts, input stages, HTML, and visuals stay in the public repository
and power the existing showcases. All entries use public runtime APIs and
recipe schema 1 with TypeScript bundler module resolution.

## Optional standalone demo

Integrate copied recipes or controllers into an existing application with its
own toolchain. AudioBits is framework-independent and does not require Vite.

To run a catalog HTML demo independently, use a local server that handles
TypeScript imports. Vite is one optional development tool. From a repository checkout:

```sh
pnpm install --frozen-lockfile
pnpm build:lib
pnpm --filter @audiobits/vanilla exec vite ../..
```

Open the printed local URL at the demo's `index.html` path. Repository demo paths are
`/catalog/experiences/energy-charge/index.html`,
`/catalog/experiences/reactive-thruster/index.html`, and
`/catalog/experiences/lightsaber/index.html`. Preserve relative paths,
including Reactive Thruster's Impact recipe. Vite and TypeScript serve the demo;
`audiobits` remains its only runtime dependency.
