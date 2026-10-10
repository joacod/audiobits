import type { AudioEngine, Voice } from "audiobits";
import { energyCharge } from "./recipe";

/** No DOM or timer: the application supplies progress and owns the engine. */
export function createEnergyCharge(
  audio: AudioEngine,
  feedback: {
    state(value: "starting" | "running" | "stopped"): void;
    error(cause: unknown): void;
  },
) {
  const sound = audio.sound(energyCharge);
  let voice: Voice<typeof energyCharge> | undefined;
  let charge = 0;
  let engaged = false;
  let disposed = false;
  let generation = 0;
  function setCharge(value: number) {
    if (disposed) return;
    if (!Number.isFinite(value) || value < 0 || value > 1)
      throw new RangeError("Charge must be a finite number in [0, 1]");
    charge = value;
    if (voice?.state === "active") voice.set({ charge });
  }
  function release() {
    generation++;
    engaged = false;
    const current = voice;
    voice = undefined;
    current?.stop();
    if (!disposed) feedback.state("stopped");
  }
  function cancel() {
    release();
  }
  function start(value = charge) {
    if (disposed || engaged) return;
    setCharge(value);
    engaged = true;
    const token = ++generation;
    feedback.state("starting");
    void audio
      .start()
      .then(() => {
        if (disposed || token !== generation) return;
        voice = sound.play({ seed: 42, parameters: { charge } });
        const current = voice;
        feedback.state("running");
        void current.ended.then(() => {
          if (voice === current) release();
        });
      })
      .catch((cause: unknown) => {
        if (disposed || token !== generation) return;
        cancel();
        feedback.error(cause);
      });
  }
  const unsubscribe = audio.subscribe((state) => {
    if (voice && state !== "running" && state !== "starting") cancel();
  });
  function dispose() {
    if (disposed) return;
    cancel();
    disposed = true;
    unsubscribe();
    sound.dispose();
  }
  return { start, setCharge, release, cancel, dispose };
}
