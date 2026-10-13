import type { mountPlasmaBlade } from "../../../catalog/experiences/plasma-blade/host";
import {
  segmentDistance,
  type Point,
} from "../../../catalog/experiences/plasma-blade/motion";

import { createBladeScene } from "./plasma-blade-scene";

/** Website presentation preserves the portable demo's input and swept collision contract. */
export function mountBladeStage3D(
  surface: HTMLElement,
  host: ReturnType<typeof mountPlasmaBlade>,
  onError: (cause: unknown) => void,
) {
  // An effect owns its canvas. Strict Mode and Fast Refresh may replay setup on
  // the same surface after cleanup has permanently lost the old WebGL context.
  const canvas = document.createElement("canvas");
  canvas.className = "plasma-renderer";
  canvas.setAttribute("aria-hidden", "true");
  surface.append(canvas);
  let display: ReturnType<typeof createBladeScene>;
  try {
    display = createBladeScene(canvas, surface);
  } catch (cause) {
    canvas.remove();
    throw cause;
  }
  const events = new AbortController();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let failed = false;
  let width = 1,
    height = 1,
    frame = 0,
    previous = 0,
    disposed = false;
  let pointer: number | null = null,
    extension = 0,
    collapsing = false;
  let desired: Point = { x: 0.5, y: 0.79 };
  const position = { ...desired };
  let lastTip: Point | undefined, lastBase: Point | undefined;
  let lastMotionTip: Point | undefined;
  let elapsed = 0,
    hits = 0,
    keyboardTarget = 0;
  let analyser: AnalyserNode | undefined, detach: (() => void) | undefined;
  const samples = new Float32Array(256);
  let assistedTarget: number | null = null;
  const flashes = [0, 0, 0];
  const trails: { base: Point; tip: Point; life: number }[] = [];
  const particles: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    total: number;
  }[] = [];
  function bladeLength() {
    return Math.min(height * 0.51, width * 0.66);
  }
  // Leave room for the complete hilt and the caption, even on a narrow stage.
  function boundPosition(point: Point): Point {
    const margin = Math.max(24, width * 0.08) / width;
    return {
      x: Math.max(margin, Math.min(1 - margin, point.x)),
      y: Math.max(
        (bladeLength() + 24) / height,
        Math.min((height - 145) / height, point.y),
      ),
    };
  }
  function targets() {
    return [0.24, 0.5, 0.76].map((x, index) => ({
      x: x * width,
      y:
        (index === 1 ? 0.27 : 0.37) * height +
        (reduced.matches ? 0 : Math.sin(elapsed / 1400 + index * 2) * 7),
    }));
  }
  function disconnect() {
    detach?.();
    detach = undefined;
    analyser?.disconnect();
    analyser = undefined;
  }
  function releasePointer() {
    const id = pointer;
    pointer = null;
    if (id !== null && surface.hasPointerCapture(id))
      surface.releasePointerCapture(id);
  }
  function reset() {
    releasePointer();
    extension = 0;
    collapsing = false;
    previous = 0;
    flashes.fill(0);
    lastTip = lastBase = undefined;
    lastMotionTip = undefined;
    assistedTarget = null;
    trails.length = particles.length = 0;
    disconnect();
    wake();
  }
  function stateChanged() {
    surface.dataset.state = host.control.state;
    if (failed || disposed) return;
    if (host.control.state === "stopped" && !collapsing) reset();
    if (host.control.state === "running" && !analyser) {
      try {
        analyser = host.audio.native.context.createAnalyser();
        analyser.fftSize = 256;
        detach = host.audio.native.connect(analyser);
      } catch {
        surface.dataset.signal = "unavailable";
      }
    }
    if (host.control.state !== "running") disconnect();
    wake();
  }
  function retract() {
    releasePointer();
    collapsing = true;
    host.retract();
    wake();
  }
  function burst(index: number, force: number) {
    hits++;
    surface.dataset.hits = String(hits);
    flashes[index] = 1;
    if (reduced.matches) return;
    const target = targets()[index];
    for (let i = 0; i < 28; i++) {
      const angle = i * 2.39996 + hits;
      const speed = (90 + (i % 7) * 42) * (0.6 + force);
      const life = 0.22 + (i % 5) * 0.07;
      particles.push({
        x: target.x,
        y: target.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        total: life,
      });
    }
    if (particles.length > 140) particles.splice(0, particles.length - 140);
  }
  // Keyboard alternative strikes an actual visible target, with the same cooldown.
  function strike() {
    if (host.control.state !== "running") return;
    const index = keyboardTarget++ % 3;
    const target = targets()[index];
    const baseY = Math.min(
      height * 0.86,
      target.y + Math.min(height * 0.34, width * 0.5),
    );
    // Solve the tilted blade's base position so its segment reaches the target.
    let low = 0.08,
      high = 0.92;
    for (let i = 0; i < 16; i++) {
      const x = (low + high) / 2;
      const contactX =
        x * width + Math.tan((x - 0.5) * 1.45) * (baseY - target.y);
      if (contactX < target.x) low = x;
      else high = x;
    }
    desired = boundPosition({ x: (low + high) / 2, y: baseY / height });
    assistedTarget = index;
    wake();
  }
  function draw(time: number) {
    frame = 0;
    if (disposed || failed || document.hidden) return;
    const dt = previous ? Math.max(0, Math.min(64, time - previous)) : 16;
    previous = time;
    elapsed += dt;
    const active = host.control.state === "running";
    const old = { x: position.x * width, y: position.y * height };
    const follow = 1 - Math.exp(-dt / 42);
    position.x += (desired.x - position.x) * follow;
    position.y += (desired.y - position.y) * follow;
    const base = { x: position.x * width, y: position.y * height };
    const vx = dt ? ((base.x - old.x) * 1000) / dt : 0;
    const duration = active ? 460 : 360;
    extension = Math.max(
      0,
      Math.min(1, extension + (active ? dt / duration : -dt / duration)),
    );
    if (extension === 0) collapsing = false;
    let peak = 0;
    if (analyser) {
      analyser.getFloatTimeDomainData(samples);
      for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
    }
    surface.dataset.peak = String(peak);
    const fullLength = bladeLength();
    const rawAngle =
      (position.x - 0.5) * 1.45 +
      (assistedTarget === null
        ? Math.max(-0.35, Math.min(0.35, vx / 6500))
        : 0);
    const angle = Math.max(
      -Math.asin(Math.min(1, (base.x - 24) / fullLength)),
      Math.min(
        Math.asin(Math.min(1, (width - base.x - 24) / fullLength)),
        rawAngle,
      ),
    );
    // Measure the full blade's travel, excluding ignition/retraction extension.
    const motionTip = {
      x: base.x + Math.sin(angle) * fullLength,
      y: base.y - Math.cos(angle) * fullLength,
    };
    const dx = lastMotionTip ? motionTip.x - lastMotionTip.x : base.x - old.x;
    const dy = lastMotionTip ? motionTip.y - lastMotionTip.y : base.y - old.y;
    const travel = Math.hypot(dx, dy);
    const speed = dt
      ? (Math.max(travel, Math.hypot(base.x - old.x, base.y - old.y)) * 1000) /
        dt
      : 0;
    const direction = travel
      ? (Math.abs(dx) >= Math.abs(dy) ? dx : -dy) / travel
      : 0;
    const motion = host.control.update(speed, dt, direction);
    surface.dataset.motion = motion.toFixed(3);
    lastMotionTip = motionTip;
    const length = fullLength * extension;
    const tip = {
      x: base.x + Math.sin(angle) * length,
      y: base.y - Math.cos(angle) * length,
    };
    const points = targets();
    if (
      active &&
      extension > 0.75 &&
      (motion > 0.12 || assistedTarget !== null) &&
      lastTip &&
      lastBase
    ) {
      // Sweep the whole segment so fast strokes cannot tunnel through a target.
      const steps = Math.min(
        32,
        Math.max(
          1,
          Math.ceil(
            Math.max(
              Math.hypot(tip.x - lastTip.x, tip.y - lastTip.y),
              Math.hypot(base.x - lastBase.x, base.y - lastBase.y),
            ) / 12,
          ),
        ),
      );
      for (let index = 0; index < points.length; index++) {
        for (let step = 0; step <= steps; step++) {
          const t = step / steps;
          const a = {
            x: lastBase.x + (base.x - lastBase.x) * t,
            y: lastBase.y + (base.y - lastBase.y) * t,
          };
          const b = {
            x: lastTip.x + (tip.x - lastTip.x) * t,
            y: lastTip.y + (tip.y - lastTip.y) * t,
          };
          if (segmentDistance(points[index], a, b) < 23) {
            const force =
              assistedTarget === index
                ? Math.max(0.85, motion)
                : Math.max(0.3, motion);
            if (host.control.impact(index, force)) {
              burst(index, force);
              if (assistedTarget === index) assistedTarget = null;
            }
            break;
          }
        }
      }
    }
    lastBase = base;
    lastTip = tip;
    for (let index = 0; index < flashes.length; index++)
      flashes[index] = Math.max(0, flashes[index] - dt / 450);
    if (!reduced.matches && extension > 0.5 && motion > 0.08)
      trails.push({ base: { ...base }, tip: { ...tip }, life: 0.16 });
    while (trails.length > 16) trails.shift();
    for (let i = trails.length - 1; i >= 0; i--) {
      trails[i].life -= dt / 1000;
      if (trails[i].life <= 0) trails.splice(i, 1);
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt / 1000;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      p.vy += dt * 0.35;
      p.x += (p.vx * dt) / 1000;
      p.y += (p.vy * dt) / 1000;
    }
    try {
      display.render({
        base,
        tip,
        angle,
        extension,
        peak,
        motion,
        elapsed,
        reduced: reduced.matches,
        targets: points,
        flashes,
        trails,
        particles,
      });
    } catch (cause) {
      fail(cause);
      return;
    }
    surface.dataset.extension = extension.toFixed(3);
    surface.dataset.reducedMotion = String(reduced.matches);
    if (
      active ||
      host.control.state === "starting" ||
      extension > 0 ||
      particles.length ||
      trails.length
    )
      frame = requestAnimationFrame(draw);
    else previous = 0;
  }
  function fail(cause: unknown) {
    if (failed || disposed) return;
    failed = true;
    reset();
    events.abort();
    observer.disconnect();
    cancelAnimationFrame(frame);
    display.dispose();
    canvas.remove();
    surface.dataset.renderer = "unavailable";
    host.stop();
    onError(cause);
  }
  canvas.addEventListener(
    "webglcontextlost",
    () => {
      fail(new Error("The 3D display lost its graphics context"));
    },
    { signal: events.signal },
  );
  window.addEventListener("pagehide", () => dispose(), {
    signal: events.signal,
  });
  function wake() {
    if (!disposed && !failed && !document.hidden && !frame)
      frame = requestAnimationFrame(draw);
  }
  function resize() {
    const box = surface.getBoundingClientRect();
    width = Math.max(1, box.width);
    height = Math.max(1, box.height);
    desired = boundPosition(desired);
    const bounded = boundPosition(position);
    position.x = bounded.x;
    position.y = bounded.y;
    try {
      display.resize(width, height);
    } catch (cause) {
      fail(cause);
    }
    lastTip = lastBase = undefined;
    lastMotionTip = undefined;
    wake();
  }
  function place(event: PointerEvent) {
    assistedTarget = null;
    const box = surface.getBoundingClientRect();
    desired = boundPosition({
      x: (event.clientX - box.left) / width,
      y: (event.clientY - box.top) / height,
    });
    wake();
  }
  surface.addEventListener(
    "pointerdown",
    (event) => {
      if (!event.isPrimary || event.button !== 0 || pointer !== null) return;
      pointer = event.pointerId;
      surface.setPointerCapture(pointer);
      surface.focus();
      place(event);
      host.ignite();
      wake();
    },
    { signal: events.signal },
  );
  surface.addEventListener(
    "pointermove",
    (event) => {
      if (pointer === event.pointerId) place(event);
    },
    { signal: events.signal },
  );
  surface.addEventListener(
    "pointerup",
    (event) => {
      if (pointer === event.pointerId) retract();
    },
    { signal: events.signal },
  );
  const cancel = (event: PointerEvent) => {
    if (pointer === event.pointerId) {
      releasePointer();
      reset();
      host.stop();
    }
  };
  surface.addEventListener("pointercancel", cancel, { signal: events.signal });
  surface.addEventListener("lostpointercapture", cancel, {
    signal: events.signal,
  });
  surface.addEventListener(
    "keydown",
    (event) => {
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
      if (event.repeat && ["Enter", " ", "Escape"].includes(event.key)) return;
      if (event.key === "Enter") host.ignite();
      if (event.key === " ") strike();
      if (event.key === "Escape") retract();
      if (event.key.startsWith("Arrow")) {
        assistedTarget = null;
        desired = boundPosition({
          x:
            desired.x +
            (event.key === "ArrowRight"
              ? 0.09
              : event.key === "ArrowLeft"
                ? -0.09
                : 0),
          y:
            desired.y +
            (event.key === "ArrowDown"
              ? 0.06
              : event.key === "ArrowUp"
                ? -0.06
                : 0),
        });
        wake();
      }
    },
    { signal: events.signal },
  );
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
        reset();
      } else wake();
    },
    { signal: events.signal },
  );
  reduced.addEventListener(
    "change",
    () => {
      trails.length = particles.length = 0;
      wake();
    },
    { signal: events.signal },
  );
  const observer = new ResizeObserver(resize);
  observer.observe(surface);
  surface.dataset.state = host.control.state;
  surface.dataset.hits = "0";
  resize();
  function dispose() {
    if (disposed) return;
    releasePointer();
    disposed = true;
    events.abort();
    observer.disconnect();
    cancelAnimationFrame(frame);
    disconnect();
    trails.length = particles.length = 0;
    display.dispose();
    canvas.remove();
  }
  return { wake, stateChanged, strike, retract, reset, dispose };
}
