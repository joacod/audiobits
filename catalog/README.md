# Owned AudioBits source

The [GitHub source registry](https://ui.shadcn.com/docs/registry/github) installs
individual recipes and experiences from this repository. You own the copied
source and can edit it without a catalog package, registry server or monorepo
checkout. `audiobits` is the only runtime dependency.

Original source and documentation under `catalog/`, including recipes, sound
controllers, helpers, and examples, use the [0BSD license](LICENSE). You can copy,
modify, redistribute, and use them commercially without retaining license or
copyright notices. No credit to AudioBits is required. This catalog license
applies instead of the repository's root MIT license within `catalog/`.
The `audiobits` runtime, website, tooling, and repository code outside `catalog/`
remain [MIT-licensed](../LICENSE); dependencies keep their own licenses.

## Install and review

From an existing project with a `package.json`, discover the catalog and inspect
an item before installing it:

```sh
npx shadcn@latest list joacod/audiobits
npx shadcn@latest view joacod/audiobits/confirmation
npx shadcn@latest add joacod/audiobits/confirmation
```

[registry.json](../registry.json) owns catalog identity, classification,
descriptions, installed files, and capability requirements. Use any listed ID
with `view` or `add`. Append `#<reviewed-full-commit-SHA>` to GitHub addresses
for reproducible installs. Website visual families, control labels, and curated
display order remain presentation choices.

Items use `registry:item` with explicit project-relative `registry:file` targets.
Normal installation needs no React, Tailwind, Next.js or `components.json`.
Use top-level `view` for inspection. In an unconfigured project,
`add --dry-run`, `--diff` and `--view` can request component setup; decline it
and use top-level `view` instead.

Review existing-file overwrite prompts and retain local edits. Keep owned source
in version control; later installs are source updates to review. Once copied,
builds and playback need only local source and `audiobits`.

## Application integration

Recipes install `recipe.ts` under `src/sounds/recipes/<id>/`. Experiences install
acoustic definitions, a sound controller, and an item-specific guide under
`src/sounds/experiences/<id>/`. The registry declares each item's complete file
manifest, including shared authoring files under `src/sounds/helpers/` when needed.
Relative imports survive installation.

Use the selected showcase's Copy usage in `src/integration.ts`, or follow an
experience's installed README. Every registry item is verified against the
packed runtime and actual installed source, including activation, Stop and
disposal. Recipe examples come from the same generator as the website; this
README keeps representative one-shot and sustained integrations below.

Connect `play()` directly to a user gesture, handle activation errors, call
`stop()` on cancellation, and `dispose()` when removing the integration. The
application owns visibility, suspension, and shared-engine lifecycle; see the
[lifecycle guide](https://www.audiobits.dev/docs/lifecycle).

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

## Standalone instrument authoring

Install `synth-lead` with `npx shadcn@latest add joacod/audiobits/synth-lead`.
Its [installed guide](recipes/synth-lead/README.md) demonstrates the typed
`createInstrument` adapter, note and velocity aliases, live brightness updates,
scheduled release, cancellation and disposal. The recipe and guide install with
`helpers/instrument.ts`, `helpers/music.ts` and `helpers/mapping.ts`; no Riff song
or controller is needed. These helpers remain copy-owned source outside the npm
runtime. Riff's existing helper imports reexport the same implementations.

## Controllers and presentation

Simple sounds need no controller, including sustained recipes driven directly
by `voice.set()`. Experience controllers coordinate sound behavior from bounded
application state and events. Follow the installed guide for each controller's
inputs and lifecycle. Pointer handling, frame scheduling, HTML, canvas and 3D
stay outside installed sound source.

See [recipe ownership](recipes/README.md) for editing and verification and
[architecture](../docs/architecture.md#repository-boundaries) for contributor
boundaries.

## Optional standalone demo

AudioBits is framework-independent and does not require Vite. To run a repository
HTML demo independently, use a local server that handles TypeScript imports.
From a repository checkout, Vite is one option:

```sh
pnpm install --frozen-lockfile
pnpm build:lib
pnpm --filter @audiobits/vanilla exec vite ../..
```

Open the printed URL at `/catalog/experiences/<id>/index.html` for an experience
with a repository demo. Preserve its relative paths. Demo hosts and renderers
remain in the repository and are excluded from registry installs.
