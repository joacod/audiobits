# Reactive thruster

Install with `npx shadcn@latest add joacod/audiobits/reactive-thruster`.
You own and may modify the installed source.
The item installs `recipe.ts`, `pointer.ts`, and this guide under
`src/sounds/experiences/reactive-thruster/`. `audiobits` is the only runtime dependency.

## Application integration

Use this example in `src/integration.ts`. Connect `play()` directly to a user
gesture and handle activation errors. Connect `update()` to application state or
events, `stop()` to cancellation, and `dispose()` to removal:

```ts
import { createAudio } from "audiobits";
import { createThruster } from "./sounds/experiences/reactive-thruster/pointer";

const audio = createAudio();
const thruster = createThruster(audio);
let request = 0;

export async function play() {
  const token = ++request;
  await audio.start();
  if (token !== request) return;
  thruster.start(0.2);
}

export function update(value: number) {
  thruster.setThrottle(value);
}

export function stop() {
  request++;
  thruster.stop();
}

export async function dispose() {
  stop();
  thruster.dispose();
  await audio.dispose();
}
```

Supply normalized throttle in `[0, 1]`. The controller bounds input and owns
no DOM, pointer handlers, or animation frames. Its recipe provides motor, turbine,
and exhaust layers with 60 ms native smoothing and up to 280 ms release.
Impact is a separate showcase action, not a dependency of this controller.

The controller uses an application-owned engine. When sharing an engine, dispose
only this controller on removal; the application owns engine suspension and final
disposal. Stop on cancellation, blur, or hiding, and invalidate pending activation
before suspension or teardown. Returning requires a fresh user gesture.
See the [lifecycle guide](https://www.audiobits.dev/docs/lifecycle).

## Repository showcase

The complete [public showcase](https://www.audiobits.dev/catalog/reactive-thruster) and
[repository demo](https://github.com/joacod/audiobits/tree/main/catalog/experiences/reactive-thruster)
remain available. Their browser host, input adapters, visuals, and HTML are
repository examples and are excluded from installation. Run the demo from a
repository checkout using the
[catalog setup](https://github.com/joacod/audiobits/blob/main/catalog/README.md#optional-standalone-demo).

Source contents and targets are defined by the root `registry.json`. Recipes use
schema 1 and public AudioBits exports. Automated browser verification targets
Chromium; signal and lifecycle checks do not establish listening quality or
physical-device compatibility.
