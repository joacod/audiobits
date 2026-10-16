import { createAudio } from "audiobits";
import { createEnergyCharge } from "./progress";

/** Browser policy around the portable progress controller, with no progress timer. */
export function mountEnergyCharge(feedback: {
  state(value: "starting" | "running" | "stopped"): void;
  error(cause: unknown): void;
}) {
  const audio = createAudio({ maxVoices: 3, maxVoicesPerSound: 2 });
  let engaged = false;
  let generation = 0;
  const control = createEnergyCharge(audio, {
    state(value) {
      engaged = value === "running";
      feedback.state(value);
    },
  });
  const listeners = new AbortController();
  let disposed = false;
  const fail = (cause: unknown) => {
    if (!disposed) feedback.error(cause);
  };
  function release() {
    generation++;
    engaged = false;
    control.release();
  }
  function start(value?: number) {
    if (disposed || document.hidden || engaged) return;
    if (value !== undefined) control.setCharge(value);
    engaged = true;
    const token = ++generation;
    feedback.state("starting");
    void audio
      .start()
      .then(() => {
        if (disposed || document.hidden || token !== generation) return;
        control.start();
      })
      .catch((cause: unknown) => {
        if (disposed || token !== generation) return;
        release();
        fail(cause);
      });
  }
  function stop() {
    release();
    audio.stopAll({ tails: "cut" });
  }
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) {
        stop();
        void audio.suspend().catch(fail);
      }
    },
    { signal: listeners.signal },
  );
  window.addEventListener("blur", stop, { signal: listeners.signal });
  window.addEventListener(
    "pagehide",
    (event) => {
      if (event.persisted) {
        stop();
        void audio.suspend().catch(fail);
      } else {
        void dispose().catch(fail);
      }
    },
    { signal: listeners.signal },
  );
  async function dispose() {
    if (disposed) return;
    stop();
    disposed = true;
    listeners.abort();
    control.dispose();
    await audio.dispose();
  }
  return {
    audio,
    start,
    setCharge: control.setCharge,
    release,
    stop,
    mute(value: boolean) {
      audio.setMuted(value);
    },
    dispose,
  };
}
