import { mountEchoProbe } from "../../../catalog/experiences/echo-probe/host";
import type { ProbeEmission } from "../../../catalog/experiences/echo-probe/controller";

// All environment data and pixel-to-acoustic mapping belongs to this showcase.
const reflectors = [
  { x: 0.18, y: 0.27, surface: 0.08, intensity: 0.72, label: "01 / FELT" },
  { x: 0.79, y: 0.3, surface: 0.98, intensity: 0.95, label: "02 / GLASS" },
  { x: 0.62, y: 0.72, surface: 0.52, intensity: 0.85, label: "03 / STONE" },
] as const;

export function mountProbeStage(
  surface: HTMLElement,
  canvas: HTMLCanvasElement,
  feedback: {
    hint(value: string): void;
    error(cause: unknown): void;
    clearError(): void;
  },
) {
  const paint = canvas.getContext("2d");
  const style = getComputedStyle(surface);
  const color = (token: string) => style.getPropertyValue(token).trim();
  const ink = color("--ink"),
    mute = color("--mute"),
    edge = color("--graphite-edge");
  const signal = [
    color("--signal-low"),
    color("--signal-mid"),
    color("--signal-high"),
  ];
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const listeners = new AbortController();
  let width = 1,
    height = 1,
    frame = 0,
    disposed = false,
    serial = 0;
  let source = { x: 0.43, y: 0.52 };
  let events: { x: number; y: number; emission: ProbeEmission }[] = [];
  let analyser: AnalyserNode | undefined;
  let detach: (() => void) | undefined;
  const samples = new Float32Array(512);
  const host = mountEchoProbe({
    state(value) {
      surface.dataset.state = value;
      if (value === "stopped") {
        events = [];
        feedback.hint("Tap anywhere. Hear the space answer.");
        cancelAnimationFrame(frame);
        draw();
      }
    },
    error: feedback.error,
  });
  surface.dataset.state = "stopped";
  surface.dataset.ready = "true";

  function circle(x: number, y: number, radius: number) {
    paint!.beginPath();
    paint!.arc(x, y, radius, 0, Math.PI * 2);
    paint!.stroke();
  }
  function draw() {
    if (!paint || disposed) return;
    paint.clearRect(0, 0, width, height);
    paint.lineWidth = 1;
    paint.strokeStyle = edge;
    // A quiet field with no idle animation.
    for (let x = 24; x < width; x += 32)
      for (let y = 24; y < height - 80; y += 32) {
        paint.fillStyle = edge;
        paint.fillRect(x, y, 1, 1);
      }
    const now =
      host.audio.state === "running"
        ? host.audio.native.context.currentTime
        : 0;
    reflectors.forEach((wall, index) => {
      let light = 0;
      for (const event of events) {
        const response = event.emission.reflections[index];
        if (
          response &&
          response.at <= (event.emission.cancelledAt ?? Infinity) &&
          now >= response.at
        )
          light = Math.max(light, 1 - (now - response.at) / 0.3);
      }
      paint.strokeStyle = light > 0 ? signal[index] : mute;
      paint.fillStyle = light > 0 ? signal[index] : mute;
      paint.lineWidth = light > 0 ? 2 : 1;
      const x = wall.x * width,
        y = wall.y * height;
      if (index === 0) {
        for (let line = -2; line <= 2; line++) {
          paint.beginPath();
          paint.moveTo(x - 23, y + line * 5);
          paint.lineTo(x + 23, y + line * 5);
          paint.stroke();
        }
      } else if (index === 1) {
        paint.beginPath();
        paint.moveTo(x, y - 22);
        paint.lineTo(x + 18, y);
        paint.lineTo(x, y + 22);
        paint.lineTo(x - 18, y);
        paint.closePath();
        paint.stroke();
      } else {
        circle(x, y, 21);
        circle(x, y, 15);
      }
      paint.font = "10px ui-monospace, monospace";
      paint.textAlign = "center";
      paint.fillText(wall.label, x, y + 45);
    });
    events = events.filter((event) => now < event.emission.at + 1.8);
    if (!motion.matches)
      for (const event of events) {
        const age = now - event.emission.at;
        if (age < 0) continue;
        const radius =
          (Math.max(0, age - 0.045) * Math.hypot(width, height)) / 0.45;
        if (age < 0.55) {
          paint.globalAlpha = 0.5 * (1 - age / 0.55);
          paint.strokeStyle = signal[0];
          paint.lineWidth = 1.5;
          circle(event.x * width, event.y * height, Math.max(1, radius));
        }
        event.emission.reflections.forEach((response, index) => {
          if (response.at > (event.emission.cancelledAt ?? Infinity)) return;
          const duration = response.at - event.emission.at;
          const progress = age / duration;
          if (progress < 0 || progress > 1.25) return;
          const wall = reflectors[index];
          const travel =
            progress < 0.5 ? progress * 2 : Math.max(0, 2 - progress * 2);
          paint.globalAlpha =
            progress > 1 ? Math.max(0, 1 - (progress - 1) * 4) : 0.5;
          paint.strokeStyle = signal[index];
          paint.lineWidth = 1;
          paint.beginPath();
          paint.moveTo(event.x * width, event.y * height);
          paint.lineTo(wall.x * width, wall.y * height);
          paint.stroke();
          paint.globalAlpha *= 1.5;
          circle(
            (event.x + (wall.x - event.x) * travel) * width,
            (event.y + (wall.y - event.y) * travel) * height,
            progress > 1 ? 5 + (progress - 1) * 35 : 3,
          );
        });
      }
    paint.globalAlpha = 1;
    paint.strokeStyle = ink;
    paint.lineWidth = 1;
    circle(source.x * width, source.y * height, 5);
    circle(source.x * width, source.y * height, 12);
    paint.beginPath();
    paint.moveTo(source.x * width - 18, source.y * height);
    paint.lineTo(source.x * width + 18, source.y * height);
    paint.stroke();
    let peak = 0;
    samples.fill(0);
    if (analyser && events.length && host.audio.state === "running")
      analyser.getFloatTimeDomainData(samples);
    for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
    canvas.dataset.peak = String(peak);
    paint.strokeStyle = peak > 0.00001 ? signal[1] : edge;
    paint.beginPath();
    for (let index = 0; index < samples.length; index++) {
      const x = 24 + (index / (samples.length - 1)) * (width - 48);
      const y = height - 64 + (motion.matches ? 0 : samples[index] * 400);
      if (index === 0) paint.moveTo(x, y);
      else paint.lineTo(x, y);
    }
    paint.stroke();
    if (events.length && !document.hidden && host.audio.state === "running")
      frame = requestAnimationFrame(draw);
  }
  function refresh() {
    cancelAnimationFrame(frame);
    draw();
  }
  async function emit(x: number, y: number) {
    feedback.clearError();
    const position = {
      x: Math.max(0.06, Math.min(0.94, x)),
      y: Math.max(0.12, Math.min(0.78, y)),
    };
    const reflections = reflectors.map((wall) => ({
      distance:
        Math.hypot(
          (wall.x - position.x) * width,
          (wall.y - position.y) * height,
        ) / Math.hypot(width, height),
      pan: Math.max(-1, Math.min(1, (wall.x - position.x) * 2)),
      intensity: wall.intensity,
      surface: wall.surface,
    }));
    const emission = await host.emit(reflections, 42 + serial++);
    if (disposed || !emission) {
      if (!disposed && host.audio.state === "running")
        feedback.hint("Let the echoes settle, then tap again.");
      return;
    }
    source = position;
    events.push({ ...position, emission });
    if (!analyser) {
      analyser = host.audio.native.context.createAnalyser();
      analyser.fftSize = 512;
      detach = host.audio.native.connect(analyser);
    }
    feedback.hint("Listening to the returns…");
    refresh();
  }
  surface.addEventListener(
    "pointerdown",
    (event) => {
      if (event.button !== 0 || !event.isPrimary) return;
      event.preventDefault();
      surface.focus({ preventScroll: true });
      const box = surface.getBoundingClientRect();
      void emit(
        (event.clientX - box.left) / box.width,
        (event.clientY - box.top) / box.height,
      ).catch(feedback.error);
    },
    { signal: listeners.signal },
  );
  surface.addEventListener("pointercancel", host.stop, {
    signal: listeners.signal,
  });
  surface.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        host.stop();
      }
      if ((event.key === "Enter" || event.key === " ") && !event.repeat) {
        event.preventDefault();
        void emit(0.43, 0.52).catch(feedback.error);
      }
    },
    { signal: listeners.signal },
  );
  const resize = new ResizeObserver(() => {
    width = surface.clientWidth;
    height = surface.clientHeight;
    const ratio = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    paint?.setTransform(ratio, 0, 0, ratio, 0, 0);
    refresh();
  });
  resize.observe(surface);
  motion.addEventListener("change", refresh, { signal: listeners.signal });
  return {
    async dispose() {
      if (disposed) return;
      disposed = true;
      listeners.abort();
      resize.disconnect();
      cancelAnimationFrame(frame);
      detach?.();
      analyser?.disconnect();
      await host.dispose();
    },
  };
}
