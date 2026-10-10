# Energy charge

A developer-owned sustained energy field, outside the npm runtime. Copy
[recipe.ts](recipe.ts) alone for the sound, or add [progress.ts](progress.ts) for
application-controlled progress. Install `audiobits` in your browser project.

```ts
import { createAudio } from "audiobits";
import { createEnergyCharge } from "./progress";

const audio = createAudio({ maxVoices: 3, maxVoicesPerSound: 2 });
const charge = createEnergyCharge(audio, {
  state: console.log,
  error: console.error,
});
// In a direct user gesture:
charge.start(0);
// Your application supplies finite normalized progress, in any direction:
charge.setCharge(0.7);
charge.setCharge(0.3);
charge.setCharge(1); // Holds indefinitely. No implicit completion.
charge.release(); // 300 ms release, plus 50 ms filter cleanup.
charge.cancel(); // Invalidate pending activation and release. No completion accent.
// When removing your integration:
charge.dispose(); // Cuts its owned sounds; does not dispose the shared engine.
void audio.dispose(); // The host owns final engine cleanup.
```

For direct recipe usage, create `audio.sound(energyCharge)`, await `audio.start()`
in a gesture, call `sound.play({ parameters: { charge: 0 } })`, then use
`voice.set({ charge })`, `voice.stop()` and finally `audio.dispose()`.

The schema-1 recipe contains no UI, timer or assets. A sine fundamental rises
from 80 to 320 Hz. Triangle and slightly detuned sawtooth layers form a beating
field, opening lowpass filters as progress rises. A quiet bandpass noise layer
adds air. All pitch, filter and gain mappings retarget over 80 ms. Full charge
sustains until released; decreasing progress reduces intensity on the same voice.
Signal bounds are verified for the default master level and bounded voices,
not arbitrary application mixes. Automated checks do not judge listening quality.

## Complete browser example

Copy `recipe.ts`, `progress.ts`, [host.ts](host.ts) and [index.html](index.html)
into one folder, then run:

```sh
npm install audiobits
npm install --save-dev vite typescript
npx vite
```

Start charge activates audio explicitly. The slider supplies arbitrary progress,
Release preserves the tail (300 ms fade plus 50 ms filter cleanup), Stop all
cuts voices and cancels pending playback,
and Mute preserves progress silently. Activation errors allow a fresh Start.
The host suspends on hide, stops on blur, closes on pagehide and exposes
`host.dispose()` for SPA navigation teardown. Returning never resumes old input.
The host owns its engine; `progress.ts` can instead share an application engine.
Per-sound limits bound overlapping tails during rapid release/restart.

The [website showcase](https://audiobits.joacod.com/experiences/energy-charge)
uses these exact sources, adding a three-second hold interaction at the UI layer.
No completion accent is included: releasing is the recipe's clean tail, while
cancellation never produces a success sound. A game or task may supply its own
progress and choose its own completion policy without copying the showcase.
