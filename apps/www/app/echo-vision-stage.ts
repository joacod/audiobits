import type { AudioEngine } from "audiobits";
import { mountEchoProbe } from "../../../catalog/experiences/echo-probe/host";
import { bindAudioGestures } from "../lib/audio-gestures";
import {
  projectVisionPoint,
  visionReflections,
  visionRevelation,
  visionSurfaces,
  type VisionAim,
  type VisionEmission,
} from "../lib/echo-vision";
import { createEchoVisionRoom } from "./echo-vision-room";

export interface VisionView {
  state: "quiet" | "starting" | "listening";
  entered: boolean;
  hint: string;
}

/** One accepted click, tap or keyboard action emits one finite Echo Probe pulse. */
export function mountEchoVisionStage(
  surface: HTMLElement,
  canvas: HTMLCanvasElement,
  feedback: {
    view(value: VisionView): void;
    error(cause: unknown): void;
    clearError(): void;
  },
  prepared?: AudioEngine,
) {
  const room = createEchoVisionRoom(canvas, surface);
  const listeners = new AbortController();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const reticle = surface.querySelector<HTMLElement>(".echo-vision-reticle");
  const labels = [
    ...surface.querySelectorAll<HTMLElement>("[data-echo-surface]"),
  ];
  let width = 1,
    height = 1,
    frame = 0,
    disposed = false,
    entered = false;
  let generation = 0;
  let state: VisionView["state"] = "quiet";
  let hint = "Aim and click. Let the echoes draw the room.";
  let aim: VisionAim = { x: 0.5, y: 0.5 };
  let waveAim = aim;
  let events: VisionEmission[] = [];
  let pointer: number | undefined;
  let completedPointer: number | undefined;
  let lastReply = -Infinity;
  function publish(message = hint) {
    hint = message;
    surface.dataset.state = state;
    feedback.view({ state, entered, hint });
    wake();
  }
  const host = mountEchoProbe(
    {
      state(value) {
        if (disposed) return;
        state =
          value === "stopped"
            ? "quiet"
            : value === "running"
              ? "listening"
              : "starting";
        if (state === "quiet") {
          generation++;
          events = events.filter(
            (event) => event.emission.cancelledAt === null,
          );
          publish(
            entered
              ? "The room fades. Aim somewhere else and pulse again."
              : hint,
          );
        } else if (state === "starting") publish("Sending a pulse…");
        else publish("Listen. Near surfaces answer first.");
      },
      error: feedback.error,
    },
    prepared,
  );
  const unbind = bindAudioGestures(
    surface,
    host.audio,
    stop,
    feedback.error,
    feedback.clearError,
  );
  function stop() {
    if (disposed) return;
    generation++;
    const captured = pointer;
    pointer = undefined;
    if (captured !== undefined) {
      completedPointer = captured;
      if (surface.hasPointerCapture(captured))
        surface.releasePointerCapture(captured);
    }
    events = [];
    host.stop();
    publish("Quiet. Click or tap when you want another pulse.");
  }
  function emit() {
    if (disposed) return;
    feedback.clearError();
    entered = true;
    const token = ++generation;
    const hits = visionReflections(aim, width / height);
    const direction = { ...aim };
    // No recurring scheduler: sound is requested only from this explicit gesture.
    void host
      .emit(
        hits.map((hit) => hit.reflection),
        42,
      )
      .then((emission) => {
        if (!emission || disposed || token !== generation) return;
        events.push({ emission, hits });
        // Echo Probe owns at most two foreground and one retiring emission.
        events = events
          .filter(
            (event) =>
              host.audio.native.context.currentTime - event.emission.at < 8,
          )
          .slice(-3);
        waveAim = direction;
        publish(
          hits.length
            ? "Pulse sent. Wait for the room to answer."
            : "Open space. Try another direction.",
        );
      });
  }
  function move(x: number, y: number) {
    const bounds = surface.getBoundingClientRect();
    aim = {
      x: Math.max(0.02, Math.min(0.98, (x - bounds.left) / width)),
      y: Math.max(0.04, Math.min(0.92, (y - bounds.top) / height)),
    };
    positionReticle();
    wake();
  }
  function positionReticle() {
    if (reticle) {
      reticle.style.left = `${aim.x * 100}%`;
      reticle.style.top = `${aim.y * 100}%`;
    }
  }
  surface.addEventListener(
    "pointerdown",
    (event) => {
      if (
        !event.isPrimary ||
        event.button !== 0 ||
        (event.target as Element).closest("button")
      )
        return;
      completedPointer = undefined;
      pointer = event.pointerId;
      surface.setPointerCapture(event.pointerId);
      surface.focus({ preventScroll: true });
      move(event.clientX, event.clientY);
      if (event.pointerType === "touch")
        publish("Aim with your finger. Release to send one pulse.");
    },
    { signal: listeners.signal },
  );
  surface.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType === "mouse" || pointer === event.pointerId)
        move(event.clientX, event.clientY);
    },
    { signal: listeners.signal },
  );
  surface.addEventListener(
    "pointerup",
    (event) => {
      if (pointer !== event.pointerId) return;
      move(event.clientX, event.clientY);
      pointer = undefined;
      if (surface.hasPointerCapture(event.pointerId))
        surface.releasePointerCapture(event.pointerId);
      // Touch drags can suppress click. Emit from the completed release, then
      // ignore its compatibility click if the browser also delivers one.
      if (event.pointerType !== "mouse") {
        completedPointer = event.pointerId;
        emit();
      }
    },
    { signal: listeners.signal },
  );
  surface.addEventListener(
    "pointercancel",
    () => {
      pointer = undefined;
      stop();
    },
    { signal: listeners.signal },
  );
  surface.addEventListener(
    "lostpointercapture",
    () => {
      if (pointer !== undefined) stop();
    },
    { signal: listeners.signal },
  );
  surface.addEventListener(
    "click",
    (event) => {
      if ((event.target as Element).closest("button")) {
        stop();
        return;
      }
      if (
        event instanceof PointerEvent &&
        event.pointerId === completedPointer
      ) {
        completedPointer = undefined;
        return;
      }
      surface.focus({ preventScroll: true });
      emit();
    },
    { signal: listeners.signal },
  );
  surface.addEventListener(
    "keydown",
    (event) => {
      if ((event.target as Element).closest("button")) return;
      if (
        [
          "Enter",
          " ",
          "Escape",
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
        ].includes(event.key)
      )
        event.preventDefault();
      if (event.key === "Escape") stop();
      else if ((event.key === "Enter" || event.key === " ") && !event.repeat)
        emit();
      else if (event.key.startsWith("Arrow")) {
        const direction =
          event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight")
          aim.x = Math.max(0.02, Math.min(0.98, aim.x + direction * 0.07));
        else aim.y = Math.max(0.04, Math.min(0.92, aim.y + direction * 0.07));
        positionReticle();
        wake();
      }
    },
    { signal: listeners.signal },
  );
  surface.addEventListener(
    "focusout",
    (event) => {
      if (!surface.contains(event.relatedTarget as Node | null)) stop();
    },
    { signal: listeners.signal },
  );
  canvas.addEventListener(
    "webglcontextlost",
    (event) => {
      event.preventDefault();
      stop();
      feedback.error(
        new Error("The echo renderer was interrupted. Reload to reconnect"),
      );
    },
    { signal: listeners.signal },
  );
  canvas.addEventListener("webglcontextrestored", wake, {
    signal: listeners.signal,
  });
  function wake() {
    if (!frame && !disposed) frame = requestAnimationFrame(draw);
  }
  function draw() {
    frame = 0;
    if (disposed) return;
    const now = events.length ? host.audio.native.context.currentTime : 0;
    const levels = visionRevelation(events, now);
    const current = events.at(-1);
    const pulseAge =
      current && current.emission.cancelledAt === null
        ? now - current.emission.at
        : -1;
    for (const label of labels) {
      const id = label.dataset.echoSurface!;
      const level = levels[id] ?? 0;
      label.style.opacity = String(Math.min(1, level * 1.5));
      label.dataset.lit = String(level > 0.08);
      label.setAttribute("aria-hidden", String(level <= 0.08));
    }
    let reply = lastReply;
    let description = "";
    for (const event of events)
      event.emission.reflections.forEach((reflection, index) => {
        if (
          reflection.at > now ||
          reflection.at <= reply ||
          reflection.at > (event.emission.cancelledAt ?? Infinity)
        )
          return;
        reply = reflection.at;
        const hit = event.hits[index];
        if (hit)
          description = `${hit.surface.label}. ${hit.surface.material === "wood" ? "A close, dry knock" : hit.surface.material === "glass" ? "A bright, distant shimmer" : "A resonant, ringing return"}.`;
      });
    if (description) {
      lastReply = reply;
      publish(description);
    }
    try {
      room.render(levels, pulseAge ?? -1, waveAim, reduced.matches);
    } catch (cause) {
      stop();
      feedback.error(cause);
      return;
    }
    surface.dataset.visibleSurfaces = visionSurfaces
      .filter((value) => (levels[value.id] ?? 0) > 0.08)
      .map((value) => value.id)
      .join(" ");
    if (state !== "quiet" || Object.values(levels).some((value) => value > 0))
      wake();
  }
  function resize() {
    const bounds = surface.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    room.resize(width, height);
    for (const label of labels) {
      const value = visionSurfaces.find(
        (value) => value.id === label.dataset.echoSurface,
      )!;
      const point = projectVisionPoint(value.position, width / height);
      label.style.left = `${point.x * 100}%`;
      label.style.top = `${point.y * 100}%`;
    }
    wake();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(surface);
  reduced.addEventListener("change", wake, { signal: listeners.signal });
  surface.dataset.ready = "true";
  positionReticle();
  publish();
  resize();
  async function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    listeners.abort();
    unbind();
    room.dispose();
    await host.dispose();
  }
  return { dispose };
}
