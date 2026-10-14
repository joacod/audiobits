import type { AudioEngine, Voice } from "audiobits";
import { energyCharge } from "./recipe";

/** No DOM or timer: the application supplies progress and owns the engine. */
export function createEnergyCharge(
  audio: AudioEngine,
  feedback: {
    state?(value: "running" | "stopped"): void;
  } = {},
) {
  const sound = audio.sound(energyCharge);
  let voice: Voice<typeof energyCharge> | undefined;
  let charge = 0;
  let disposed = false;
  function setCharge(value: number) {
    if (disposed) return;
    if (!Number.isFinite(value) || value < 0 || value > 1)
      throw new RangeError("Charge must be a finite number in [0, 1]");
    charge = value;
    if (voice?.state === "active") voice.set({ charge });
  }
  function release() {
    const current = voice;
    voice = undefined;
    current?.stop();
    if (!disposed) feedback.state?.("stopped");
  }
  /** The application must await audio.start() before calling start. */
  function start(value = charge) {
    if (disposed || voice) return;
    setCharge(value);
    voice = sound.play({ seed: 42, parameters: { charge } });
    const current = voice;
    feedback.state?.("running");
    void current.ended.then(() => {
      if (voice === current) release();
    });
  }
  const unsubscribe = audio.subscribe((state) => {
    if (voice && state !== "running" && state !== "starting") release();
  });
  function dispose() {
    if (disposed) return;
    release();
    disposed = true;
    unsubscribe();
    sound.dispose();
  }
  return { start, setCharge, release, stop: release, dispose };
}
