# Rhythm guitar

One procedural picked string for rhythm parts. Frequency is 80–880 Hz. Play separate pitches for major/minor chords. The fixed 0.32-second gate suits short strums, not long held chords.
Install with `npx shadcn@latest add joacod/audiobits/rhythm-guitar`.
This item includes its recipe, this guide and shared pitch/instrument helpers.
It does not require Riff Reactor or a song. All sounds are oscillator/noise recipes.

## Integration

Use this exact example in `src/integration.ts`. Connect `play()` directly to a
user gesture and handle rejected activation. Connect `stop()` to cancellation.
This integration owns a dedicated engine: Stop then suspend on hide, require a
fresh gesture to return, and call `dispose()` on removal.

```ts
import { createAudio } from "audiobits";
import { createInstrument } from "./sounds/helpers/instrument";
import { rhythmGuitar } from "./sounds/recipes/rhythm-guitar/recipe";

const audio = createAudio();
const instrument = createInstrument(audio, rhythmGuitar);
let request = 0;

export async function play() {
  const token = ++request;
  await audio.start();
  if (token !== request) return;
  instrument.play({ note: "D3", velocity: 0.8, seed: 42 });
}

export function stop() {
  request++;
  audio.stopAll({ tails: "cut" });
}
export async function dispose() {
  stop();
  instrument.dispose();
  await audio.dispose();
}
```

Velocity is normalized to 0..1. A zero velocity is a played level, not note-off.
`createInstrument` maps named pitches to the recipe's frequency control and returns
the native Voice. Keep notes within the declared range. One-shots keep their
own envelopes even when used in a phrase. Sustained voices require release.
The host owns activation, scheduling, suspension and engine disposal.

Use the shared `phrase()` helper for beat-based notes and chords, and
`createTransport(bpm, origin).timeAt(beat)` for scheduled `at` times. Future
onsets and releases use AudioContext seconds. Retain voices to cancel them, or
use Stop on this dedicated engine. For no-emit TypeScript checks use
`moduleResolution: "Bundler"` and `allowImportingTsExtensions: true`.

Chromium consumer checks cover activation, signal, Stop and disposal.
They do not establish acoustic realism or physical-device behavior.
