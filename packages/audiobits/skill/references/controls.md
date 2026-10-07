# Controlled sound and routing

Call `play()` directly from a gesture. Surface rejected promises, bind Stop,
and call `dispose()` when the host unmounts. See the package reference for
bus limits, delay caps and caller-owned native nodes.

```ts
import { createAudio } from "audiobits";
import { thruster } from "audiobits/recipes";

const audio = createAudio();
const sound = audio.sound(thruster);
let voice: ReturnType<typeof sound.play> | undefined;
let request = 0;
export async function play() {
  const token = ++request;
  await audio.start();
  if (token !== request || document.hidden) return;
  const effects = audio.bus("effects");
  effects.setGainDb(-6, 0.1);
  effects.setDelay({ seconds: 0.18, feedback: 0.35, wet: 0.25 });
  voice?.stop();
  voice = sound.play({ bus: effects, parameters: { throttle: 0.2 }, seed: 42 });
}
export function setThrottle(value: number) {
  if (voice?.state === "active") voice.set({ throttle: value });
}
export function stop() {
  request++;
  voice = undefined;
  audio.stopAll({ tails: "cut" });
}
function hide() {
  if (document.hidden) {
    stop();
    void audio.suspend().catch(console.error);
  }
}
document.addEventListener("visibilitychange", hide);
export async function dispose() {
  stop();
  document.removeEventListener("visibilitychange", hide);
  await audio.dispose();
}
```

`voice.parameters` reports requested values, not current smoothed native values.
Stop cuts shared tails here; use default `stopAll()` when bounded delay decay
is desired. Routes and voices belong to this engine. Recipe data remains portable;
the live graph and native connections are not serializable.
