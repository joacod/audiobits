import { createAudio, type AudioEngine } from "audiobits";
import { impact } from "../../recipes/impact/recipe";
import { createThruster } from "./pointer";

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
    cancelAnimationFrame(frame);
    listeners.abort();
    interaction.dispose();
    hit.dispose();
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
      if (disposed || document.hidden) return;
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

const bounded = (value: number) =>
  Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;

/** CSS pixels per second, independent of pointer position and event frequency. */
export function velocityThrottle(distance: number, elapsedMs: number) {
  if (
    !Number.isFinite(distance) ||
    !Number.isFinite(elapsedMs) ||
    distance < 0 ||
    elapsedMs <= 0
  )
    return 0;
  return bounded(distance / elapsedMs / 1.2); // Full thrust at 1200 px/s.
}

/** Owns one thruster interaction; the host owns the shared engine and presentation. */
export function attachPointerThruster(
  surface: HTMLElement,
  audio: AudioEngine,
  feedback: {
    state(state: "starting" | "running" | "stopped"): void;
    error(cause: unknown): void;
    throttle(value: number): void;
  },
) {
  const control = createThruster(audio, {
    state(value) {
      if (value === "stopped" && engagedControl) {
        engagedControl = false;
        stop();
      } else if (value === "running") feedback.state(value);
    },
  });
  const listeners = new AbortController();
  let disposed = false;
  let generation = 0;
  let engaged = false;
  let engagedControl = false;
  let throttle = 0;
  let pointer: number | undefined;
  let previous = { x: 0, y: 0, time: 0 };
  let speed = 0;
  let frame = 0;

  function stop() {
    generation++;
    engaged = false;
    cancelAnimationFrame(frame);
    frame = 0;
    const captured = pointer;
    pointer = undefined;
    if (captured !== undefined && surface.hasPointerCapture(captured))
      surface.releasePointerCapture(captured);
    if (engagedControl) {
      engagedControl = false;
      control.stop();
    }
    if (!disposed) feedback.state("stopped");
  }
  function setThrottle(value: number) {
    if (disposed) return;
    throttle = bounded(value);
    feedback.throttle(throttle);
    control.setThrottle(throttle);
  }
  function fail(cause: unknown) {
    stop();
    if (!disposed) feedback.error(cause);
  }
  function start(value: number) {
    if (disposed || document.hidden || engaged) return;
    engaged = true;
    const token = ++generation;
    setThrottle(value);
    feedback.state("starting");
    // Invoke synchronously in the gesture path; never queue playback after Stop.
    void audio
      .start()
      .then(() => {
        if (disposed || document.hidden || token !== generation) return;
        engagedControl = true;
        control.start(throttle, audio.bus("thruster"));
      })
      .catch((cause: unknown) => {
        if (!disposed && token === generation) fail(cause);
      });
  }
  function tick(time: number) {
    if (disposed || pointer === undefined) return;
    // Decay velocity when events stop. Native ramps supply the audio smoothing.
    try {
      setThrottle(speed * Math.exp(-Math.max(0, time - previous.time) / 120));
      frame = requestAnimationFrame(tick);
    } catch (cause) {
      fail(cause);
    }
  }
  surface.addEventListener(
    "pointerdown",
    (event) => {
      if (
        !event.isPrimary ||
        event.button !== 0 ||
        engaged ||
        disposed ||
        document.hidden
      )
        return;
      if (event.pointerType !== "touch") event.preventDefault();
      pointer = event.pointerId;
      previous = {
        x: event.clientX,
        y: event.clientY,
        time: performance.now(),
      };
      speed = 0;
      try {
        surface.setPointerCapture(pointer);
        // Keep touch intent/capture, but create and resume audio only in touchstart.
        if (event.pointerType !== "touch") start(0);
        frame = requestAnimationFrame(tick);
      } catch (cause) {
        fail(cause);
      }
    },
    { signal: listeners.signal },
  );
  surface.addEventListener(
    "touchstart",
    () => {
      if (pointer !== undefined) start(0);
    },
    { passive: true, signal: listeners.signal },
  );
  surface.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerId !== pointer) return;
      const time = performance.now();
      const elapsed = time - previous.time;
      if (elapsed <= 0) return;
      const target = velocityThrottle(
        Math.hypot(event.clientX - previous.x, event.clientY - previous.y),
        elapsed,
      );
      speed += (target - speed) * (1 - Math.exp(-elapsed / 40));
      previous = { x: event.clientX, y: event.clientY, time };
    },
    { signal: listeners.signal },
  );
  for (const type of [
    "pointerup",
    "pointercancel",
    "lostpointercapture",
  ] as const) {
    surface.addEventListener(
      type,
      (event) => {
        if (event.pointerId === pointer) stop();
      },
      { signal: listeners.signal },
    );
  }
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) stop();
    },
    { signal: listeners.signal },
  );
  window.addEventListener("blur", stop, { signal: listeners.signal });
  window.addEventListener(
    "pagehide",
    (event) => {
      if (event.persisted) stop();
      else dispose();
    },
    { signal: listeners.signal },
  );
  function dispose() {
    if (disposed) return;
    stop();
    disposed = true;
    listeners.abort();
    control.dispose();
  }
  return { start, stop, setThrottle, dispose };
}
