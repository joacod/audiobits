"use client";

import { useEffect, useRef, useState } from "react";
import { readSignalPalette, type Rgb } from "../lib/signal-palette";
import type { AudioEngine } from "audiobits";

/**
 * Thruster trail adapted from the free React Bits Ribbons component
 * (https://reactbits.dev/animations/ribbons, MIT plus Commons Clause,
 * copyright 2026 David Haz). See apps/www/licenses/react-bits.txt.
 *
 * The published component listens on window and chases the page pointer.
 * This copy listens to nothing. The thruster stage writes the play-surface
 * point and the controller throttle into `target`. A missing WebGL2 context
 * draws the same trail in 2D. Reduced motion draws one static stroke.
 */

export type ThrusterTarget = {
  x: number;
  y: number;
  throttle: number;
  engaged: boolean;
  placed: boolean;
};

const POINTS = 42;
const DETAIL = 4;
const SAMPLES = (POINTS - 1) * DETAIL + 1;
const STRIDE = 6;
const STEP = 1 / 120;
const reducedQuery = "(prefers-reduced-motion: reduce)";
// One ribbon per signal stop (low, mid, high). Colours come from the CSS
// tokens at mount; see lib/signal-palette.ts.
const COLORS = ["low", "mid", "high"] as const;

const VERTEX = `#version 300 es
in vec2 a_position;
in vec4 a_shape;
uniform vec2 u_resolution;
out vec4 v_shape;
void main() {
  v_shape = a_shape;
  vec2 clip = a_position / u_resolution * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}
`;

const FRAGMENT = `#version 300 es
precision highp float;
uniform vec3 u_color;
uniform float u_opacity;
uniform float u_softness;
in vec4 v_shape;
out vec4 outColor;
void main() {
  float halfWidth = v_shape.y;
  float dist = abs(v_shape.x) * v_shape.z;
  float edge = max(halfWidth, 0.5);
  float soft = u_softness * edge;
  float alpha = 1.0 - smoothstep(edge - soft - 0.6, edge + 0.6, dist);
  alpha *= clamp(halfWidth / 0.5, 0.0, 1.0);
  alpha *= 1.0 - smoothstep(0.0, 1.0, v_shape.w);
  alpha *= u_opacity;
  if (alpha <= 0.002) discard;
  outColor = vec4(u_color * alpha, alpha);
}
`;

type Ribbon = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  points: Float32Array;
  pull: number;
  drag: number;
  width: number;
  lift: number;
  nudge: number;
  phase: number;
  color: Rgb;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

const hash = (value: number) => {
  const scrambled = Math.sin(value * 127.1 + 311.7) * 43758.5453;
  return scrambled - Math.floor(scrambled);
};

function createRibbon(
  index: number,
  x: number,
  y: number,
  span: number,
): Ribbon {
  const points = new Float32Array(POINTS * 2);
  for (let i = 0; i < POINTS; i += 1) {
    const along = i / (POINTS - 1);
    points[i * 2] = x + (index - 1) * 16;
    points[i * 2 + 1] = y + along * span;
  }
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    points,
    pull: 0.35 + 1.3 * hash(index + 3),
    drag: 0.9 + 0.2 * hash(index + 5),
    width: 0.85 + 0.3 * hash(index + 7),
    lift: hash(index + 13) - 0.5,
    nudge: hash(index + 17) - 0.5,
    phase: hash(index + 19) * Math.PI * 2,
    color: [0.5, 0.5, 0.5],
  };
}

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
}

export function ThrusterRibbons({
  target,
  wakeRef,
  engine,
  active,
}: {
  target: { current: ThrusterTarget };
  wakeRef: { current: () => void };
  engine: () => AudioEngine | null;
  active: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  const [mode, setMode] = useState<"webgl" | "canvas" | "unavailable">(
    "canvas",
  );
  const modeRef = useRef(mode);
  function publishMode(next: "webgl" | "canvas" | "unavailable") {
    if (modeRef.current === next) return;
    modeRef.current = next;
    setMode(next);
  }

  useEffect(() => {
    activeRef.current = active;
    if (!active && canvas.current) canvas.current.dataset.peak = "0";
    wakeRef.current();
  }, [active, wakeRef]);

  useEffect(() => {
    const surface = root.current;
    const glCanvas = canvas.current;
    if (!surface || !glCanvas) return;
    const reduced = matchMedia(reducedQuery);
    let renderer: WebGL2RenderingContext | null = null;
    let paint: CanvasRenderingContext2D | null = null;
    let program: WebGLProgram | null = null;
    let buffer: WebGLBuffer | null = null;
    let vao: WebGLVertexArrayObject | null = null;
    let analyser: AnalyserNode | undefined;
    let detach: (() => void) | undefined;
    let samples: Float32Array<ArrayBuffer> | undefined;
    let frame = 0;
    let last = 0;
    let onScreen = false;
    let moving = false;
    let width = 1;
    let height = 1;
    const palette = readSignalPalette(surface);
    const ribbons = COLORS.map((stop, index) => ({
      ...createRibbon(index, 0, 0, 80),
      color: palette[stop],
    }));
    const pointX = new Float32Array(POINTS);
    const pointY = new Float32Array(POINTS);
    const spacing = new Float32Array(POINTS);
    const sampleX = new Float32Array(SAMPLES);
    const sampleY = new Float32Array(SAMPLES);
    const sampleSpacing = new Float32Array(SAMPLES);
    let vertices = new Float32Array(0);
    const uniforms: Record<string, WebGLUniformLocation | null> = {};

    const publishPeak = (peak: number) => {
      const level = peak < 0.0008 ? 0 : peak;
      glCanvas.dataset.peak = level === 0 ? "0" : level.toFixed(4);
    };
    const sampleLevel = () => {
      if (!activeRef.current || reduced.matches || !analyser || !samples) {
        return 0;
      }
      const audio = engine();
      if (!audio || audio.state !== "running") return 0;
      analyser.getFloatTimeDomainData(samples);
      let peak = 0;
      for (let index = 0; index < samples.length; index += 1) {
        const value = Math.abs(samples[index] ?? 0);
        if (value > peak) peak = value;
      }
      return peak;
    };
    const connectTap = () => {
      if (analyser || reduced.matches || !activeRef.current) return;
      const audio = engine();
      if (!audio || audio.state !== "running") return;
      try {
        const native = audio.native;
        const node = native.context.createAnalyser();
        node.fftSize = 1024;
        analyser = node;
        detach = native.connect(node);
        samples = new Float32Array(new ArrayBuffer(1024 * 4));
      } catch {
        surface.dataset.display = "unavailable";
      }
    };
    const disconnectTap = () => {
      try {
        detach?.();
        analyser?.disconnect();
      } catch {
        /* The engine may already be closing. */
      }
      detach = undefined;
      analyser = undefined;
      samples = undefined;
    };
    const resize = () => {
      const previousWidth = width;
      const previousHeight = height;
      width = Math.max(1, surface.clientWidth);
      height = Math.max(1, surface.clientHeight);
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      const pixelWidth = Math.max(1, Math.round(width * ratio));
      const pixelHeight = Math.max(1, Math.round(height * ratio));
      if (glCanvas.width !== pixelWidth || glCanvas.height !== pixelHeight) {
        glCanvas.width = pixelWidth;
        glCanvas.height = pixelHeight;
      }
      if (
        !target.current.placed &&
        (width !== previousWidth || height !== previousHeight)
      ) {
        for (const ribbon of ribbons) {
          const next = createRibbon(
            ribbons.indexOf(ribbon),
            width / 2,
            height * 0.42,
            height * 0.34,
          );
          ribbon.x = next.x;
          ribbon.y = next.y;
          ribbon.points = next.points;
        }
      }
    };
    const motionOf = () => {
      const current = target.current;
      return {
        x: current.placed ? current.x : width / 2,
        y: current.placed ? current.y : height * 0.46,
        throttle: current.throttle,
        engaged: current.engaged,
        placed: current.placed,
      };
    };
    const simulate = (dt: number) => {
      const motion = motionOf();
      const thickness = 12 + motion.throttle * 34;
      const spread = 10 + motion.throttle * 18;
      const spring = 0.03 * 4 ** (2 * 0.46 - 1);
      const zeta = clamp(0.3 ** (2 * 0.42), 0.05, 1);
      const follow = 1 - 0.183 ** ((1 / 1.65) * dt * 60);
      const count = ribbons.length;
      const center = (count - 1) / 2;
      let speed = 0;
      for (let i = 0; i < count; i += 1) {
        const ribbon = ribbons[i];
        if (!ribbon) continue;
        const omega = 60 * Math.sqrt(spring * ribbon.pull);
        const damping = 2 * zeta * 60 * Math.sqrt(spring) * ribbon.drag;
        const tx = motion.x + (i - center + ribbon.nudge * 0.2) * spread;
        const ty = motion.y + ribbon.lift * spread * 0.35;
        ribbon.vx +=
          (omega * omega * (tx - ribbon.x) - damping * ribbon.vx) * dt;
        ribbon.vy +=
          (omega * omega * (ty - ribbon.y) - damping * ribbon.vy) * dt;
        ribbon.x += ribbon.vx * dt;
        ribbon.y += ribbon.vy * dt;
        speed = Math.max(speed, Math.hypot(ribbon.vx, ribbon.vy));
        const { points } = ribbon;
        points[0] = ribbon.x;
        points[1] = ribbon.y;
        for (let j = 1; j < POINTS; j += 1) {
          const p = j * 2;
          points[p] =
            (points[p] ?? 0) +
            ((points[p - 2] ?? 0) - (points[p] ?? 0)) * follow;
          points[p + 1] =
            (points[p + 1] ?? 0) +
            ((points[p - 1] ?? 0) - (points[p + 1] ?? 0)) * follow;
        }
        ribbon.phase += dt;
      }
      moving = speed > 12 || motion.engaged;
      return thickness;
    };
    const drawStatic = (ctx: CanvasRenderingContext2D) => {
      const motion = motionOf();
      ctx.clearRect(0, 0, glCanvas.width, glCanvas.height);
      ctx.save();
      ctx.scale(glCanvas.width / width, glCanvas.height / height);
      const dx = motion.x - width / 2;
      const dy = motion.y - height * 0.46;
      const dist = Math.hypot(dx, dy);
      const nx = dist < 1 ? 0 : dx / dist;
      const ny = dist < 1 ? -1 : dy / dist;
      const length = 28 + motion.throttle * Math.min(width, height) * 0.42;
      ctx.lineCap = "round";
      ribbons.forEach((ribbon, index) => {
        const offset = (index - 1) * (5 + motion.throttle * 12);
        const px = -ny * offset;
        const py = nx * offset;
        ctx.beginPath();
        ctx.moveTo(motion.x + px, motion.y + py);
        ctx.lineTo(motion.x + px - nx * length, motion.y + py - ny * length);
        const [r, g, b] = ribbon.color;
        ctx.strokeStyle = `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`;
        ctx.globalAlpha = 0.4 + motion.throttle * 0.55;
        ctx.lineWidth = 4 + motion.throttle * 14 - index;
        ctx.stroke();
      });
      ctx.restore();
    };
    const drawCanvas = (ctx: CanvasRenderingContext2D, thickness: number) => {
      const motion = motionOf();
      ctx.clearRect(0, 0, glCanvas.width, glCanvas.height);
      ctx.save();
      ctx.scale(glCanvas.width / width, glCanvas.height / height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const ribbon of ribbons) {
        ctx.beginPath();
        ctx.moveTo(ribbon.points[0] ?? 0, ribbon.points[1] ?? 0);
        for (let i = 1; i < POINTS; i += 1) {
          ctx.lineTo(ribbon.points[i * 2] ?? 0, ribbon.points[i * 2 + 1] ?? 0);
        }
        const [r, g, b] = ribbon.color;
        ctx.strokeStyle = `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`;
        ctx.globalAlpha = clamp(0.34 + motion.throttle * 0.6, 0, 1);
        ctx.lineWidth = thickness * ribbon.width * 0.28;
        ctx.stroke();
      }
      ctx.restore();
    };
    const build = (
      ribbon: Ribbon,
      out: Float32Array,
      offset: number,
      thickness: number,
    ) => {
      const { points } = ribbon;
      let total = 0;
      for (let j = 0; j < POINTS; j += 1) {
        pointX[j] = points[j * 2] ?? 0;
        pointY[j] = points[j * 2 + 1] ?? 0;
        if (j > 0) {
          total += Math.hypot(
            (pointX[j] ?? 0) - (pointX[j - 1] ?? 0),
            (pointY[j] ?? 0) - (pointY[j - 1] ?? 0),
          );
        }
      }
      if (total < 0.5) return 0;
      for (let j = 0; j < POINTS; j += 1) {
        const prev = Math.max(j - 1, 0);
        const next = Math.min(j + 1, POINTS - 1);
        spacing[j] = Math.hypot(
          (pointX[next] ?? 0) - (pointX[prev] ?? 0),
          (pointY[next] ?? 0) - (pointY[prev] ?? 0),
        );
      }
      let cursor = 0;
      for (let j = 0; j < POINTS - 1; j += 1) {
        const a = Math.max(j - 1, 0);
        const b = j;
        const c = j + 1;
        const d = Math.min(j + 2, POINTS - 1);
        for (let step = 0; step < DETAIL; step += 1) {
          const t = step / DETAIL;
          const t2 = t * t;
          const t3 = t2 * t;
          sampleX[cursor] =
            0.5 *
            (2 * (pointX[b] ?? 0) +
              ((pointX[c] ?? 0) - (pointX[a] ?? 0)) * t +
              (2 * (pointX[a] ?? 0) -
                5 * (pointX[b] ?? 0) +
                4 * (pointX[c] ?? 0) -
                (pointX[d] ?? 0)) *
                t2 +
              (3 * (pointX[b] ?? 0) -
                (pointX[a] ?? 0) -
                3 * (pointX[c] ?? 0) +
                (pointX[d] ?? 0)) *
                t3);
          sampleY[cursor] =
            0.5 *
            (2 * (pointY[b] ?? 0) +
              ((pointY[c] ?? 0) - (pointY[a] ?? 0)) * t +
              (2 * (pointY[a] ?? 0) -
                5 * (pointY[b] ?? 0) +
                4 * (pointY[c] ?? 0) -
                (pointY[d] ?? 0)) *
                t2 +
              (3 * (pointY[b] ?? 0) -
                (pointY[a] ?? 0) -
                3 * (pointY[c] ?? 0) +
                (pointY[d] ?? 0)) *
                t3);
          sampleSpacing[cursor] =
            (spacing[j] ?? 0) + ((spacing[j + 1] ?? 0) - (spacing[j] ?? 0)) * t;
          cursor += 1;
        }
      }
      sampleX[cursor] = pointX[POINTS - 1] ?? 0;
      sampleY[cursor] = pointY[POINTS - 1] ?? 0;
      sampleSpacing[cursor] = spacing[POINTS - 1] ?? 0;
      const half =
        thickness * 0.5 * ribbon.width * smoothstep(0, thickness * 1.5, total);
      let normalX = 0;
      let normalY = 1;
      let write = offset;
      for (let i = SAMPLES - 1; i >= 0; i -= 1) {
        const prev = Math.max(i - 1, 0);
        const next = Math.min(i + 1, SAMPLES - 1);
        const dx = (sampleX[next] ?? 0) - (sampleX[prev] ?? 0);
        const dy = (sampleY[next] ?? 0) - (sampleY[prev] ?? 0);
        const len = Math.hypot(dx, dy);
        if (len > 1e-4) {
          normalX = -dy / len;
          normalY = dx / len;
        }
        const u = i / (SAMPLES - 1);
        const shaped = (1 - u) ** 1.2 * Math.sqrt(smoothstep(0, 0.1, u));
        const stroke =
          half * shaped * smoothstep(0, 1.5, sampleSpacing[i] ?? 0);
        const reach = stroke + 1.5;
        for (const side of [-1, 1]) {
          out[write] = (sampleX[i] ?? 0) + normalX * reach * side;
          out[write + 1] = (sampleY[i] ?? 0) + normalY * reach * side;
          out[write + 2] = side;
          out[write + 3] = stroke;
          out[write + 4] = reach;
          out[write + 5] = u;
          write += STRIDE;
        }
      }
      return SAMPLES * 2;
    };
    const drawWeb = (thickness: number, opacity: number) => {
      if (!renderer || !buffer || !vao) return;
      const gl = renderer;
      gl.viewport(0, 0, glCanvas.width, glCanvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      const needed = ribbons.length * SAMPLES * 2 * STRIDE;
      if (vertices.length < needed) vertices = new Float32Array(needed);
      const ranges: [number, number][] = [];
      ribbons.forEach((ribbon, index) => {
        const offset = index * SAMPLES * 2 * STRIDE;
        ranges.push([
          offset / STRIDE,
          build(ribbon, vertices, offset, thickness),
        ]);
      });
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        vertices.subarray(0, needed),
        gl.DYNAMIC_DRAW,
      );
      gl.uniform2f(uniforms.u_resolution ?? null, width, height);
      gl.uniform1f(uniforms.u_opacity ?? null, opacity);
      gl.uniform1f(uniforms.u_softness ?? null, 0.65);
      ribbons.forEach((ribbon, index) => {
        const range = ranges[index];
        if (!range || !range[1]) return;
        gl.uniform3fv(uniforms.u_color ?? null, ribbon.color);
        gl.drawArrays(gl.TRIANGLE_STRIP, range[0], range[1]);
      });
    };
    const setupWeb = () => {
      const gl = glCanvas.getContext("webgl2", {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: true,
      });
      if (!gl || gl.isContextLost()) return false;
      const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
      const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
      if (!vertex || !fragment) {
        if (vertex) gl.deleteShader(vertex);
        if (fragment) gl.deleteShader(fragment);
        return false;
      }
      const nextProgram = gl.createProgram();
      if (!nextProgram) {
        gl.deleteShader(vertex);
        gl.deleteShader(fragment);
        return false;
      }
      gl.attachShader(nextProgram, vertex);
      gl.attachShader(nextProgram, fragment);
      gl.linkProgram(nextProgram);
      gl.detachShader(nextProgram, vertex);
      gl.detachShader(nextProgram, fragment);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      if (!gl.getProgramParameter(nextProgram, gl.LINK_STATUS)) {
        gl.deleteProgram(nextProgram);
        return false;
      }
      gl.useProgram(nextProgram);
      const count = gl.getProgramParameter(
        nextProgram,
        gl.ACTIVE_UNIFORMS,
      ) as number;
      for (let i = 0; i < count; i += 1) {
        const info = gl.getActiveUniform(nextProgram, i);
        if (info)
          uniforms[info.name] = gl.getUniformLocation(nextProgram, info.name);
      }
      vao = gl.createVertexArray();
      buffer = gl.createBuffer();
      if (!vao || !buffer) {
        gl.useProgram(null);
        gl.deleteProgram(nextProgram);
        if (vao) gl.deleteVertexArray(vao);
        if (buffer) gl.deleteBuffer(buffer);
        vao = null;
        buffer = null;
        return false;
      }
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      const position = gl.getAttribLocation(nextProgram, "a_position");
      const shape = gl.getAttribLocation(nextProgram, "a_shape");
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, STRIDE * 4, 0);
      gl.enableVertexAttribArray(shape);
      gl.vertexAttribPointer(shape, 4, gl.FLOAT, false, STRIDE * 4, 8);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);
      renderer = gl;
      program = nextProgram;
      return true;
    };
    if (reduced.matches) {
      paint = glCanvas.getContext("2d");
      publishMode(paint ? "canvas" : "unavailable");
    } else if (setupWeb()) {
      publishMode("webgl");
    } else if (!renderer) {
      paint = glCanvas.getContext("2d");
      publishMode(paint ? "canvas" : "unavailable");
    } else {
      publishMode("unavailable");
    }

    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
    };
    const render = (now: number) => {
      const level = sampleLevel();
      if (activeRef.current && !reduced.matches) publishPeak(level);
      else publishPeak(0);
      resize();
      const motion = motionOf();
      const simulateNow =
        !reduced.matches &&
        (motion.engaged || motion.placed || motion.throttle > 0.02 || moving);
      let thickness = 12 + motion.throttle * 34;
      if (simulateNow) {
        const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
        last = now;
        let bank = dt;
        while (bank >= STEP) {
          thickness = simulate(STEP);
          bank -= STEP;
        }
      } else {
        last = 0;
        moving = false;
      }
      const opacity = clamp(
        (0.42 + motion.throttle * 0.5) * (1 + level * 1.4),
        0,
        1,
      );
      if (renderer) drawWeb(thickness, opacity);
      else if (paint && reduced.matches) drawStatic(paint);
      else if (paint) drawCanvas(paint, thickness);
    };
    const tick = (now: number) => {
      if (!onScreen || document.hidden) {
        frame = 0;
        if (!activeRef.current) {
          disconnectTap();
          publishPeak(0);
        }
        return;
      }
      if (activeRef.current && !reduced.matches) connectTap();
      else disconnectTap();
      render(now);
      const motion = target.current;
      const keep =
        !document.hidden &&
        onScreen &&
        !reduced.matches &&
        (activeRef.current || motion.engaged || moving);
      frame = keep ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => {
      if (frame !== 0) return;
      if (!onScreen || document.hidden) {
        render(performance.now());
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    wakeRef.current = kick;
    const onLost = (event: Event) => {
      event.preventDefault();
      renderer = null;
      publishMode(paint ? "canvas" : "unavailable");
    };
    glCanvas.addEventListener("webglcontextlost", onLost);
    reduced.addEventListener("change", kick);
    document.addEventListener("visibilitychange", kick);
    const observer = new ResizeObserver(() => {
      resize();
      if (frame === 0) render(performance.now());
    });
    observer.observe(surface);
    const visibility = new IntersectionObserver(([entry]) => {
      onScreen = Boolean(entry?.isIntersecting);
      kick();
    });
    visibility.observe(surface);
    resize();
    kick();

    return () => {
      wakeRef.current = () => {};
      stop();
      disconnectTap();
      publishPeak(0);
      observer.disconnect();
      visibility.disconnect();
      reduced.removeEventListener("change", kick);
      document.removeEventListener("visibilitychange", kick);
      glCanvas.removeEventListener("webglcontextlost", onLost);
      if (renderer) {
        renderer.useProgram(null);
        renderer.bindVertexArray(null);
        renderer.bindBuffer(renderer.ARRAY_BUFFER, null);
      }
      if (renderer && program) renderer.deleteProgram(program);
      if (renderer && buffer) renderer.deleteBuffer(buffer);
      if (renderer && vao) renderer.deleteVertexArray(vao);
    };
  }, [engine, target, wakeRef]);

  return (
    <div
      ref={root}
      className="thruster-ribbons"
      data-renderer={mode}
      aria-hidden="true"
    >
      <canvas ref={canvas} data-peak="0" />
    </div>
  );
}
