# Rock drum kit

Install with `npx shadcn@latest add joacod/audiobits/rock-drum-kit`.
The recipe module exports `rockKick`, `rockSnare`, `rockHat`, `rockOpenHat`
and `rockCrash`. These are Riff Reactor's existing oscillator/noise drums,
available without its controller or song. The catalog workbench previews the kick.
Each recipe has normalized play-mode `velocity` in 0..1 and keeps its fixed
one-shot envelope. The open hat does not automatically choke another hat.

## Integration

Use this example in `src/integration.ts`. Connect `play()` directly to a user
gesture and handle rejected activation. Bind `stop()` to cancellation. This
owns a dedicated engine: Stop then suspend on hide, require a new gesture on
return, and call `dispose()` on removal.

```ts
import { createAudio } from "audiobits";
import {
  rockKick,
  rockSnare,
  rockHat,
  rockOpenHat,
  rockCrash,
} from "./sounds/recipes/rock-drum-kit/recipe";

const audio = createAudio();
const kick = audio.sound(rockKick);
const snare = audio.sound(rockSnare);
const hat = audio.sound(rockHat);
const openHat = audio.sound(rockOpenHat);
const crash = audio.sound(rockCrash);
let request = 0;

export async function play() {
  const token = ++request;
  await audio.start();
  if (token !== request) return;
  // Reserve the same 150 ms scheduling horizon as Riff's backing band so
  // preparing several voices does not consume the shared opening timestamp.
  const at = audio.native.context.currentTime + 0.15;
  const beat = 60 / 124;
  kick.play({ at, parameters: { velocity: 0.8 }, seed: 42 });
  hat.play({ at, parameters: { velocity: 0.5 }, seed: 42 });
  snare.play({ at: at + beat, parameters: { velocity: 0.75 }, seed: 42 });
  openHat.play({
    at: at + beat * 1.5,
    parameters: { velocity: 0.45 },
    seed: 42,
  });
  crash.play({ at, parameters: { velocity: 0.6 }, seed: 42 });
  kick.play({ at: at + beat * 2, parameters: { velocity: 0.7 }, seed: 42 });
}

export function stop() {
  request++;
  audio.stopAll({ tails: "cut" });
}
export async function dispose() {
  stop();
  for (const sound of [kick, snare, hat, openHat, crash]) sound.dispose();
  await audio.dispose();
}
```

No pitch control is declared: these are tuned percussion sounds. Seeded
variation changes drum and cymbal resonances. Future onsets use AudioContext
seconds, and Stop cancels both future hits and sounding tails on this engine.
On a shared engine retain and cancel only this kit's voices instead.
Chromium consumer checks cover activation, signal, Stop and disposal, not
physical-device behavior or acoustic-kit realism.
