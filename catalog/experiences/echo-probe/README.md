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
Surface runs from dark/absorbent to bright/resonant. It controls a material filter
with fixed resonance, independently of distance. Distance controls arrival,
propagation loss, and a separate damping filter. Intensity sets reflection strength;
pan sets stereo placement. These are stylized acoustics, not meters or a room
simulation. The same material filter is used at every distance.

`echo.emit(reflections, { strength: 0.8, seed: 42 })` returns an emission with
audio-clock `at`, normalized `reflections` with their scheduled `at` times,
`ended`, and `stop()`. The pulse begins 12 ms ahead of the audio clock; early
returns follow it by `0.09 + distance * 0.9` seconds. Each early return regenerates
the emitted layers with the same seed, including rim variation and noise.
Native oscillator phase can vary with scheduled start time; this is deterministic
resynthesis, not a sample-identical delayed recording.

Three quiet late grains follow the last early return by 110 to 283 ms, with
seeded timing, alternating stereo spread, spectral damping, and falling gain.
They share the reflectors' material character and remain silent between emissions.
There is no atmospheric loop. Omit reflections to hear the pulse alone.
Use scheduled times for application feedback, while accounting for cancellation
when a newer emission takes priority. No JavaScript timer schedules sound.

There are at most two foreground emissions and one releasing group, six early
returns and three late grains per emission: ten voices and 34 source nodes per
full group, at most 30 voices and 102 source nodes owned by this controller.
The example's 32-voice engine leaves two voices for other users. Smaller engine
limits or additional shared sounds can still cause engine voice stealing.

At 120 ms intervals, new emissions cancel older pending late energy first.
A third foreground emission releases the oldest group, cancelling its future
returns and fading its audible voices. Releases are bounded to 40 ms plus a
50 ms filter tail, shorter than the admission interval. Expired retiring groups
can be reclaimed on the audio clock even if ended delivery is delayed.

Calls before activation, during the 120 ms cooldown, at zero strength, or after
disposal return `null`. Three still-releasing groups also return `null`, bounding
repeated Stop/emit calls at the same audio time. Stop cancels pending returns
and releases current voices; `active` includes releasing groups until cleanup.
Disposal cuts owned sounds and removes the subscription. Neither operation
affects unrelated sounds in a shared engine. Engine interruption cancels pending
returns. Final `ended` includes cancelled voices and all remaining finite tails.

The application owns activation, error UI, pending-start invalidation, blur/hide
cancellation, suspension, and final engine disposal. Returning requires a fresh
gesture. See the [lifecycle guide](https://www.audiobits.dev/docs/lifecycle).

## Sound and showcase source

`echoProbe` combines a struck body, bending rim, pressure transient, and air edge.
`probeReturn` preserves those layers with independent material and propagation
filters. `probeReflection`, the provisional default, adds resonance to that
material filter without adding a separately pitched answering note.
`probeDiffusion` supplies two-layer late grains. These portable schema-1 recipes
use existing synthesis, filters, automation, and seeded variation. No new runtime
capability is required by this composition.

Try the [showcase](https://www.audiobits.dev/catalog/echo-probe).
The [repository acoustic bench](https://github.com/joacod/audiobits/tree/main/catalog/experiences/echo-probe)
keeps the original independent synthesis (A), pulse-preserving returns (B),
resonant returns (C), and an experimental filtered native delay available for
listening review. Select a composition, remember it, then change one control
and alternate the two audition buttons. Seed, distance, material, strength,
and direction remain fixed unless you change them. Select early returns only
to compare identity; compare the noise wash and grain cluster separately.
Return-energy matching keeps the dry pulse unchanged and bounds output headroom.
Disable it when evaluating propagation loss or strength. It helps comparison
but does not prove equal perceived loudness.

The original A reference intentionally retains its original distance/material
coupling and noise wash. B, C, and delay use the separated controls. The rapid
button exercises the production controller for twelve emissions at audio-clock
intervals of at least 120 ms. Stop also invalidates pending auditions and cancels playback.
Run it with the [catalog demo setup](https://github.com/joacod/audiobits/blob/main/catalog/README.md#optional-standalone-demo).
The bench uses repository compiler internals for offline measurement; it and the
original reference are development tools, excluded from registry installation.
The native delay prototype is not a catalog effects engine or public API.

The [website stage source](https://github.com/joacod/audiobits/blob/main/apps/www/app/echo-probe-stage.ts)
owns pointer mapping, reflectors, and timing feedback. Automated Chromium signal
and lifecycle checks establish technical behavior, not listening quality or
physical-device compatibility. Final resonance, material balance, diffuse texture,
and delay-versus-resynthesis preference require the owner's listening review.
