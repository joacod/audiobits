import { createAudio } from "audiobits";
import { createEchoProbe, type ProbeReflection } from "./controller";

/** Browser activation and lifecycle. Reflection data belongs to the application. */
export function mountEchoProbe(feedback: {
  state(value: "starting" | "running" | "stopped"): void;
  error(cause: unknown): void;
}) {
  const audio = createAudio({ maxVoices: 32, maxVoicesPerSound: 16 });
  const probe = createEchoProbe(audio);
  const listeners = new AbortController();
  let generation = 0;
  let disposed = false;
  const fail = (cause: unknown) => {
    if (!disposed) feedback.error(cause);
  };
  function stop() {
    generation++;
    probe.stop();
    audio.stopAll({ tails: "cut" });
    if (!disposed) feedback.state("stopped");
  }
  async function emit(reflections: readonly ProbeReflection[], seed = 42) {
    if (disposed || document.hidden) return null;
    const token = ++generation;
    feedback.state("starting");
    try {
      await audio.start();
      if (disposed || document.hidden || token !== generation) return null;
      const emission = probe.emit(reflections, { seed });
      feedback.state(probe.active ? "running" : "stopped");
      if (emission)
        void emission.ended.then(() => {
          if (!disposed && probe.active === 0) feedback.state("stopped");
        });
      return emission;
    } catch (cause) {
      if (!disposed && token === generation) {
        stop();
        fail(cause);
      }
      return null;
    }
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
    probe.dispose();
    await audio.dispose();
  }
  return { audio, emit, stop, dispose };
}
