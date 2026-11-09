# Groove Mixer

Mix a repeating bass-and-drums beat at 120 BPM, inspired by Audio Lab's mixer.
Install with `npx shadcn@latest add joacod/audiobits/groove-mixer`.
The source includes the controller, canonical picked bass and drum recipes,
and the bass recipe's mapping helper. It has no UI or framework dependency.

## Application integration

Use in `src/integration.ts`. Connect `play()` directly to a user gesture and
handle rejected activation. Connect `stop()` to cancellation, stop and suspend
on hiding, require a fresh gesture on return, and call `dispose()` on removal.

```ts
import { createAudio } from "audiobits";
import {
  createGroove,
  type MixChannel,
} from "./sounds/experiences/groove-mixer/controller";

const audio = createAudio({ maxVoices: 24, masterGainDb: -8 });
const groove = createGroove(audio, (cause) => console.error(cause));
let request = 0;

export async function play() {
  const token = ++request;
  await audio.start();
  if (token !== request) return;
  groove.start();
}

export function update(level: number) {
  groove.setMix("bass", { level });
}

export function mix(channel: MixChannel, level: number, muted: boolean) {
  groove.setMix(channel, { level, muted });
}

export function stop() {
  request++;
  groove.stop();
}

export async function dispose() {
  stop();
  groove.dispose();
  await audio.dispose();
}
```

The two-bar loop uses eighth-note hats, alternating kick and snare, and E2, E2,
G2, D2 bass notes. Notes are booked 150 ms ahead on the audio clock, refilled
every 25 ms. Missed steps are skipped after stalls. Stop disconnects the
session's buses and stops all its voices, including future notes. Restart begins
at the first step. Engine interruptions stop the loop without automatic replay.

`setMix(channel, { level, muted })` accepts `drums`, `bass` or `master`. Levels
are normalized to 0..1, with nonfinite input treated as zero. Mute preserves the
level. Settings survive Stop and restart. The controller's master bus belongs
only to this groove, so it does not alter other sounds sharing an engine.
`position()` returns eighth-note position with native output latency subtracted,
or -1 while stopped or awaiting the first note. Visuals can read this clock;
they never drive scheduling. The host owns gestures, suspension and engine disposal.

The website uses layered drum pulses and bass ribbons with a measured output
scope. These rhythmic shapes represent the pattern and mix, not isolated audio
measurements. Presentation and browser hosts remain outside installation.
Additional instruments can join as separate visual layers in a later iteration.
This version contains drums and bass only.

The default mix is drums 50%, bass 50%, master 80%, with engine gain at -8 dB
and a 24-voice budget. Recheck mix headroom when editing instruments or adding
parts. Automated Chromium signal and lifecycle checks do not establish listening
quality or physical-device behavior. You own the installed source under 0BSD.
