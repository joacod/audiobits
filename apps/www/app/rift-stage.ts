import { mountRift } from "../../../catalog/experiences/the-rift/host";
import type {
  RiftCollapseTimeline,
  RiftDisturbance,
  RiftShape,
} from "../../../catalog/experiences/the-rift/controller";
import type { AudioEngine } from "audiobits";
import { bindAudioGestures } from "../lib/audio-gestures";
import {
  createRiftField,
  RIFT_SAMPLES,
  type RiftField,
  type RiftFieldFrame,
} from "./rift-field-gl";

// Showcase geometry: gestures map to a normalized shape. Phases come only from
// the controller; this module keeps pointer details and drawing state.
const restingShape: RiftShape = {
  aperture: 0.05,
  tension: 0.35,
  instability: 0.15,
};
const clamp = (value: number, min = 0, max = 1) =>
  Math.max(min, Math.min(max, value));
function tint(hex: string, alpha: number) {
  const value = /^#([0-9a-f]{6})$/i.exec(hex)?.[1] ?? "b44cff";
  const channel = (index: number) =>
    parseInt(value.slice(index * 2, index * 2 + 2), 16);
  return `rgba(${channel(0)}, ${channel(1)}, ${channel(2)}, ${clamp(alpha)})`;
}

export function mountRiftStage(
  surface: HTMLElement,
  canvas: HTMLCanvasElement,
  feedback: {
    hint(value: string): void;
    error(cause: unknown): void;
    clearError(): void;
  },
  prepared?: AudioEngine,
  field?: HTMLCanvasElement,
) {
  const paint = canvas.getContext("2d");
  const style = getComputedStyle(surface);
  const color = (token: string, fallback: string) =>
    style.getPropertyValue(token).trim() || fallback;
  const ink = color("--ink", "#f2f2f2");
  const low = color("--signal-low", "#2a6cff");
  const mid = color("--signal-mid", "#b44cff");
  const high = color("--signal-high", "#ff2e88");
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const listeners = new AbortController();
  let width = 1,
    height = 1,
    frame = 0,
    disposed = false;
  let shape: RiftShape = restingShape;
  // Fracture geometry in CSS pixels, from the opening gesture.
  let tear:
    | { x: number; y: number; angle: number; length: number; seed: number }
    | undefined;
  let shown = 0;
  let kinetic = 0;
  let lastSent = 0;
  let collapseAt: RiftCollapseTimeline | undefined;
  let events: RiftDisturbance[] = [];
  let analyser: AnalyserNode | undefined;
  let detach: (() => void) | undefined;
  const samples = new Float32Array(1024);
  // WebGL2 shades the field when available and motion is allowed; the
  // Canvas 2D overlay still draws discharges, and paints everything otherwise.
  let gl: RiftField | null = null;
  let fieldLost = false;
  let pixels: [number, number] = [1, 1];
  let ratio = 1;
  const offsets = new Float32Array(RIFT_SAMPLES);
  const opens = new Float32Array(RIFT_SAMPLES);
  function publishRenderer() {
    surface.dataset.renderer = gl ? "webgl" : paint ? "canvas" : "unavailable";
    if (field) field.hidden = !gl;
  }
  function chooseRenderer() {
    if (disposed) return;
    if (motion.matches || !field || fieldLost) {
      gl?.dispose();
      gl = null;
    } else if (!gl) {
      gl = createRiftField(field, () => {
        fieldLost = true;
        gl = null;
        publishRenderer();
        wake();
      });
      gl?.resize(...pixels);
    }
    publishRenderer();
  }
  let gesture:
    | {
        id: number;
        mode: "open" | "shape";
        x: number;
        y: number;
        t: number;
        last: { x: number; y: number; t: number };
        aperture: number;
        tension: number;
        side: number;
        perpendicular: number;
        outward: number;
        sealing: boolean;
      }
    | undefined;

  const host = mountRift(
    {
      // The controller owns the phase and the host owns pending activation;
      // these callbacks only re-render and publish, they store nothing.
      phase(value) {
        surface.dataset.phase = value;
        if (value === "opening") ensureAnalyser();
        if (value === "idle") {
          tear = undefined;
          collapseAt = undefined;
          events = [];
          shape = restingShape;
          gesture = undefined;
          surface.dataset.sealing = "false";
          feedback.hint("Press and drag to tear the dark open.");
        }
        if (value === "active")
          feedback.hint(
            "Pull edges apart, stretch along the tear, shake it. Drag across it to seal.",
          );
        if (value === "collapsing") feedback.hint("Collapsing…");
        wake();
      },
      starting(value) {
        surface.dataset.starting = String(value);
        if (!value && host.control.phase === "idle" && !gesture)
          tear = undefined;
        wake();
      },
      error(cause) {
        tear = undefined;
        feedback.error(cause);
        wake();
      },
      disturbance(value) {
        events.push(value);
        wake();
      },
    },
    prepared,
  );
  surface.dataset.phase = "idle";
  surface.dataset.sealing = "false";
  surface.dataset.ready = "true";
  const unbind = bindAudioGestures(
    surface,
    host.audio,
    host.stop,
    feedback.error,
    feedback.clearError,
  );

  function ensureAnalyser() {
    if (analyser || host.audio.state !== "running") return;
    analyser = host.audio.native.context.createAnalyser();
    analyser.fftSize = 1024;
    detach = host.audio.native.connect(analyser);
  }
  function send(next: Partial<RiftShape>) {
    shape = { ...shape, ...next };
    host.update(shape);
    lastSent = performance.now();
  }
  function local(event: PointerEvent) {
    const box = surface.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  }
  const span = () => Math.min(width, height);
  function axes() {
    const angle = tear?.angle ?? 0;
    return {
      u: { x: Math.cos(angle), y: Math.sin(angle) },
      n: { x: -Math.sin(angle), y: Math.cos(angle) },
    };
  }
  function moveSpeed(point: { x: number; y: number }, time: number) {
    if (!gesture) return;
    const dt = Math.max(1, time - gesture.last.t);
    const speed =
      Math.hypot(point.x - gesture.last.x, point.y - gesture.last.y) / dt;
    gesture.last = { ...point, t: time };
    // Fast or jerky movement destabilizes; it decays after release.
    kinetic = Math.max(kinetic * 0.85, clamp(speed / (span() * 0.0016)));
  }

  surface.addEventListener(
    "pointerdown",
    (event) => {
      if (event.button !== 0 || !event.isPrimary || gesture) return;
      if (event.pointerType !== "touch") event.preventDefault();
      surface.focus({ preventScroll: true });
      feedback.clearError();
      const point = local(event);
      const now = performance.now();
      const base = {
        id: event.pointerId,
        x: point.x,
        y: point.y,
        t: now,
        last: { ...point, t: now },
        aperture: shape.aperture,
        tension: shape.tension,
        side: 1,
        perpendicular: 0,
        outward: 1,
        sealing: false,
      };
      if (host.control.phase === "idle" && !host.starting) {
        gesture = { ...base, mode: "open" };
        tear = {
          x: point.x,
          y: point.y,
          angle: -Math.PI / 2,
          length: 1,
          seed: Math.floor(Math.random() * 1e9),
        };
        shown = 0;
        kinetic = 0;
        shape = restingShape;
        // Activation must start inside this gesture.
        host.open(shape);
      } else if (host.control.phase === "active" && tear) {
        const { u, n } = axes();
        const dx = point.x - tear.x,
          dy = point.y - tear.y;
        const perpendicular = dx * n.x + dy * n.y;
        const along = dx * u.x + dy * u.y;
        gesture = {
          ...base,
          mode: "shape",
          side: perpendicular < 0 ? -1 : 1,
          perpendicular: Math.abs(perpendicular),
          outward: along < 0 ? -1 : 1,
        };
      } else return;
      surface.setPointerCapture(event.pointerId);
      wake();
    },
    { signal: listeners.signal },
  );
  function move(event: PointerEvent) {
    if (!gesture || event.pointerId !== gesture.id || !tear) return;
    const point = local(event);
    moveSpeed(point, performance.now());
    if (gesture.mode === "open") {
      const dx = point.x - gesture.x,
        dy = point.y - gesture.y;
      const length = Math.hypot(dx, dy);
      if (length > 4) {
        tear.angle = Math.atan2(dy, dx);
        tear.x = gesture.x + dx / 2;
        tear.y = gesture.y + dy / 2;
      }
      tear.length = Math.max(1, length);
      send({
        aperture: clamp(length / (span() * 0.6), 0.05, 1),
        instability: clamp(0.15 + kinetic * 0.6),
      });
    } else {
      const { u, n } = axes();
      const dx = point.x - tear.x,
        dy = point.y - tear.y;
      const perpendicular = dx * n.x + dy * n.y;
      const along = dx * u.x + dy * u.y;
      const within = Math.abs(along) < tear.length * 0.55;
      // Pushing one edge through the other arms the seal; release completes it.
      const sealing =
        within &&
        Math.sign(perpendicular) === -gesture.side &&
        Math.abs(perpendicular) > 8;
      gesture.sealing = sealing;
      surface.dataset.sealing = String(sealing);
      const pull =
        ((point.x - gesture.x) * u.x + (point.y - gesture.y) * u.y) *
        gesture.outward;
      send({
        aperture: sealing
          ? 0.02
          : clamp(
              gesture.aperture +
                (Math.abs(perpendicular) - gesture.perpendicular) /
                  (span() * 0.35),
              0.04,
              1,
            ),
        tension: clamp(gesture.tension + pull / (span() * 0.45)),
        instability: clamp(0.15 + kinetic * 0.85),
      });
    }
    wake();
  }
  surface.addEventListener("pointermove", move, { signal: listeners.signal });
  function end(event: PointerEvent, cancelled: boolean) {
    if (!gesture || event.pointerId !== gesture.id) return;
    // Fast drags can release beyond the last delivered move. Finalize the tear
    // from the release position before deciding whether the opening is valid.
    if (!cancelled && gesture.mode === "open") move(event);
    const current = gesture;
    gesture = undefined;
    surface.dataset.sealing = "false";
    if (surface.hasPointerCapture(event.pointerId))
      surface.releasePointerCapture(event.pointerId);
    if (current.mode === "open") {
      const valid = !cancelled && (tear?.length ?? 0) >= span() * 0.12;
      if (valid) host.settle();
      else {
        tear = undefined;
        host.cancel();
      }
    } else if (current.sealing && !cancelled) {
      collapseAt = host.collapse();
    } else if (current.sealing) {
      // An interrupted seal never collapses; restore the held opening.
      send({ aperture: Math.max(0.04, current.aperture) });
    }
    wake();
  }
  surface.addEventListener("pointerup", (event) => end(event, false), {
    signal: listeners.signal,
  });
  surface.addEventListener("pointercancel", (event) => end(event, true), {
    signal: listeners.signal,
  });
  surface.addEventListener("lostpointercapture", (event) => end(event, true), {
    signal: listeners.signal,
  });
  surface.addEventListener(
    "keydown",
    (event) => {
      const step = (key: keyof RiftShape, delta: number) => {
        event.preventDefault();
        send({
          [key]: clamp(shape[key] + delta, key === "aperture" ? 0.04 : 0),
        });
        wake();
      };
      if (event.key === "Escape") {
        event.preventDefault();
        if (host.control.phase === "active") collapseAt = host.collapse();
        else if (host.control.phase === "opening" || host.starting)
          host.cancel();
        return;
      }
      if (host.control.phase === "idle" && !host.starting) {
        if ((event.key === "Enter" || event.key === " ") && !event.repeat) {
          event.preventDefault();
          tear = {
            x: width / 2,
            y: height * 0.45,
            angle: -Math.PI / 2 + 0.18,
            length: span() * 0.55,
            seed: Math.floor(Math.random() * 1e9),
          };
          shown = 0;
          shape = { ...restingShape, aperture: 0.55 };
          host.open(shape);
          host.settle();
          wake();
        }
        return;
      }
      if (host.control.phase !== "active") return;
      if (event.key === "ArrowUp") step("aperture", 0.08);
      else if (event.key === "ArrowDown") step("aperture", -0.08);
      else if (event.key === "ArrowRight") step("tension", 0.08);
      else if (event.key === "ArrowLeft") step("tension", -0.08);
      else if (event.key === " ") {
        event.preventDefault();
        kinetic = 1;
        send({ instability: 1 });
        wake();
      }
    },
    { signal: listeners.signal },
  );

  function level() {
    let peak = 0,
      sum = 0;
    samples.fill(0);
    if (analyser && host.audio.state === "running")
      analyser.getFloatTimeDomainData(samples);
    for (const sample of samples) {
      peak = Math.max(peak, Math.abs(sample));
      sum += sample * sample;
    }
    canvas.dataset.peak = String(peak);
    return Math.min(1, Math.sqrt(sum / samples.length) * 6);
  }
  function random(seed: number) {
    let state = seed >>> 0;
    return () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 0x100000000;
    };
  }
  function draw() {
    frame = 0;
    if (!paint || disposed) return;
    const reduced = motion.matches;
    const now =
      host.audio.state === "running"
        ? host.audio.native.context.currentTime
        : 0;
    const energy = level();
    paint.globalCompositeOperation = "source-over";
    paint.globalAlpha = 1;
    if (gl) paint.clearRect(0, 0, width, height);
    else {
      paint.fillStyle = "#050507";
      paint.fillRect(0, 0, width, height);
    }
    const pulses: RiftFieldFrame["pulses"] = [];
    let fracture:
      Pick<RiftFieldFrame, "center" | "axis" | "normal" | "half"> | undefined;
    // Kinetic instability relaxes toward rest after the hand lets go.
    if (!gesture && kinetic > 0.001 && host.control.phase === "active") {
      kinetic *= 0.94;
      const instability = clamp(0.15 + kinetic * 0.85);
      if (performance.now() - lastSent > 60 || kinetic < 0.01)
        send({ instability });
    }
    let target =
      host.control.phase === "idle" && !host.starting && !gesture
        ? 0
        : shape.aperture;
    let pinch = 1;
    if (collapseAt && host.control.phase === "collapsing") {
      const progress = clamp(
        (now - collapseAt.at) / (collapseAt.implodeAt - collapseAt.at),
      );
      pinch = 1 - progress * progress;
      target = shape.aperture * pinch;
    }
    shown += (target - shown) * (reduced ? 1 : 0.18);
    if (tear && (shown > 0.003 || gesture)) {
      const draws = random(tear.seed);
      const { u, n } = axes();
      const points = 34;
      const stretch = 0.9 + shape.tension * 0.3;
      const half = (tear.length * stretch * (0.4 + 0.6 * pinch)) / 2;
      const width0 = Math.max(1.2, shown * span() * 0.11);
      const jag = (3 + shape.tension * 9) * (0.5 + shown);
      const shake = reduced ? 0 : shape.instability * (2 + energy * 10);
      const top: [number, number][] = [];
      const bottom: [number, number][] = [];
      for (let i = 0; i <= points; i++) {
        const s = i / points;
        const along = (s - 0.5) * 2 * half;
        const profile = Math.pow(
          Math.sin(Math.PI * s),
          0.75 - shape.tension * 0.3,
        );
        const offset = (draws() - 0.5) * jag + (Math.random() - 0.5) * shake;
        const open = width0 * profile * (1 + 0.15 * (draws() - 0.5));
        const cx = tear.x + u.x * along + n.x * offset;
        const cy = tear.y + u.y * along + n.y * offset;
        offsets[i] = offset;
        opens[i] = open;
        top.push([cx + n.x * open, cy + n.y * open]);
        bottom.push([cx - n.x * open, cy - n.y * open]);
      }
      const shapePath = () => {
        paint.beginPath();
        top.forEach(([x, y], i) =>
          i ? paint.lineTo(x, y) : paint.moveTo(x, y),
        );
        for (let i = bottom.length - 1; i >= 0; i--)
          paint.lineTo(bottom[i][0], bottom[i][1]);
        paint.closePath();
      };
      fracture = {
        center: [tear.x, tear.y],
        axis: [u.x, u.y],
        normal: [n.x, n.y],
        half,
      };
      if (!gl) {
        // Light leaking from the other side.
        paint.globalCompositeOperation = "lighter";
        const glow = paint.createRadialGradient(
          tear.x,
          tear.y,
          0,
          tear.x,
          tear.y,
          half * 1.3 + width0 * 4,
        );
        glow.addColorStop(0, tint(mid, 0.15 + 0.5 * shown * (0.6 + energy)));
        glow.addColorStop(0.5, tint(low, 0.13));
        glow.addColorStop(1, tint(low, 0));
        paint.fillStyle = glow;
        paint.fillRect(0, 0, width, height);
        const inner = paint.createLinearGradient(
          tear.x + n.x * width0,
          tear.y + n.y * width0,
          tear.x - n.x * width0,
          tear.y - n.y * width0,
        );
        // A bright rim around a deep void: the other side is dark, not lit.
        const rim = shape.instability > 0.6 ? high : mid;
        inner.addColorStop(0, rim);
        inner.addColorStop(0.18, tint(low, 0.9));
        inner.addColorStop(0.5, "#06030d");
        inner.addColorStop(0.82, tint(low, 0.9));
        inner.addColorStop(1, rim);
        paint.globalCompositeOperation = "source-over";
        paint.shadowColor = mid;
        paint.shadowBlur = reduced ? 12 : 18 + 50 * energy;
        paint.globalAlpha = 0.6 + 0.4 * Math.min(1, shown * 2);
        paint.fillStyle = inner;
        shapePath();
        paint.fill();
        paint.shadowBlur = 0;
        paint.globalCompositeOperation = "lighter";
        // Internal turbulence streaks.
        if (!reduced && shown > 0.05) {
          paint.globalAlpha = 0.12 + 0.35 * energy;
          paint.strokeStyle = rim;
          paint.lineWidth = 0.7;
          for (let k = 0; k < 5; k++) {
            const phaseShift = (now * (0.2 + k * 0.07 + shape.instability)) % 1;
            const s = 0.15 + 0.7 * ((phaseShift + k / 5) % 1);
            const i = Math.round(s * points);
            const [tx, ty] = top[i];
            const [bx, by] = bottom[i];
            paint.beginPath();
            paint.moveTo(tx + (bx - tx) * 0.3, ty + (by - ty) * 0.3);
            paint.lineTo(tx + (bx - tx) * 0.7, ty + (by - ty) * 0.7);
            paint.stroke();
          }
        }
        // Thin unstable edges.
        paint.globalCompositeOperation = "source-over";
        paint.globalAlpha = 0.9;
        paint.lineWidth = gesture?.sealing ? 2.2 : 1.1;
        paint.strokeStyle = gesture?.sealing ? high : ink;
        for (const edge of [top, bottom]) {
          paint.beginPath();
          edge.forEach(([x, y], i) =>
            i ? paint.lineTo(x, y) : paint.moveTo(x, y),
          );
          paint.stroke();
        }
      }
      // Discharges and knocks, drawn at their scheduled audio-clock times.
      events = events.filter((event) => now < event.at + 0.6);
      paint.globalCompositeOperation = "lighter";
      for (const event of events) {
        const age = now - event.at;
        if (age < 0) continue;
        const fade = 1 - age / 0.6;
        const i = Math.round(clamp(0.5 + event.pan * 0.6, 0.1, 0.9) * points);
        const [ex, ey] = event.pan < 0 ? top[i] : bottom[i];
        paint.globalAlpha = fade * event.strength;
        if (pulses.length < 4)
          pulses.push({
            s: i / points,
            side: event.pan < 0 ? 1 : -1,
            age,
            strength: event.strength,
            kind: event.kind === "crackle" ? 0 : event.kind === "groan" ? 1 : 2,
          });
        if (event.kind === "crackle" && !reduced) {
          paint.strokeStyle = ink;
          paint.lineWidth = 1;
          paint.beginPath();
          paint.moveTo(ex, ey);
          let x = ex,
            y = ey;
          const away = event.pan < 0 ? 1 : -1;
          for (let k = 0; k < 6; k++) {
            x += n.x * away * 9 + (draws() - 0.5) * 14;
            y += n.y * away * 9 + (draws() - 0.5) * 14;
            paint.lineTo(x, y);
          }
          paint.stroke();
        } else if (!gl) {
          paint.strokeStyle = event.kind === "groan" ? high : low;
          paint.lineWidth = 1.5;
          paint.beginPath();
          paint.arc(
            tear.x,
            tear.y,
            width0 * 2 + (reduced ? 20 : age * span() * 0.5),
            0,
            Math.PI * 2,
          );
          paint.stroke();
        }
      }
    }
    // The implosion: an inward ring and a brief flash at the seal.
    if (collapseAt && tear && now >= collapseAt.implodeAt && !gl) {
      const age = now - collapseAt.implodeAt;
      if (age < 0.9) {
        paint.globalCompositeOperation = "lighter";
        paint.globalAlpha = Math.max(0, 1 - age / 0.9);
        paint.fillStyle = ink;
        paint.beginPath();
        paint.arc(
          tear.x,
          tear.y,
          3 + (reduced ? 0 : 10 * (1 - age)),
          0,
          Math.PI * 2,
        );
        paint.fill();
        if (!reduced) {
          paint.strokeStyle = mid;
          paint.lineWidth = 2;
          paint.beginPath();
          paint.arc(
            tear.x,
            tear.y,
            Math.max(1, span() * 0.35 * (1 - age / 0.25)),
            0,
            Math.PI * 2,
          );
          if (age < 0.25) paint.stroke();
        }
      }
    }
    paint.globalCompositeOperation = "source-over";
    paint.globalAlpha = 1;
    gl?.render({
      width,
      height,
      ratio: pixels[0] / Math.max(1, width),
      time: now || performance.now() / 1000,
      active: fracture ? 1 : 0,
      center: fracture?.center ?? [width / 2, height / 2],
      axis: fracture?.axis ?? [1, 0],
      normal: fracture?.normal ?? [0, 1],
      half: fracture?.half ?? 1,
      offsets,
      opens,
      shown,
      tension: shape.tension,
      instability: shape.instability,
      energy,
      sealing: gesture?.sealing ? 1 : 0,
      seed: tear?.seed ?? 0,
      implosion:
        collapseAt && now >= collapseAt.implodeAt
          ? now - collapseAt.implodeAt
          : -1,
      span: span(),
      pulses,
      colors: { ink, low, mid, high },
    });
    const busy =
      host.control.phase !== "idle" ||
      host.starting ||
      gesture ||
      events.length ||
      kinetic > 0.01;
    if (busy && !document.hidden) frame = requestAnimationFrame(draw);
  }
  function wake() {
    if (!frame && !disposed) frame = requestAnimationFrame(draw);
  }
  const resize = new ResizeObserver(() => {
    width = surface.clientWidth;
    height = surface.clientHeight;
    ratio = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    // The shaded field is soft; cap its density to keep frames cheap.
    const fieldRatio = Math.min(ratio, 1.5);
    pixels = [Math.round(width * fieldRatio), Math.round(height * fieldRatio)];
    gl?.resize(...pixels);
    paint?.setTransform(ratio, 0, 0, ratio, 0, 0);
    wake();
  });
  resize.observe(surface);
  chooseRenderer();
  motion.addEventListener(
    "change",
    () => {
      chooseRenderer();
      wake();
    },
    { signal: listeners.signal },
  );
  document.addEventListener(
    "visibilitychange",
    () => {
      if (!document.hidden) wake();
    },
    { signal: listeners.signal },
  );
  feedback.hint("Press and drag to tear the dark open.");
  return {
    audio: host.audio,
    async dispose() {
      if (disposed) return;
      disposed = true;
      unbind();
      listeners.abort();
      resize.disconnect();
      cancelAnimationFrame(frame);
      gl?.dispose();
      gl = null;
      detach?.();
      analyser?.disconnect();
      await host.dispose();
    },
  };
}
