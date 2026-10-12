import { createAudio } from "audiobits";
import { createEnergyCharge } from "./progress";

/** Browser policy around the portable progress controller, with no progress timer. */
export function mountEnergyCharge(
  feedback: Parameters<typeof createEnergyCharge>[1],
) {
  const audio = createAudio({ maxVoices: 3, maxVoicesPerSound: 2 });
  const control = createEnergyCharge(audio, feedback);
  const listeners = new AbortController();
  let disposed = false;
  const fail = (cause: unknown) => {
    if (!disposed) feedback.error(cause);
  };
  function stop() {
    control.cancel();
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
    () => {
      void dispose().catch(fail);
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
    start(value?: number) {
      if (!disposed && !document.hidden) control.start(value);
    },
    setCharge: control.setCharge,
    release: control.release,
    stop,
    mute(value: boolean) {
      audio.setMuted(value);
    },
    dispose,
  };
}
