import type { AudioEngine, Bus, Voice } from "audiobits";
import { reactiveThruster } from "./recipe";

const bounded = (value: number) =>
  Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;

/** Sound only: the application supplies throttle and activates its engine. */
export function createThruster(
  audio: AudioEngine,
  feedback: { state?(value: "running" | "stopped"): void } = {},
) {
  const sound = audio.sound(reactiveThruster);
  let voice: Voice<typeof reactiveThruster> | undefined;
  let throttle = 0;
  let disposed = false;
  function setThrottle(value: number) {
    if (disposed) return;
    throttle = bounded(value);
    if (voice?.state === "active") voice.set({ throttle });
    return throttle;
  }
  /** The application must await audio.start() before calling start. */
  function start(value = throttle, bus?: Bus) {
    if (disposed || voice) return;
    setThrottle(value);
    voice = sound.play({ seed: 42, parameters: { throttle }, bus });
    const current = voice;
    feedback.state?.("running");
    void current.ended.then(() => {
      if (voice === current) stop();
    });
  }
  function stop() {
    const current = voice;
    voice = undefined;
    current?.stop();
    if (!disposed) feedback.state?.("stopped");
  }
  const unsubscribe = audio.subscribe((state) => {
    if (voice && state !== "running" && state !== "starting") stop();
  });
  function dispose() {
    if (disposed) return;
    stop();
    disposed = true;
    unsubscribe();
    sound.dispose();
  }
  return { start, setThrottle, stop, dispose };
}
