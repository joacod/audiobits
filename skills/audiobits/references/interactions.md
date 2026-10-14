# Live controls and sound controllers

Keep a running voice for a sustained sound. After gesture activation, use
`sound.play({ parameters, seed })`, retain its typed voice, and call `voice.set`
only while `voice.state === "active"`. Clear that reference on Stop/end. Live
updates change the existing voice rather than retriggering its attack.
`voice.parameters` contains requested values, not measured native values.

A sustained recipe does not require a controller. Install `thruster` through
[catalog](catalog.md), then use this code in `src/integration.ts`:

```ts
import { createAudio } from "audiobits";
import { thruster } from "./sounds/recipes/thruster/recipe";

const audio = createAudio();
const sound = audio.sound(thruster);
let request = 0;
let voice: ReturnType<typeof sound.play> | undefined;

export async function play() {
  const token = ++request;
  await audio.start();
  if (token !== request) return;
  voice?.stop();
  voice = sound.play({ parameters: { throttle: 0.2 }, seed: 42 });
}
export function update(throttle: number) {
  if (Number.isFinite(throttle) && voice?.state === "active")
    voice.set({ throttle: Math.max(0, Math.min(1, throttle)) });
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
  await audio.dispose();
}
```

Bound finite application input to the recipe's declared range. Rate-limit dense
events with the application's existing update loop and use native parameter
smoothing for audio ramps. Keep pointer handling, frame scheduling, canvas and
3D in application presentation code. Use one clock for elapsed time.

## Coordinated sound behavior

For layered live sound with accents, consult [catalog](catalog.md). Install only
the selected item's recipes, controller and guide. Reactive Thruster's
`createThruster(audio)` accepts throttle through `start(value)` and
`setThrottle(value)`; its `pointer.ts` filename does not imply a pointer adapter.
Energy Charge's `createEnergyCharge(audio)` takes progress through `start(value)`
and `setCharge(value)`, in either direction, and holds until `release()` or Stop.

For Lightsaber, install `lightsaber` and place this in `src/integration.ts`.
Connect Play to the application's existing gesture, movement updates to its
existing state, and Strike to a collision or action event after activation:

```ts
import { createAudio } from "audiobits";
import { createLightsaber } from "./sounds/experiences/lightsaber/controller";

const audio = createAudio();
const blade = createLightsaber(audio);
let request = 0;

export async function play() {
  const token = ++request;
  await audio.start();
  if (token !== request) return;
  blade.ignite();
}
export function update(movement: number, elapsedMs = 16, direction = 0) {
  blade.update(movement, elapsedMs, direction);
}
export function strike(strength = 0.8) {
  return blade.clash(strength);
}
export function retract() {
  request++;
  blade.retract();
}
export function stop() {
  request++;
  blade.stop();
}
export async function dispose() {
  stop();
  blade.dispose();
  await audio.dispose();
}
```

Supply finite movement and strength in `[0, 1]`, direction in `[-1, 1]`, and
elapsed milliseconds from the host's clock. The controller coordinates hum,
ignition, swing, clash and retraction; it needs no stage, renderer or geometry.
The installed README is the working example for each controller's exact API.

## Host ownership and verification

Call `play()` directly from a user gesture and surface rejected activation
promises. Bind `update` to existing application state and Stop to cancellation.
On hide or blur, invalidate pending activation and stop; the engine owner
suspends on hide. On route removal, call `dispose()`. Returning stays silent until
a fresh gesture. Use the host pattern in [integration](integration.md) for
visibility listeners and error reporting.

These examples own dedicated engines. For a shared engine, stop/dispose only
this integration's voice or controller; the existing owner suspends and disposes
the engine. Do not use shared `stopAll` to cut other components' voices.

Check silent load, direct gesture activation, live input extrema, fast Play/Stop,
hide and repeated removal. Validate the actual consuming application's imports
and browser lifecycle, not just recipe data. When adding visuals, use analyser
data after activation and detach taps and caller-owned nodes on cleanup. Keep
visual preferences and accessibility in the application.
