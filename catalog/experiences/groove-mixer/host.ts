import { createAudio, type AudioEngine } from "audiobits";
import { createGroove } from "./controller";

export function createGrooveAudio() {
  return createAudio({ maxVoices: 24, masterGainDb: -8 });
}

/** Browser lifecycle only. Input and visuals belong to the application. */
export function mountGroove(
  changed: (state: "stopped" | "starting" | "playing") => void,
  failed: (cause: unknown) => void,
  audio: AudioEngine = createGrooveAudio(),
) {
  let request = 0;
  let disposed = false;
  let starting = false;
  const groove = createGroove(audio, (cause) => {
    stop();
    failed(cause);
  });
  const listeners = new AbortController();
  function stop() {
    request++;
    starting = false;
    groove.stop();
    if (!disposed) changed("stopped");
  }
  async function start() {
    if (disposed || document.hidden || starting || groove.playing) return;
    const token = ++request;
    starting = true;
    changed("starting");
    try {
      await audio.start();
      if (disposed || document.hidden || request !== token) return;
      starting = false;
      groove.start();
      if (groove.playing) changed("playing");
    } catch (cause) {
      if (!disposed && request === token) {
        stop();
        failed(cause);
      }
    }
  }
  const unsubscribe = audio.subscribe((state) => {
    if (state !== "running" && state !== "starting") stop();
  });
  function suspend() {
    stop();
    void audio.suspend().catch(failed);
  }
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) suspend();
    },
    { signal: listeners.signal },
  );
  window.addEventListener("blur", stop, { signal: listeners.signal });
  window.addEventListener(
    "pagehide",
    (event) => {
      if (event.persisted) suspend();
      else void dispose().catch(failed);
    },
    { signal: listeners.signal },
  );
  async function dispose() {
    if (disposed) return;
    stop();
    disposed = true;
    listeners.abort();
    unsubscribe();
    groove.dispose();
    await audio.dispose();
  }
  return { audio, groove, start, stop, dispose };
}
