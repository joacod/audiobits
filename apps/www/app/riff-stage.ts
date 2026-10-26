import { mountRiff } from "../../../catalog/experiences/riff-reactor/host";
import type {
  RiffTier,
  RiffTransport,
} from "../../../catalog/experiences/riff-reactor/controller";
import type { AudioEngine } from "audiobits";
import { bindAudioGestures } from "../lib/audio-gestures";
import {
  buildChart,
  createPerformance,
  inputTime,
  type ChartNote,
  type Lane,
  type Performance,
} from "../lib/riff-chart";

// Beats of chart visible between the horizon and the timing line.
const lookBeats = 4;
const depth = 2.4;
const keys: Record<string, Lane> = {
  a: 0,
  s: 1,
  d: 2,
  j: 0,
  k: 1,
  l: 2,
  ArrowLeft: 0,
  ArrowDown: 1,
  ArrowRight: 2,
};

/** An audio-clock note highway over a lazy, measured-audio reactor scene. */
export function mountRiffStage(
  surface: HTMLElement,
  canvas: HTMLCanvasElement,
  feedback: {
    hint(value: string): void;
    error(cause: unknown): void;
    clearError(): void;
  },
  prepared?: AudioEngine,
) {
  const paint = canvas.getContext("2d");
  const style = getComputedStyle(surface);
  const color = (token: string, fallback: string) =>
    style.getPropertyValue(token).trim() || fallback;
  const ink = color("--ink", "#f2f2f2");
  const laneColors = [
    color("--signal-low", "#2a6cff"),
    color("--signal-mid", "#b44cff"),
    color("--signal-high", "#ff2e88"),
  ];
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const listeners = new AbortController();
  let width = 1,
    height = 1,
    frame = 0,
    disposed = false;
  let transport: RiffTransport | undefined;
  let performance: Performance | undefined;
  let chart: readonly ChartNote[] = [];
  // Audible tier changes, each on its bar line in audio-clock time.
  let tiers: { tier: RiffTier; at: number }[] = [];
  const results = new Map<number, "hit" | "miss">();
  const pressed = [-1, -1, -1];
  let flashes: { lane: Lane; at: number; perfect: boolean }[] = [];
  let analyser: AnalyserNode | undefined;
  let detach: (() => void) | undefined;
  const samples = new Float32Array(1024);
  const spectrum = new Float32Array(512);
  let scene:
    | ReturnType<typeof import("./riff-reactor-scene").createReactorScene>
    | undefined;
  // Rendering never gates synchronous audio activation or the playable highway.
  void import("./riff-reactor-scene")
    .then(({ createReactorScene }) => {
      if (disposed) return;
      try {
        scene = createReactorScene(surface, laneColors);
        scene.resize(width, height);
        surface.dataset.renderer = "three";
        wake();
      } catch {
        surface.dataset.renderer = "canvas";
      }
    })
    .catch(() => {
      surface.dataset.renderer = "canvas";
    });
  const idleHint = "Tap the stage or press Enter to play.";

  const host = mountRiff(
    {
      phase(value) {
        surface.dataset.phase = value;
        if (value === "idle") transport = undefined;
        wake();
      },
      starting(value) {
        surface.dataset.starting = String(value);
        wake();
      },
      error(cause) {
        feedback.error(cause);
        wake();
      },
      started(value) {
        transport = value;
        performance = createPerformance(chart, value.secondsPerBeat);
        tiers = [{ tier: 0, at: value.origin }];
        results.clear();
        flashes = [];
        surface.dataset.origin = String(value.origin);
        publishScore();
        ensureAnalyser();
        feedback.clearError();
        feedback.hint(
          "Hit the notes as they cross the line. Streaks lift the band.",
        );
        wake();
      },
      intensity(tier, at) {
        tiers = tiers.filter((change) => change.at < at);
        tiers.push({ tier, at });
      },
      finished() {
        if (!performance) return;
        feedback.hint(
          `${performance.score} points, best streak ${performance.best}. Tap or press Enter to play again.`,
        );
      },
    },
    prepared,
  );
  chart = buildChart(host.song);
  surface.dataset.phase = "idle";
  surface.dataset.starting = "false";
  surface.dataset.tier = "0";
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
  function publishScore() {
    surface.dataset.score = String(performance?.score ?? 0);
    surface.dataset.streak = String(performance?.streak ?? 0);
    surface.dataset.hits = String(performance?.hits ?? 0);
    surface.dataset.misses = String(performance?.misses ?? 0);
  }
  /** One audio-clock reading per input, corrected to what the player hears. */
  function heard() {
    const context = host.audio.native.context;
    return context.currentTime - host.control.latency;
  }
  function press(lane: Lane, stamp: number) {
    if (host.control.phase !== "playing" || !performance || !transport) return;
    // Both clocks are read together; the event's stamp removes main-thread delay.
    const context = host.audio.native.context;
    const time =
      inputTime(context.currentTime, globalThis.performance.now(), stamp) -
      host.control.latency;
    pressed[lane] = time;
    const judgement = performance.press(lane, transport.beatAt(time));
    if (judgement.kind === "hit") {
      results.set(judgement.note.index, "hit");
      host.control.performLead(judgement.note.index);
      flashes.push({ lane, at: time, perfect: judgement.grade === "perfect" });
    } else host.control.choke();
    host.control.setIntensity(performance.tier);
    publishScore();
    wake();
  }
  function play() {
    if (host.control.phase === "playing" || host.starting) return;
    feedback.clearError();
    host.play();
  }
  surface.addEventListener(
    "pointerdown",
    (event) => {
      if (!event.isPrimary && host.control.phase !== "playing") return;
      if (host.control.phase !== "playing") {
        play();
        return;
      }
      const box = surface.getBoundingClientRect();
      const lane = Math.max(
        0,
        Math.min(2, Math.floor(((event.clientX - box.left) / box.width) * 3)),
      ) as Lane;
      event.preventDefault();
      press(lane, event.timeStamp);
    },
    { signal: listeners.signal },
  );
  surface.addEventListener(
    "keydown",
    (event) => {
      if (event.repeat) return;
      if (event.key === "Escape") {
        if (host.control.phase === "playing" || host.starting) {
          event.preventDefault();
          host.stop();
          feedback.hint(idleHint);
        }
        return;
      }
      if (host.control.phase !== "playing") {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          play();
        }
        return;
      }
      const lane =
        keys[event.key.length === 1 ? event.key.toLowerCase() : event.key];
      if (lane === undefined) return;
      event.preventDefault();
      press(lane, event.timeStamp);
    },
    { signal: listeners.signal },
  );

  // Perspective: p in [0, 1] from the timing line to the horizon.
  const k = 1 / (1 + depth);
  const toT = (p: number) => (1 / (1 + depth * p) - k) / (1 - k);
  function geometry() {
    const line = height * 0.82;
    const horizon = height * 0.32;
    const span = Math.min(width * 0.86, 560);
    return { line, horizon, span, cx: width / 2 };
  }
  function laneX(lane: number, t: number, g: ReturnType<typeof geometry>) {
    const scale = 0.18 + 0.82 * t;
    return g.cx + (lane - 1) * (g.span / 3) * scale;
  }
  function laneY(t: number, g: ReturnType<typeof geometry>) {
    return g.horizon + (g.line - g.horizon) * t;
  }

  function draw() {
    frame = 0;
    if (!paint || disposed) return;
    const g = geometry();
    const playing =
      host.control.phase === "playing" && transport && performance;
    const now = playing ? heard() : 0;
    const beat = playing ? transport!.beatAt(now) : -lookBeats;
    if (playing) {
      const missed = performance!.sweep(beat);
      if (missed.length) {
        for (const note of missed) results.set(note.index, "miss");
        host.control.setIntensity(performance!.tier);
        publishScore();
      }
    }
    let tier: RiffTier = 0;
    for (const change of tiers) if (change.at <= now) tier = change.tier;
    if (!playing) tier = 0;
    if (surface.dataset.tier !== String(tier))
      surface.dataset.tier = String(tier);
    const still = motion.matches;
    const pulse =
      playing && !still ? Math.max(0, 1 - (beat - Math.floor(beat)) * 2.5) : 0;

    let peak = 0,
      bass = 0,
      treble = 0;
    if (analyser && host.audio.state === "running") {
      analyser.getFloatTimeDomainData(samples);
      for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
      analyser.getFloatFrequencyData(spectrum);
      const binHz = host.audio.native.context.sampleRate / analyser.fftSize;
      for (let i = 1; i < spectrum.length; i++) {
        const amplitude = 10 ** (spectrum[i] / 20);
        if (i * binHz < 220) bass = Math.max(bass, amplitude);
        if (i * binHz > 3000) treble = Math.max(treble, amplitude);
      }
    }
    canvas.dataset.peak = String(peak);
    scene?.draw(playing ? beat : -1, peak, bass, treble, still);
    paint.clearRect(0, 0, width, height);
    // Reactor glow grows with the audible tier.
    const glow = paint.createRadialGradient(
      g.cx,
      g.horizon,
      0,
      g.cx,
      g.horizon,
      height,
    );
    glow.addColorStop(
      0,
      laneColors[tier] + (tier === 2 ? "66" : tier === 1 ? "44" : "26"),
    );
    glow.addColorStop(1, "#05050700");
    paint.fillStyle = glow;
    paint.fillRect(0, 0, width, height);

    // A dark road keeps notes distinct from the reactor behind the horizon.
    const road = paint.createLinearGradient(0, g.horizon, 0, height);
    road.addColorStop(0, "#05050710");
    road.addColorStop(1, "#050507e8");
    paint.fillStyle = road;
    paint.beginPath();
    paint.moveTo(laneX(-0.5, 0, g), g.horizon);
    paint.lineTo(laneX(2.5, 0, g), g.horizon);
    paint.lineTo(laneX(2.5, 1.2, g), laneY(1.2, g));
    paint.lineTo(laneX(-0.5, 1.2, g), laneY(1.2, g));
    paint.fill();
    // Highway edges and lane separators.
    paint.lineWidth = 1;
    for (let edge = 0; edge <= 3; edge++) {
      const lane = edge - 0.5;
      paint.strokeStyle = edge === 0 || edge === 3 ? ink + "55" : ink + "22";
      paint.beginPath();
      paint.moveTo(laneX(lane, 0, g), laneY(0, g));
      paint.lineTo(laneX(lane, 1.08, g), laneY(1.08, g));
      paint.stroke();
    }
    // Bar and beat lines scroll toward the player.
    for (let b = Math.ceil(beat); b <= beat + lookBeats; b++) {
      const t = toT((b - beat) / lookBeats);
      paint.strokeStyle = ink + (b % 4 === 0 ? "40" : "16");
      paint.beginPath();
      paint.moveTo(laneX(-0.5, t, g), laneY(t, g));
      paint.lineTo(laneX(2.5, t, g), laneY(t, g));
      paint.stroke();
    }
    // Notes and their sustains.
    if (playing)
      for (const note of chart) {
        if (note.beat + note.length < beat - 0.5) continue;
        if (note.beat > beat + lookBeats) break;
        const result = results.get(note.index);
        const start = Math.max(note.beat, beat);
        const end = Math.min(note.beat + note.length, beat + lookBeats);
        const t0 = toT(Math.max(0, (start - beat) / lookBeats));
        const t1 = toT(Math.max(0, (end - beat) / lookBeats));
        const hue = result === "miss" ? ink + "30" : laneColors[note.lane];
        if (note.length >= 1 && end > start) {
          paint.fillStyle = result === "hit" ? hue + "aa" : hue + "40";
          const w0 = (g.span / 3) * (0.18 + 0.82 * t0) * 0.16;
          const w1 = (g.span / 3) * (0.18 + 0.82 * t1) * 0.16;
          paint.beginPath();
          paint.moveTo(laneX(note.lane, t0, g) - w0, laneY(t0, g));
          paint.lineTo(laneX(note.lane, t1, g) - w1, laneY(t1, g));
          paint.lineTo(laneX(note.lane, t1, g) + w1, laneY(t1, g));
          paint.lineTo(laneX(note.lane, t0, g) + w0, laneY(t0, g));
          paint.fill();
        }
        if (note.beat < beat - 0.25 || result === "hit") continue;
        const t = toT(Math.max(0, (note.beat - beat) / lookBeats));
        const w = (g.span / 3) * (0.18 + 0.82 * t) * 0.72;
        const h = 4 + 10 * t;
        paint.fillStyle = hue;
        paint.shadowColor = hue;
        paint.shadowBlur = still || result === "miss" ? 0 : 6 + 10 * t;
        paint.fillRect(
          laneX(note.lane, t, g) - w / 2,
          laneY(t, g) - h / 2,
          w,
          h,
        );
        paint.shadowBlur = 0;
      }
    // Timing line with targets that light on input and pulse on the beat.
    paint.strokeStyle = ink + (pulse > 0 ? "cc" : "88");
    paint.lineWidth = 2 + pulse * 2;
    paint.beginPath();
    paint.moveTo(laneX(-0.5, 1, g), g.line);
    paint.lineTo(laneX(2.5, 1, g), g.line);
    paint.stroke();
    for (let lane = 0; lane < 3; lane++) {
      const age = playing && pressed[lane] >= 0 ? now - pressed[lane] : 1;
      const lit = Math.max(0, 1 - age / 0.18);
      paint.fillStyle = laneColors[lane] + (lit > 0 ? "ff" : "66");
      paint.beginPath();
      paint.arc(
        laneX(lane, 1, g),
        g.line,
        10 + (still ? 0 : 8 * lit),
        0,
        Math.PI * 2,
      );
      paint.fill();
    }
    flashes = flashes.filter((flash) => now - flash.at < 0.35);
    for (const flash of still ? [] : flashes) {
      const age = (now - flash.at) / 0.35;
      paint.strokeStyle = laneColors[flash.lane];
      paint.globalAlpha = 1 - age;
      paint.lineWidth = flash.perfect ? 3 : 2;
      paint.beginPath();
      paint.arc(laneX(flash.lane, 1, g), g.line, 14 + 40 * age, 0, Math.PI * 2);
      paint.stroke();
      paint.globalAlpha = 1;
    }
    // Score, streak and the tier meter.
    if (performance) {
      paint.fillStyle = ink;
      paint.font = "600 15px ui-monospace, monospace";
      paint.fillText(String(performance.score).padStart(6, "0"), 20, 30);
      paint.font = "12px ui-monospace, monospace";
      paint.fillText(`streak ${performance.streak}`, 20, 50);
      for (let segment = 0; segment < 3; segment++) {
        paint.fillStyle = segment <= tier ? laneColors[segment] : ink + "22";
        paint.fillRect(width - 20 - (3 - segment) * 26, 22, 22, 8);
      }
    }
    const busy =
      host.control.phase === "playing" || host.starting || flashes.length;
    if (busy && !document.hidden) frame = requestAnimationFrame(draw);
  }
  function wake() {
    if (!frame && !disposed) frame = requestAnimationFrame(draw);
  }
  const resize = new ResizeObserver(() => {
    width = surface.clientWidth;
    height = surface.clientHeight;
    const ratio = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    paint?.setTransform(ratio, 0, 0, ratio, 0, 0);
    scene?.resize(width, height);
    wake();
  });
  resize.observe(surface);
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) feedback.hint(idleHint);
      else wake();
    },
    { signal: listeners.signal },
  );
  feedback.hint(idleHint);
  return {
    audio: host.audio,
    async dispose() {
      if (disposed) return;
      disposed = true;
      unbind();
      listeners.abort();
      resize.disconnect();
      cancelAnimationFrame(frame);
      scene?.dispose();
      detach?.();
      analyser?.disconnect();
      await host.dispose();
    },
  };
}
