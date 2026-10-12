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
```

Before this registry reaches main, append `#feat/github-source-registry` to each
GitHub address above. For reproducible installs, replace the branch with a
reviewed full commit SHA. Both entries use `registry:item` and explicit
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

Append a branch or commit ref as above. These commands only review changes.
Delete the disposable directory afterward and perform the actual install in
your application, where no `components.json` is required. Existing shadcn
projects can use their own config for previews. See the
[verification record](registry-verification.md) for the tested commands and limits.

## Confirmation

Installation writes `src/sounds/confirmation.ts` and
`src/sounds/confirmation.LICENSE`. Import the owned recipe from your application:

```ts
import { createAudio } from "audiobits";
import { confirmation } from "./sounds/confirmation";

const audio = createAudio();
const sound = audio.sound(confirmation);
// Inside an async click or other direct user gesture:
await audio.start();
sound.play();
// When removing this integration:
await audio.dispose();
```

The recipe preserves the bundled confirmation tone. You may change its pitches,
envelopes or gain locally, keeping recipe schema version 1. The published
`audiobits/recipes` export remains available during the source-ownership transition.

## Energy Charge

Installation writes `recipe.ts`, `progress.ts`, `host.ts`, `index.html`,
`README.md` and `LICENSE` under `src/sounds/energy-charge/`. All relative imports
stay within that directory. See the [experience guide](experiences/energy-charge/README.md).

- `recipe.ts` is reusable sound data.
- `progress.ts` is the reusable controller for application-supplied progress.
- `host.ts` adds browser activation, mute, Stop and lifecycle cleanup with its
  own engine. Call its `dispose()` when removing an SPA view.
- `index.html` is an optional standalone demo, not your application's entrypoint.
  It references `./host.ts` and requires a TypeScript-aware browser build tool.

For the demo in an otherwise plain browser project:

```sh
npm install --save-dev vite typescript
npx vite
```

Open `/src/sounds/energy-charge/index.html`. Installation never writes a root
`index.html`, build configuration, CSS or framework setup. Your application can
import the recipe or controller without using the demo. Customize sound data,
progress mapping or presentation independently; start audio in a user gesture
and dispose owned resources during teardown.

Both entries use public runtime APIs and recipe schema 1. The TypeScript source
supports bundler module resolution; it is not precompiled JavaScript. Automated
browser evidence targets Chromium and does not establish listening quality,
physical-device support or other-browser compatibility.
