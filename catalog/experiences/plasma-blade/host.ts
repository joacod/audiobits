import { createAudio } from "audiobits";
import { createPlasmaBlade } from "./controller";

/** The browser host owns one bounded engine; the controller owns its voices. */
export function mountPlasmaBlade(
  feedback: Parameters<typeof createPlasmaBlade>[1],
) {
  const audio = createAudio({
    maxVoices: 8,
    maxVoicesPerSound: 3,
    masterGainDb: -6,
  });
  const control = createPlasmaBlade(audio, feedback);
  const listeners = new AbortController();
  let disposed = false;
  const fail = (cause: unknown) => {
    if (!disposed) feedback.error(cause);
  };
  function stop() {
    if (disposed) return;
    control.stop();
    audio.stopAll({ tails: "cut" });
  }
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden && !disposed) {
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
    control,
    ignite() {
      if (!disposed && !document.hidden) control.ignite();
    },
    retract: control.retract,
    stop,
    mute(value: boolean) {
      if (!disposed) audio.setMuted(value);
    },
    dispose,
  };
}
