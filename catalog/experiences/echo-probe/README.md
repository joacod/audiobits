# Echo Probe

Install with `npx shadcn@latest add joacod/audiobits/echo-probe`.
The item installs `recipe.ts`, `controller.ts`, and this guide under
`src/sounds/experiences/echo-probe/`. You own the source. `audiobits` is the only
runtime dependency. Native late repeats require the delay capability declared
in `audiobits/capabilities.json`; the registry specifies the compatible runtime
range, starting at the native delay release (0.3.0).

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
Each reflection plays one of three materials: `wood` knocks short and dry,
`metal` rings long with slow beating, and `glass` shimmers high. Pass an optional
`material` to choose one. Without it (or with an unknown value), `surface`
selects it: below 0.3 is wood, below 0.75 is metal, otherwise glass. Each material
has its own exciter, resonant partials, decay, and echo. Distance controls
arrival, propagation loss, and a damping filter, without retuning the material.
Intensity sets reflection strength; pan sets stereo placement. These are stylized
acoustics, not meters or a room simulation.

`echo.emit(reflections, { strength: 0.8, seed: 42 })` returns an emission with
audio-clock `at`, normalized `reflections` with their scheduled `at` times,
`ended`, and `stop()`. The pulse begins 12 ms ahead of the audio clock; early
returns follow it by `0.09 + distance * 0.9` seconds. Each early return strikes
its material with the emission seed, so the same emission replays identically.
Native oscillator phase can vary with scheduled start time; this is deterministic
synthesis, not a sample-identical delayed recording.

Three quiet late grains follow the last early return by 110 to 283 ms, with
seeded timing, alternating stereo spread, spectral damping, and falling gain.
Each grain replays its reflector's material through that material's own native
echo: wood repeats after 55 to 85 ms with little feedback, glass after 130 to
190 ms, and metal after 240 to 320 ms with the most feedback and late energy.
Early returns stay dry, so the echo belongs to the diffuse field rather than to
the scheduled surface events. Grains remain silent between emissions.
There is no atmospheric loop. Omit reflections to hear the pulse alone.
Use scheduled times for application feedback, while accounting for cancellation
when a newer emission takes priority. Read-only `cancelledAt` is `null` until
retirement, Stop, interruption, or disposal; it then retains the first cancellation
time on the audio clock, before `ended` settles. Suppress paths and highlights for
reflections whose `at > cancelledAt`. Returns at or before that time have started
and may finish their existing visual decay. Scheduled `reflections` stay immutable.
No JavaScript timer schedules sound.

There are at most two foreground emissions and one releasing group, six early
returns and three late grains per emission: ten voices per full group. Sources
per voice are two for the pulse, four for wood, six for glass, and seven for
metal, so an all-metal group uses at most 65 synthesis sources. The three late
voices also own one silent lifetime clock each and four delay-processing nodes
each, with at most 960 ms of mono delay storage per group. At most 30 voices,
195 synthesis sources and nine lifetime clocks are owned by this controller.
The example's 32-voice engine leaves two voices for other users. Smaller engine
limits or additional shared sounds can still cause engine voice stealing.

At 120 ms intervals, new emissions cancel older pending late energy first.
Late voices use an emission-owned sound whose disposal immediately cuts its
pending grains and native repeats. A third foreground emission releases the
oldest group, cancelling its future
returns and fading its audible voices. Early returns have no delay, so their
releases are bounded to 20 ms plus a 50 ms filter tail, inside the 90 ms reclaim
and shorter than the admission interval. Expired retiring groups
can be reclaimed on the audio clock even if ended delivery is delayed.

Calls before activation, during the 120 ms cooldown, at zero strength, or after
disposal return `null`. Three still-releasing groups also return `null`, bounding
repeated Stop/emit calls at the same audio time. Stop cancels pending returns
and releases current early voices, cutting the owned late sound and its repeats;
`active` includes releasing groups until cleanup.
Disposal cuts owned sounds and removes the subscription. Neither operation
affects unrelated sounds in a shared engine. Engine interruption cancels pending
returns. Final `ended` includes cancelled voices and all remaining finite tails.

The application owns activation, error UI, pending-start invalidation, blur/hide
cancellation, suspension, and final engine disposal. Returning requires a fresh
gesture. See the [lifecycle guide](https://www.audiobits.dev/docs/lifecycle).

## Sound and showcase source

`echoProbe` combines a struck body and an air edge. `materials` describes wood,
glass, and metal: exciter, partials, decay, distance damping, and echo.
`probeReturns` holds one dry early return per material and `probeEchoes` the
same voices with their native echo for late grains. `materialFor(surface)`
maps a legacy surface value to a material.

Try the [showcase](https://www.audiobits.dev/catalog/echo-probe).
The [repository acoustic bench](https://github.com/joacod/audiobits/tree/main/catalog/experiences/echo-probe)
keeps the original PR #100 reference and the production materials available for
review. Select a composition and material, remember it, then change one control
and alternate the audition buttons. Seed, distance, material, strength, and
direction remain fixed unless you change them. Return-energy matching keeps the
dry pulse unchanged and bounds output headroom. Disable it for propagation loss
or strength checks; it helps comparison but does not prove equal perceived
loudness.

The original reference retains its material/distance coupling and noise wash.
The rapid button exercises the production materials for twelve emissions at
audio-clock intervals of at least 120 ms. Stop invalidates pending auditions and
cancels playback. Run it with the
[catalog demo setup](https://github.com/joacod/audiobits/blob/main/catalog/README.md#optional-standalone-demo).
The bench uses repository compiler internals for offline measurement of public
recipes; it and the original reference are excluded from registry installation.
No custom native delay graph is used by the installed sound or comparison.

The [website stage source](https://github.com/joacod/audiobits/blob/main/apps/www/app/echo-probe-stage.ts)
owns pointer mapping, reflectors, and timing feedback. Automated Chromium signal
and lifecycle checks establish technical behavior, not listening quality or
physical-device compatibility. Final resonance, material balance, diffuse texture,
and the wood, metal, and glass voicing require the owner's listening review.
