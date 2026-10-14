# Lightsaber

Install with `npx shadcn@latest add joacod/audiobits/lightsaber`.
You own and may modify the installed source. Retain the included MIT license.
The item installs `recipe.ts`, `controller.ts`, this guide, and `LICENSE` under
`src/sounds/experiences/lightsaber/`. `audiobits` is the only runtime dependency.

## Application integration

Use this example in `src/integration.ts`. Connect `play()` directly to a user
gesture and handle activation errors. Connect `update()` to application state or
events, `stop()` to cancellation, and `dispose()` to removal:

```ts
import { createAudio } from "audiobits";
import { createLightsaber } from "./sounds/experiences/lightsaber/controller";

const audio = createAudio();
const blade = createLightsaber(audio);
let request = 0;

export async function play() {
  const token = ++request;
  await audio.start();
  if (token !== request) return;
  blade.ignite();
}

export function update(value: number, elapsed = 16, direction = 0) {
  blade.update(value, elapsed, direction);
}

// Connect your application collision event; force [0, 1], pan [-1, 1].
export function strike(force = 0.8, pan = 0) {
  return blade.clash(force, pan);
}
export function retract() {
  request++;
  blade.retract();
}

export function stop() {
  request++;
  blade.stop();
}

export async function dispose() {
  stop();
  blade.dispose();
  await audio.dispose();
}
```

The controller owns the sustained hum plus ignition, swing, clash, and retraction
recipes in `recipe.ts`. Supply movement in `[0, 1]`, elapsed milliseconds, and
direction in `[-1, 1]`. `clash(force, pan)` accepts application collision events;
`retract()` adds a retraction accent. `stop()` releases owned voices, while
`dispose()` cuts owned sounds. It contains no stage or collision geometry.

The controller uses an application-owned engine. When sharing an engine, dispose
only this controller on removal; the application owns engine suspension and final
disposal. Stop on cancellation, blur, or hiding, and invalidate pending activation
before suspension or teardown. Returning requires a fresh user gesture.
See the [lifecycle guide](https://www.audiobits.dev/docs/lifecycle).

## Repository showcase

The complete [public showcase](https://www.audiobits.dev/catalog/lightsaber) and
[repository demo](https://github.com/joacod/audiobits/tree/main/catalog/experiences/lightsaber)
remain available. Their browser host, input adapters, visuals, and HTML are
repository examples and are excluded from installation. Run the demo from a
repository checkout using the
[catalog setup](https://github.com/joacod/audiobits/blob/main/catalog/README.md#optional-standalone-demo).

Source contents and targets are defined by the root `registry.json`. Recipes use
schema 1 and public AudioBits exports. Automated browser verification targets
Chromium; signal and lifecycle checks do not establish listening quality or
physical-device compatibility.
