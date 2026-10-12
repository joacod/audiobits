# AudioBits

**Sound that reacts.**

Procedural sound effects for the web. AudioBits generates sound in the browser
from editable recipes, with bundled effects ready to use and supported live
parameters that can respond to application state while a voice is playing.
Build additional sounds and interactions from existing primitives. No
prerecorded audio files or runtime dependencies required.

[Live catalog](https://audiobits.joacod.com/catalog) ·
[Documentation](https://audiobits.joacod.com/docs)

## Quick start

Install in a browser application with a bundler:

```sh
npm install audiobits
```

Create the engine and sound once. Construction is silent; call `play()` directly
from a user gesture, such as a button click. It awaits activation before playback.

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

Surface rejected activation, for example `void play().catch(console.error)`, and
retry from a fresh gesture. Bind `stop()` to Stop and await `dispose()` when the
host is removed. For pending activation, page hiding, and navigation, follow the
[lifecycle guide](https://audiobits.joacod.com/docs/lifecycle).

## Bundled recipes

Eight bundled recipes are available from `audiobits/recipes`: confirmation, impact,
thruster, tactile click, gentle rejection, glass notification, whoosh, and power-up.
Start with these ready-to-use sounds and vary playback with supported
[parameters and seeds](https://audiobits.joacod.com/docs/parameters).

## Reactive sound and live parameters

Some recipes expose live parameters you can update through `voice.set()` while
the voice is playing. Sustained sounds can change continuously with application
state, enabling charging, movement-driven sound, and other responsive effects.
The bundled Thruster recipe is sustained and exposes a live `throttle` control.
Only parameters declared live can be updated; not every recipe supports live
controls or sustained playback. See the
[parameter guide](https://audiobits.joacod.com/docs/parameters) for details.

## Customization and composition

- **Custom recipes:** Define and adapt procedural sounds with
  [editable JSON recipes](https://audiobits.joacod.com/docs/recipes), using
  `defineSound()` for typed authoring or `validateRecipe()` for external data.
- **Voices and routing:** Combine sounds through reusable sound definitions and
  individual voices. [Buses](https://audiobits.joacod.com/docs/buses) provide
  gain, mute, and routing for managing the mix.
- **Native integration:** [Output taps](https://audiobits.joacod.com/docs/native)
  connect caller-owned Web Audio analysers and nodes.
- **Typed recipes:** Exported types, `audiobits/schema.json`, and
  `audiobits/capabilities.json` describe the installed package's versioned recipe
  format and supported capabilities. Semantic validation still requires
  `validateRecipe()`.

## Independent interactive examples

Build richer interactions with existing AudioBits primitives. Two independent
examples provide sound and controller source you can copy and adapt:

- [Energy Charge](https://audiobits.joacod.com/catalog/energy-charge) demonstrates
  progress-driven procedural sound with continuously updated application state.
- [Reactive Thruster](https://audiobits.joacod.com/catalog/reactive-thruster)
  demonstrates sound responding to movement and interactive controls.

These examples live in the repository-root
[`catalog/`](https://github.com/joacod/audiobits/tree/main/catalog). They are
copy-in source, not additional bundled exports from `audiobits/recipes`. The
website's enhanced visual presentations are separate from the portable sound
and controller source.

## Learn more

The [API reference](https://audiobits.joacod.com/docs/api) explains public options
and limits. Integration guidance also ships in the
[AudioBits Skill](skill/SKILL.md).

Automated browser checks cover current Chromium; other browsers and operating
systems remain unverified. They do not establish listening quality or
physical-device compatibility.
