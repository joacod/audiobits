# Reactive thruster

Developer-owned source for a sustained motor, turbine, and exhaust sound. Copy
[recipe.ts](recipe.ts) and [pointer.ts](pointer.ts) together into your TypeScript
browser project and install the runtime:

```sh
npm install audiobits
```

The recipe is the single acoustic definition: serializable schema-1 data with
one live `throttle` control in `[0, 1]`, 60 ms smoothing, and up to 280 ms release.
It has no assets, UI state, or website imports. `audio.sound()` validates it.
The bundled `audiobits/recipes` thruster remains available separately.

The integration translates CSS-pixel velocity into throttle, reaching full thrust
at 1200 px/s. It bounds input, averages event velocity over 40 ms, sends at most
one update per animation frame, and decays toward idle over 120 ms when motion
stops. The runtime applies native parameter ramps. Captured pointer release,
cancellation, lost capture, blur, and hiding stop the voice. Generation checks
prevent a cancelled activation from playing later. Start/Stop plus a standard
range input offer the same sound without precise pointer movement.

## Minimal host

Use a surface with `touch-action: none`, a Start button, a Stop button, a range
input with `min="0" max="1" step="0.01" value="0.2"`, and status/error text.
The host owns DOM presentation, engine limits, shared mixing, and final cleanup:

```ts
import { createAudio } from "audiobits";
import { impact } from "audiobits/recipes";
import { attachPointerThruster } from "./pointer";

const audio = createAudio({ maxVoices: 8, maxVoicesPerSound: 2 });
const hit = audio.sound(impact);
const pad = document.querySelector<HTMLElement>("#pad")!;
const status = document.querySelector<HTMLElement>("#status")!;
const error = document.querySelector<HTMLElement>("#error")!;
const throttle = document.querySelector<HTMLInputElement>("#throttle")!;
const interaction = attachPointerThruster(pad, audio, {
  state: (value) => {
    status.textContent = value;
  },
  error: (cause) => {
    error.textContent = String(cause);
  },
  throttle: (value) => {
    pad.dataset.throttle = String(value);
  },
});
const listeners = new AbortController();
const options = { signal: listeners.signal };
let generation = 0;
document.querySelector("#start")!.addEventListener(
  "click",
  () => {
    interaction.start(Number(throttle.value));
  },
  options,
);
document.querySelector("#stop")!.addEventListener(
  "click",
  () => {
    generation++;
    interaction.stop();
  },
  options,
);
throttle.addEventListener(
  "input",
  () => {
    interaction.setThrottle(Number(throttle.value));
  },
  options,
);
document.querySelector("#impact")!.addEventListener(
  "click",
  () => {
    const token = generation;
    void audio
      .start()
      .then(() => {
        if (token === generation && !document.hidden)
          hit.play({ seed: 42, bus: audio.bus("impacts") });
      })
      .catch((cause: unknown) => {
        error.textContent = String(cause);
      });
  },
  options,
);
document.addEventListener(
  "visibilitychange",
  () => {
    if (document.hidden) {
      generation++;
      audio.stopAll({ tails: "cut" });
      void audio.suspend().catch((cause: unknown) => {
        error.textContent = String(cause);
      });
    }
  },
  options,
);
window.addEventListener(
  "pagehide",
  () => {
    generation++;
    listeners.abort();
    interaction.dispose();
    void audio.dispose().catch(console.error);
  },
  { once: true, ...options },
);
```

Call `start()` only from a direct user action. `stop()` preserves the recipe
release; `dispose()` cuts owned voices and removes integration listeners and
frames. The integration never disposes or suspends the shared engine. The host
must suspend on hide and dispose on teardown; returning requires a new gesture.
Per-sound limits also bound release overlap during rapid restarts.

For recipe-only usage, import `reactiveThruster`, call
`audio.sound(reactiveThruster)`, play after `await audio.start()` in a gesture,
then use `voice.set({ throttle })` and `voice.stop()`.

## Run the independent consumer

From the repository root:

```sh
pnpm build:lib
pnpm --filter @audiobits/vanilla dev
```

[Vanilla host source](../../examples/vanilla/src/main.ts) imports only public
AudioBits exports and these canonical files. The consumer's TypeScript path
entry resolves the installed public package for source outside its workspace;
a copied recipe next to your host needs no such entry.

Automated checks cover recipe validation, control mapping, activation races,
release, signal bounds, and Chromium lifecycle behavior. Sound character and
physical-device quality remain for maintainer listening review. Output is tuned
for the example's default master gain and bounded voices; arbitrary mixes are
not guaranteed to avoid clipping.
