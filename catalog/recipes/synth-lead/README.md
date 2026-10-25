# Synth lead

A sustained saw and triangle lead with an authored 50 ms pitch scoop and live
filter brightness. Install with `npx shadcn@latest add joacod/audiobits/synth-lead`.
The manifest includes this recipe, guide and `src/sounds/helpers/` sources;
Riff Reactor's song and controller are not required. For no-emit TypeScript
checks, use `moduleResolution: "Bundler"` and `allowImportingTsExtensions: true`
to accept the recipe's explicit `.ts` helper import.

## Integration

Place this exact example in `src/integration.ts`. Bind `play()` directly to an
existing user gesture and handle its rejected promise. Bind `update()` to your
brightness input, `release()` to note release, and `stop()` to cancellation.
This integration owns a dedicated engine; the application suspends it on hide
and calls `dispose()` on removal. Invalidate pending activation with Stop first.

```ts
import { createAudio } from "audiobits";
import { createInstrument } from "./sounds/helpers/instrument";
import { synthLead } from "./sounds/recipes/synth-lead/recipe";

const audio = createAudio();
const lead = createInstrument(audio, synthLead);
let request = 0;
let voice: ReturnType<typeof lead.play> | undefined;

export async function play() {
  const token = ++request;
  await audio.start();
  if (token !== request) return;
  voice?.stop();
  const at = audio.native.context.currentTime + 0.02;
  voice = lead.play({
    note: "A4",
    velocity: 0.8,
    parameters: { brightness: 0.5 },
    at,
    seed: 42,
  });
  // Schedule release now on the audio clock; no note-off timer is needed.
  voice.stop({ at: at + 1 });
}

export function update(brightness: number) {
  if (voice?.state === "active") voice.set({ brightness });
}

export function release() {
  request++;
  voice?.stop();
  voice = undefined;
}

export function stop() {
  request++;
  audio.stopAll({ tails: "cut" });
  voice = undefined;
}

export async function dispose() {
  stop();
  lead.dispose();
  await audio.dispose();
}
```

## Controls and authoring

`createInstrument` returns the native Voice. `parameters` retains the supplied
recipe's play controls; `voice.set()` accepts only its live controls. Brightness
is in `0..1`; frequency is `110..880` Hz (A2 through A5). Frequency is a play
control so the authored onset contour remains intact. Velocity is normalized
`0..1`, and zero is a valid played level, never note-off.

The adapter uses the conventional `frequency` and `velocity` parameter names.
Explicit `note` and `velocity` override `parameters.frequency` and
`parameters.velocity`; other parameters pass through unchanged. A note requires
a frequency control. Velocity is ignored by recipes without a velocity control.
The engine validates playback and owns the immutable `lead.recipe` snapshot.

The copy-owned `helpers/music.ts` also exports `noteToHz`, `noteToMidi`,
`transpose`, `phrase` and the fixed-tempo `createTransport`. The pure
`ratioMapping(control, parameter, ratio)` helper derives a linear mapping from
`parameter.min/max` and a finite positive ratio. It emits ordinary schema data;
recipes remain JSON-serializable. The adapter and authoring helpers are outside
the runtime package and add no activation or voice-management lifecycle.

An earlier `voice.stop()` cancels a future onset or overrides scheduled release.
`voice.ended` settles after cleanup. Disposing the instrument stops its sounds;
only the application owns engine activation, suspension and disposal.
