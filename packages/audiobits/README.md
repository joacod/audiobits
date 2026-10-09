# AudioBits

Browser-native procedural sound for games and interactive applications. Play
bundled sounds or build editable JSON recipes without downloaded audio assets
or runtime dependencies.

[Live gallery](https://audiobits.joacod.com/sounds) ·
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

## Sounds and controls

Eight bundled sounds are available from `audiobits/recipes`: confirmation, impact,
thruster, tactile click, gentle rejection, glass notification, whoosh, and power-up.
Use [custom JSON recipes](https://audiobits.joacod.com/docs/recipes) with
`defineSound()` for typed authoring or `validateRecipe()` for external data.

[Parameters and seeds](https://audiobits.joacod.com/docs/parameters) vary playback
and update live controls. [Buses](https://audiobits.joacod.com/docs/buses) provide
gain, mute, and routing; [native taps](https://audiobits.joacod.com/docs/native)
connect caller-owned analysers and nodes.

The [API reference](https://audiobits.joacod.com/docs/api) explains public options
and limits. Exported types, `audiobits/schema.json`, and
`audiobits/capabilities.json` describe the installed package; semantic validation
still requires `validateRecipe()`. Integration guidance also ships in the
[AudioBits Skill](skill/SKILL.md).

Automated browser checks cover current Chromium; other browsers and operating
systems remain unverified. They do not establish listening quality or
physical-device compatibility.
