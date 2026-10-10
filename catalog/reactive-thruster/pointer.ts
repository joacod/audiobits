import type { AudioEngine, Voice } from "audiobits";
import { reactiveThruster } from "./recipe";

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
  const sound = audio.sound(reactiveThruster);
  const listeners = new AbortController();
  let disposed = false;
  let generation = 0;
  let engaged = false;
  let voice: Voice<typeof reactiveThruster> | undefined;
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
    voice?.stop();
    voice = undefined;
    if (!disposed) feedback.state("stopped");
  }
  function setThrottle(value: number) {
    if (disposed) return;
    throttle = bounded(value);
    feedback.throttle(throttle);
    if (voice?.state === "active") voice.set({ throttle });
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
        voice = sound.play({
          bus: audio.bus("thruster"),
          seed: 42,
          parameters: { throttle },
        });
        const current = voice;
        feedback.state("running");
        void current.ended.then(() => {
          if (voice === current) stop();
        });
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
      pointer = event.pointerId;
      previous = {
        x: event.clientX,
        y: event.clientY,
        time: performance.now(),
      };
      speed = 0;
      try {
        surface.setPointerCapture(pointer);
        start(0);
        frame = requestAnimationFrame(tick);
      } catch (cause) {
        fail(cause);
      }
    },
    { signal: listeners.signal },
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
  window.addEventListener("pagehide", dispose, { signal: listeners.signal });
  const unsubscribe = audio.subscribe((state) => {
    if (voice && state !== "running" && state !== "starting") stop();
  });
  function dispose() {
    if (disposed) return;
    stop();
    disposed = true;
    listeners.abort();
    unsubscribe();
    sound.dispose();
  }
  return { start, stop, setThrottle, dispose };
}
