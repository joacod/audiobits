<p align="center">
  <img src=".github/readme/hero.png" width="100%" alt="AudioBits: Sound that reacts. Procedural sound effects for the web, with a colorful waveform crossing bold white lettering on a black background." />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/audiobits"><img src="https://img.shields.io/npm/v/audiobits?style=flat" alt="npm version" /></a>
  <a href="https://github.com/joacod/audiobits/actions/workflows/ci.yml"><img src="https://github.com/joacod/audiobits/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI status on main" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat" alt="MIT license" /></a>
</p>

**AudioBits** is a tiny, browser-native procedural audio library. Generate sound
effects from editable recipes, use bundled sounds, and connect sound parameters
to application state. No required audio files or runtime dependencies.

[Live catalog](https://audiobits.joacod.com/catalog) ·
[Documentation](https://audiobits.joacod.com/docs) ·
[npm](https://www.npmjs.com/package/audiobits) ·
[Copy-paste examples](https://github.com/joacod/audiobits/tree/main/catalog)

## Quick start

Install in a browser application with a bundler:

```sh
npm install audiobits
```

```ts
import { createAudio } from "audiobits";
import { confirmation } from "audiobits/recipes";

const audio = createAudio();
const sound = audio.sound(confirmation);

export async function play() {
  await audio.start();
  sound.play();
}
export function stop() {
  audio.stopAll({ tails: "cut" });
}
export async function dispose() {
  await audio.dispose();
}
```

Construction is silent. Bind `play()` directly to a user gesture, such as a
button click, and surface activation failures with `void play().catch(console.error)`.
Retry from a fresh gesture. Bind `stop()` to Stop to cut voice tails, and await
`dispose()` when the host is removed. See the
[lifecycle guide](https://audiobits.joacod.com/docs/lifecycle) for pending activation,
page hiding, and navigation.

## Explore AudioBits

### Bundled sounds

Import ready-to-use recipes from `audiobits/recipes`, preview them in the
[live catalog](https://audiobits.joacod.com/catalog), and adjust supported
[parameters and seeds](https://audiobits.joacod.com/docs/parameters). Use them as
starting points for your own sounds. See the
[recipe guide](https://audiobits.joacod.com/docs/recipes) for editable, versioned
recipe data.

### Interactive examples

[Energy Charge](https://audiobits.joacod.com/catalog/energy-charge) and
[Reactive Thruster](https://audiobits.joacod.com/catalog/reactive-thruster) show
sound responding continuously to application state and user input. Copy their
independent source code from the repository-root
[`catalog/`](https://github.com/joacod/audiobits/tree/main/catalog) into your app
and use AudioBits as the runtime.

Bundled sounds are package exports. These interactive examples are copy-in
source, not exports from `audiobits/recipes`.

## Why AudioBits?

- **Procedural by design.** Generate effects in the browser without managing
  prerecorded audio assets.
- **Responsive to state.** Update supported live parameters as an interaction
  changes.
- **Portable recipes.** Edit and share versioned JSON sound definitions.
- **Small runtime.** Framework-independent, with zero runtime dependencies.

## Learn more

- [Documentation](https://audiobits.joacod.com/docs) and
  [live catalog](https://audiobits.joacod.com/catalog).
- Contribute: [development and checks](docs/development.md),
  [architecture](docs/architecture.md), and [recipe invariants](docs/recipe-model.md).
- [Browser verification and evidence limits](docs/validation.md#browser-policy).

[MIT license](LICENSE).
