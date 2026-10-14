# Echo Probe

Install with `npx shadcn@latest add joacod/audiobits/echo-probe`.
The item installs `recipe.ts`, `controller.ts`, and this guide under
`src/sounds/experiences/echo-probe/`. You own the source. `audiobits` is the only
runtime dependency.

## Application integration

Use this example in `src/integration.ts`. Connect `play()` directly to an existing
gesture and handle activation errors. Supply reflection data from your application,
connect `stop()` to cancellation, and call `dispose()` on removal.

```ts
import { createAudio } from "audiobits";
import {
  createEchoProbe,
  type ProbeReflection,
} from "./sounds/experiences/echo-probe/controller";

const audio = createAudio({ maxVoices: 32, maxVoicesPerSound: 16 });
const echo = createEchoProbe(audio);
let request = 0;

export async function play() {
  const token = ++request;
  await audio.start();
  if (token !== request) return;
  return echo.emit(
    [
      { distance: 0.18, pan: -0.75, intensity: 0.9, surface: 0.9 },
      { distance: 0.55, pan: 0.7, intensity: 0.8, surface: 0.15 },
      { distance: 0.82, pan: 0.15, intensity: 0.65, surface: 0.65 },
    ],
    { seed: 42 },
  );
}

export function emit(reflections: readonly ProbeReflection[], seed = 42) {
  return echo.emit(reflections, { seed });
}

export function stop() {
  request++;
  echo.stop();
}

export async function dispose() {
  stop();
  echo.dispose();
  await audio.dispose();
}
```

After activation, `emit()` accepts up to six reflections. Distance, intensity,
surface, and optional emission strength are normalized to `[0, 1]`; stereo pan
is `[-1, 1]`. Finite out-of-range inputs clamp, nonfinite values become zero.
Surface runs from dark/absorbent to bright/ringing. Distance changes return time,
level, brightness, and diffuse spread. These are stylized acoustics, not meters
or a room simulation. Stereo collapses gracefully to a mono mix.

`echo.emit(reflections, { strength: 0.8, seed: 42 })` returns an emission with
audio-clock `at`, normalized `reflections` with their exact scheduled `at` times,
`ended`, and `stop()`. Use those times for application visuals. The pulse begins
12 ms ahead of the audio clock; returns follow it by `0.09 + distance * 0.9`
seconds, followed by a finite diffuse tail. No JavaScript timer schedules sound.
The seed controls procedural noise and rim variation; repeat it for reproducible
sound parameters. Omit reflections to hear the pulse alone.

There are at most two overlapping emissions, six returns per emission, and
thirteen voices per emission. Emissions closer than 120 ms, zero strength, calls
before activation, capacity overflow, and post-disposal calls return `null`.
Lower engine limits can steal voices; the example reserves enough for the full
26-voice overlap. Stop cancels future returns and releases current voices.
Stopping emissions remain counted until their tails finish. Disposal cuts owned
sounds and removes the subscription. Neither operation affects unrelated sounds
in a shared engine. Engine interruption also cancels pending returns.

The application owns activation, error UI, pending-start invalidation, blur/hide
cancellation, suspension, and final engine disposal. Returning requires a fresh
gesture. See the [lifecycle guide](https://www.audiobits.dev/docs/lifecycle).

## Sound and showcase source

`echoProbe` combines a struck body, bending rim, pressure transient, and air edge.
`probeReflection` resynthesizes the return with surface-dependent body, ring, and
filtered scatter. `probeDiffusion` supplies finite late energy. These portable
schema-1 recipes use existing synthesis, filters, automation, and seeded variation.

Try the [showcase](https://www.audiobits.dev/catalog/echo-probe).
The [repository acoustic bench](https://github.com/joacod/audiobits/tree/main/catalog/experiences/echo-probe)
compares emission alone, near/far, dark/bright, strong/weak, stereo, and a chamber.
Run it with the [catalog demo setup](https://github.com/joacod/audiobits/blob/main/catalog/README.md#optional-standalone-demo).
The browser host and HTML are excluded from installation. The
[website stage source](https://github.com/joacod/audiobits/blob/main/apps/www/app/echo-probe-stage.ts)
owns pointer mapping, reflectors, and timing feedback. Automated Chromium signal and lifecycle
checks do not establish listening quality or physical-device compatibility.
