import type { mountPlasmaBlade } from "./host";
import { segmentDistance, type Point } from "./motion";

/** Canvas presentation and input. No audio scheduling outside the controller. */
export function mountBladeStage(
  canvas: HTMLCanvasElement,
  host: ReturnType<typeof mountPlasmaBlade>,
) {
  const context = canvas.getContext("2d");
  if (!context)
    throw new Error(
      "Blade display unavailable. Use the controls below to play.",
    );
  const paint = context;
  const events = new AbortController();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const style = getComputedStyle(canvas);
  const violet = style.getPropertyValue("--signal-mid").trim() || "#b44cff";
  const blue = style.getPropertyValue("--signal-low").trim() || "#2a6cff";
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
    if (id !== null && canvas.hasPointerCapture(id))
      canvas.releasePointerCapture(id);
  }
  function reset() {
    releasePointer();
    extension = 0;
    collapsing = false;
    previous = 0;
    lastTip = lastBase = undefined;
    assistedTarget = null;
    trails.length = particles.length = 0;
    disconnect();
    wake();
  }
  function stateChanged() {
    canvas.dataset.state = host.control.state;
    if (host.control.state === "stopped" && !collapsing) reset();
    if (host.control.state === "running" && !analyser) {
      try {
        analyser = host.audio.native.context.createAnalyser();
        analyser.fftSize = 256;
        detach = host.audio.native.connect(analyser);
      } catch {
        canvas.dataset.signal = "unavailable";
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
    canvas.dataset.hits = String(hits);
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
    desired = { x: (low + high) / 2, y: baseY / height };
    assistedTarget = index;
    wake();
  }
  function stroke(
    a: Point,
    b: Point,
    color: string,
    thickness: number,
    alpha = 1,
  ) {
    paint.globalAlpha = alpha;
    paint.strokeStyle = color;
    paint.lineWidth = thickness;
    paint.lineCap = "round";
    paint.beginPath();
    paint.moveTo(a.x, a.y);
    paint.lineTo(b.x, b.y);
    paint.stroke();
    paint.globalAlpha = 1;
  }
  function draw(time: number) {
    frame = 0;
    if (disposed || document.hidden) return;
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
    const speed = dt
      ? (Math.hypot(base.x - old.x, base.y - old.y) * 1000) / dt
      : 0;
    const motion = host.control.update(speed, dt);
    canvas.dataset.motion = motion.toFixed(3);
    const duration = active ? 460 : 280;
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
    canvas.dataset.peak = String(peak);
    const angle =
      (position.x - 0.5) * 1.45 +
      (assistedTarget === null
        ? Math.max(-0.35, Math.min(0.35, vx / 6500))
        : 0);
    const length = Math.min(height * 0.44, width * 0.62) * extension;
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
    paint.clearRect(0, 0, width, height);
    paint.fillStyle = "#08080c";
    paint.fillRect(0, 0, width, height);
    // A pool of emitted light gives the blade a place in the dark.
    if (extension > 0) {
      const pool = paint.createRadialGradient(
        base.x,
        base.y,
        0,
        base.x,
        base.y,
        Math.max(width, height) * 0.65,
      );
      pool.addColorStop(0, `rgba(111,55,180,${0.08 * extension + peak * 0.5})`);
      pool.addColorStop(1, "rgba(8,8,12,0)");
      paint.fillStyle = pool;
      paint.fillRect(0, 0, width, height);
    }
    paint.strokeStyle = "#24242d";
    paint.lineWidth = 1;
    paint.beginPath();
    paint.ellipse(
      width / 2,
      height * 0.89,
      width * 0.29,
      height * 0.05,
      0,
      0,
      Math.PI * 2,
    );
    paint.stroke();
    for (let index = 0; index < points.length; index++) {
      const target = points[index];
      flashes[index] = Math.max(0, flashes[index] - dt / 450);
      paint.save();
      paint.translate(target.x, target.y);
      if (!reduced.matches && active)
        paint.rotate((elapsed / 4500) * (index % 2 ? -1 : 1));
      paint.strokeStyle = flashes[index] > 0 ? "#fff0d4" : "#bc8e53";
      paint.lineWidth = 1.5;
      paint.beginPath();
      for (let corner = 0; corner <= 6; corner++) {
        const a = (corner * Math.PI) / 3;
        const x = Math.cos(a) * 19,
          y = Math.sin(a) * 19;
        if (corner === 0) paint.moveTo(x, y);
        else paint.lineTo(x, y);
      }
      paint.stroke();
      paint.rotate(Math.PI / 6);
      paint.strokeRect(-6, -6, 12, 12);
      if (flashes[index] && !reduced.matches) {
        paint.globalAlpha = flashes[index];
        paint.beginPath();
        paint.arc(0, 0, 22 + (1 - flashes[index]) * 45, 0, Math.PI * 2);
        paint.stroke();
      }
      paint.restore();
    }
    if (!reduced.matches && extension > 0.5 && motion > 0.08)
      trails.push({ base: { ...base }, tip: { ...tip }, life: 0.16 });
    while (trails.length > 16) trails.shift();
    for (let i = trails.length - 1; i >= 0; i--) {
      const trail = trails[i];
      trail.life -= dt / 1000;
      if (trail.life <= 0) {
        trails.splice(i, 1);
        continue;
      }
      stroke(trail.base, trail.tip, violet, 7, trail.life * 0.75);
    }
    if (extension > 0) {
      paint.shadowColor = violet;
      paint.shadowBlur = reduced.matches ? 0 : 24 + peak * 100;
      stroke(base, tip, violet, 12 + motion * 3, 0.55);
      paint.shadowBlur = 9;
      stroke(base, tip, blue, 7, 0.85);
      paint.shadowBlur = 0;
      stroke(base, tip, "#eee8ff", 3.5);
      // Measured output ripples the electrical seam, never a simulated waveform.
      if (!reduced.matches && analyser) {
        paint.strokeStyle = "#ffffff";
        paint.lineWidth = 0.8;
        paint.beginPath();
        for (let i = 0; i < 48; i++) {
          const t = i / 47,
            offset = samples[i * 4] * 36;
          const x = base.x + (tip.x - base.x) * t + Math.cos(angle) * offset;
          const y = base.y + (tip.y - base.y) * t + Math.sin(angle) * offset;
          if (i === 0) paint.moveTo(x, y);
          else paint.lineTo(x, y);
        }
        paint.stroke();
      }
    }
    // Machined handle tracks the same rigid blade axis.
    const end = {
      x: base.x - Math.sin(angle) * 52,
      y: base.y + Math.cos(angle) * 52,
    };
    stroke(base, end, "#5f606c", 13);
    stroke(base, end, "#1c1d26", 9);
    for (let i = 1; i < 6; i++) {
      const x = base.x - Math.sin(angle) * i * 8,
        y = base.y + Math.cos(angle) * i * 8;
      stroke(
        { x: x - Math.cos(angle) * 5, y: y - Math.sin(angle) * 5 },
        { x: x + Math.cos(angle) * 5, y: y + Math.sin(angle) * 5 },
        "#777781",
        1,
      );
    }
    stroke(
      { x: base.x - Math.cos(angle) * 9, y: base.y - Math.sin(angle) * 9 },
      { x: base.x + Math.cos(angle) * 9, y: base.y + Math.sin(angle) * 9 },
      "#b4b3c1",
      4,
    );
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt / 1000;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      const before = { x: p.x, y: p.y };
      p.vy += dt * 0.35;
      p.x += (p.vx * dt) / 1000;
      p.y += (p.vy * dt) / 1000;
      stroke(before, p, i % 3 ? "#ffc577" : "#eee8ff", 1.5, p.life / p.total);
    }
    canvas.dataset.extension = extension.toFixed(3);
    canvas.dataset.reducedMotion = String(reduced.matches);
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
  function wake() {
    if (!disposed && !document.hidden && !frame)
      frame = requestAnimationFrame(draw);
  }
  function resize() {
    const box = canvas.getBoundingClientRect();
    width = Math.max(1, box.width);
    height = Math.max(1, box.height);
    const ratio = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    paint.setTransform(ratio, 0, 0, ratio, 0, 0);
    lastTip = lastBase = undefined;
    wake();
  }
  function place(event: PointerEvent) {
    assistedTarget = null;
    const box = canvas.getBoundingClientRect();
    desired = {
      x: Math.max(0.08, Math.min(0.92, (event.clientX - box.left) / width)),
      y: Math.max(0.4, Math.min(0.86, (event.clientY - box.top) / height)),
    };
    wake();
  }
  canvas.addEventListener(
    "pointerdown",
    (event) => {
      if (!event.isPrimary || event.button !== 0 || pointer !== null) return;
      pointer = event.pointerId;
      canvas.setPointerCapture(pointer);
      canvas.focus();
      place(event);
      host.ignite();
      wake();
    },
    { signal: events.signal },
  );
  canvas.addEventListener(
    "pointermove",
    (event) => {
      if (pointer === event.pointerId) place(event);
    },
    { signal: events.signal },
  );
  canvas.addEventListener(
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
  canvas.addEventListener("pointercancel", cancel, { signal: events.signal });
  canvas.addEventListener("lostpointercapture", cancel, {
    signal: events.signal,
  });
  canvas.addEventListener(
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
        desired = {
          x: Math.max(
            0.08,
            Math.min(
              0.92,
              desired.x +
                (event.key === "ArrowRight"
                  ? 0.09
                  : event.key === "ArrowLeft"
                    ? -0.09
                    : 0),
            ),
          ),
          y: Math.max(
            0.4,
            Math.min(
              0.86,
              desired.y +
                (event.key === "ArrowDown"
                  ? 0.06
                  : event.key === "ArrowUp"
                    ? -0.06
                    : 0),
            ),
          ),
        };
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
  observer.observe(canvas);
  canvas.dataset.state = host.control.state;
  canvas.dataset.hits = "0";
  resize();
  return {
    wake,
    stateChanged,
    strike,
    retract,
    reset,
    dispose() {
      if (disposed) return;
      releasePointer();
      disposed = true;
      events.abort();
      observer.disconnect();
      cancelAnimationFrame(frame);
      disconnect();
      trails.length = particles.length = 0;
      paint.clearRect(0, 0, width, height);
    },
  };
}
