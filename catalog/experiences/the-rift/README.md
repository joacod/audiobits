# The Rift

Install with `npx shadcn@latest add joacod/audiobits/the-rift`.
You own and may modify the installed source.
The item installs `recipe.ts`, `controller.ts`, and this guide under
`src/sounds/experiences/the-rift/`. `audiobits` is the only runtime dependency.

## Application integration

Use this example in `src/integration.ts`. Connect `play()` directly to a user
gesture and handle activation errors. Connect `update()` to application state,
`close()` to a deliberate closing action, `stop()` to cancellation, and
`dispose()` to removal:

```ts
import { createAudio } from "audiobits";
import {
  createRift,
  type RiftShape,
} from "./sounds/experiences/the-rift/controller";

const audio = createAudio();
const rift = createRift(audio);
let request = 0;

export async function play(shape: Partial<RiftShape> = { aperture: 0.6 }) {
  const token = ++request;
  await audio.start();
  if (token !== request) return;
  rift.open(shape);
  // Settle immediately, or after your own opening gesture is valid.
  rift.settle();
}

// Each value is normalized to [0, 1].
export function update(shape: Partial<RiftShape>) {
  rift.update(shape);
}

// The creative finale. Returns its audio-clock timeline.
export function close() {
  request++;
  return rift.collapse();
}

export function stop() {
  request++;
  rift.stop();
}

export async function dispose() {
  stop();
  rift.dispose();
  await audio.dispose();
}
```

The controller owns a sustained field plus opening, disturbance, collapse and
implosion recipes in `recipe.ts`. Its phases are `idle`, `opening`, `active` and
`collapsing`; `nextPhase(phase, event)` is the complete transition table. Read
`rift.phase` or subscribe with `rift.onPhase(listener)`. `open()` starts an
opening, `settle()` keeps it open, and `cancel()` heals an abandoned opening
without a collapse. `collapse()` folds the field and implodes, then returns to
`idle` after its bounded tail. Updates are ignored while collapsing.

- `aperture` exposes acoustic mass, resonant modes and filtered air.
- `tension` stretches inharmonic mode ratios and speeds up beating.
- `instability` adds rough sidebands, whistling turbulence and more frequent
  disturbances.

Once open, the field evolves without input. One timer per second picks slow
drift and level targets and schedules bounded, seeded disturbances on the audio
clock. Pass `{ disturbance(event) {} }` as the second argument to receive each
scheduled kind, audio-clock time, strength and pan. `stop()` silences owned
sound within a short fade; `stop()` and `dispose()` are safe to repeat.

The controller routes its voices through its own buses on an application-owned
engine. When sharing an engine, dispose only this controller on removal; the
application owns engine suspension and final disposal. Stop on cancellation,
blur, or hiding, and invalidate pending activation before suspension or
teardown. Returning requires a fresh user gesture. See the
[lifecycle guide](https://www.audiobits.dev/docs/lifecycle).

## Repository showcase

The complete [public showcase](https://www.audiobits.dev/catalog/the-rift) and
[repository source](https://github.com/joacod/audiobits/tree/main/catalog/experiences/the-rift)
remain available. The website stage, gestures and visuals are repository
examples and are excluded from installation.

Source contents and targets are defined by the root `registry.json`. Recipes use
schema 1 and public AudioBits exports. Automated browser verification targets
Chromium; signal and lifecycle checks do not establish listening quality or
physical-device compatibility.
