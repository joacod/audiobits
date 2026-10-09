# AudioBits

Browser-native procedural sound for games and interactive applications. Play
bundled sounds or vary editable JSON recipes, with no downloaded audio assets
and zero runtime dependencies.

[Try the live gallery](https://audiobits.joacod.com/sounds) ·
[npm package](https://www.npmjs.com/package/audiobits) ·
[Documentation](https://audiobits.joacod.com/docs)

## First playback

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

Construction is silent. Bind `play()` directly to a click handler and surface
activation failures, for example `void play().catch(console.error)`. Bind `stop()`
to Stop and await `dispose()` when the host is removed. See the
[lifecycle guide](https://audiobits.joacod.com/docs/lifecycle) for hiding and navigation.

## Learn more

- [Recipes and bundled sounds](https://audiobits.joacod.com/docs/recipes),
  [controls and seeded replay](https://audiobits.joacod.com/docs/parameters), and
  [routing](https://audiobits.joacod.com/docs/buses).
- Contribute: [local development and checks](docs/development.md),
  [architecture](docs/architecture.md), and [recipe invariants](docs/recipe-model.md).

Current Chromium is the only automated browser verification target. Other
browsers and operating systems are unverified. Automated checks do not establish
subjective listening quality or physical-device compatibility; see
[validation](docs/validation.md).

[MIT license](LICENSE).
