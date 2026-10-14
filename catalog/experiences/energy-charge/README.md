# Energy charge

Install with `npx shadcn@latest add joacod/audiobits/energy-charge`.
You own and may modify the installed source.
The item installs `recipe.ts`, `progress.ts`, and this guide under
`src/sounds/experiences/energy-charge/`. `audiobits` is the only runtime dependency.

## Application integration

Use this example in `src/integration.ts`. Connect `play()` directly to a user
gesture and handle activation errors. Connect `update()` to application state or
events, `stop()` to cancellation, and `dispose()` to removal:

```ts
import { createAudio } from "audiobits";
import { createEnergyCharge } from "./sounds/experiences/energy-charge/progress";

const audio = createAudio();
const charge = createEnergyCharge(audio);
let request = 0;

export async function play() {
  const token = ++request;
  await audio.start();
  if (token !== request) return;
  charge.start(0);
}

export function update(value: number) {
  charge.setCharge(value);
}

export function stop() {
  request++;
  charge.stop();
}

export async function dispose() {
  stop();
  charge.dispose();
  await audio.dispose();
}
```

Supply finite progress in `[0, 1]`, in either direction. Full charge holds until
`release()` or `stop()`. Release preserves the 300 ms fade and 50 ms filter cleanup;
there is no completion accent.

The controller uses an application-owned engine. When sharing an engine, dispose
only this controller on removal; the application owns engine suspension and final
disposal. Stop on cancellation, blur, or hiding, and invalidate pending activation
before suspension or teardown. Returning requires a fresh user gesture.
See the [lifecycle guide](https://www.audiobits.dev/docs/lifecycle).

## Repository showcase

The complete [public showcase](https://www.audiobits.dev/catalog/energy-charge) and
[repository demo](https://github.com/joacod/audiobits/tree/main/catalog/experiences/energy-charge)
remain available. Their browser host, input adapters, visuals, and HTML are
repository examples and are excluded from installation. Run the demo from a
repository checkout using the
[catalog setup](https://github.com/joacod/audiobits/blob/main/catalog/README.md#optional-standalone-demo).

Source contents and targets are defined by the root `registry.json`. Recipes use
schema 1 and public AudioBits exports. Automated browser verification targets
Chromium; signal and lifecycle checks do not establish listening quality or
physical-device compatibility.
