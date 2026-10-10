import { createAudio } from "audiobits";
import { impact } from "audiobits/recipes";
import { attachPointerThruster } from "./pointer";

/** Framework-independent host. The caller owns presentation and calls dispose on teardown. */
export function mountThruster(
  pad: HTMLElement,
  feedback: Parameters<typeof attachPointerThruster>[2] & {
    output(active: boolean): void;
  },
) {
  const audio = createAudio({ maxVoices: 8, maxVoicesPerSound: 2 });
  const hit = audio.sound(impact);
  let disposed = false;
  let generation = 0;
  let frame = 0;
  let outputActive = false;
  const report = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    if (disposed) return;
    const counts = audio.counts;
    const active =
      audio.state === "running" &&
      !document.hidden &&
      counts.active + counts.retiring > 0;
    if (active !== outputActive) {
      outputActive = active;
      feedback.output(active);
    }
    // Observe actual voice lifetime, including release tails; stop polling at silence.
    if (active) frame = requestAnimationFrame(report);
  };
  const interaction = attachPointerThruster(pad, audio, {
    ...feedback,
    state(value) {
      feedback.state(value);
      report();
    },
  });
  const listeners = new AbortController();
  function stop() {
    generation++;
    interaction.stop();
    audio.stopAll({ tails: "cut" });
    report();
  }
  function fail(cause: unknown) {
    if (!disposed) feedback.error(cause);
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
    cancelAnimationFrame(frame);
    listeners.abort();
    interaction.dispose();
    await audio.dispose();
  }
  return {
    audio,
    start: interaction.start,
    release: interaction.stop,
    setThrottle: interaction.setThrottle,
    stop,
    mute(value: boolean) {
      audio.setMuted(value);
    },
    async impact() {
      const token = generation;
      try {
        await audio.start();
        if (disposed || document.hidden || token !== generation) return;
        const voice = hit.play({ seed: 42, bus: audio.bus("impacts") });
        report();
        await voice.ended;
        if (token === generation) {
          report();
        }
      } catch (cause) {
        if (token === generation) fail(cause);
      }
    },
    dispose,
  };
}
