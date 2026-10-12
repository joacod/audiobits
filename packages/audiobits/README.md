# AudioBits

**Sound that reacts.**

A framework-independent procedural sound engine for the browser, with zero
runtime dependencies. Define sounds as versioned recipe data, play managed
voices, and connect supported live parameters to application state.

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
import { createAudio, defineSound } from "audiobits";

const recipe = defineSound({
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.15,
  layers: [
    {
      id: "tone",
      source: { type: "oscillator", waveform: "sine", frequency: 660 },
      gainDb: -18,
      envelope: { attack: 0.004, decay: 0.08, sustain: 0.1, release: 0.04 },
    },
  ],
});
const audio = createAudio();
const sound = audio.sound(recipe);

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

## Recipes and interactions you own

The npm package contains the engine, recipe language, types, validation, schema
and capability metadata. Ready-made recipes and interactive experiences live in
the [copy-owned catalog](https://github.com/joacod/audiobits/tree/main/catalog).
Copy or install the source you need, retain its MIT license, and import it locally.
The copied files belong to your application and can be edited independently.
See the [migration guide](https://audiobits.joacod.com/docs/recipes#migrating-from-bundled-recipes)
when upgrading from a version with bundled recipe exports.

## Controls and composition

- **Reactive sound:** Sustained recipes can expose live parameters through
  `voice.set()`. Only parameters declared live can be updated. See
  [parameters and seeds](https://audiobits.joacod.com/docs/parameters).
- **Custom recipes:** Use `defineSound()` for typed authoring and
  `validateRecipe()` for external data. Exported recipe types,
  `audiobits/schema.json` and `audiobits/capabilities.json` describe the installed
  runtime and recipe language. Semantic validation still requires `validateRecipe()`.
- **Voices and routing:** Reuse sound definitions and route individual voices
  through [buses](https://audiobits.joacod.com/docs/buses) for gain and mute.
- **Native integration:** [Output taps](https://audiobits.joacod.com/docs/native)
  connect caller-owned Web Audio analysers and nodes.

The [API reference](https://audiobits.joacod.com/docs/api) explains options and limits.
Agent guidance is distributed separately in the repository's
[AudioBits Skill](https://github.com/joacod/audiobits/tree/main/skills/audiobits).

Automated browser checks cover current Chromium; other browsers and operating
systems remain unverified. They do not establish listening quality or
physical-device compatibility.
