"use client";

import { useEffect, useRef, useState } from "react";
import type { AudioEngine } from "audiobits";

/**
 * Charge field adapted from the free React Bits Magic Rings shader
 * (https://reactbits.dev/animations/magic-rings, MIT plus Commons Clause,
 * copyright 2026 David Haz). See apps/www/licenses/react-bits.txt.
 *
 * The published component animates itself on a clock and follows the pointer.
 * This website copy instead takes Energy Charge progress and a measured output
 * level. It does not use three.js, mouse parallax, click burst, or shader noise.
 * A missing WebGL context leaves the CSS rings in place.
 */

const vertexShader = `
attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const fragmentShader = `
precision mediump float;
uniform vec2 uResolution;
uniform float uTime;
uniform float uCharge;
uniform float uLevel;
uniform float uSpin;

void main() {
  float minDim = min(uResolution.x, uResolution.y);
  vec2 p = (gl_FragCoord.xy - 0.5 * uResolution.xy) / minDim;
  float ang = uTime * uSpin;
  float c = cos(ang);
  float s = sin(ang);
  p = mat2(c, -s, s, c) * p;

  vec3 brass = vec3(0.878, 0.722, 0.337);
  vec3 signal = vec3(0.925, 0.808, 0.510);
  vec3 color = vec3(0.0);
  float alpha = 0.0;

  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    float appear = fi == 0.0
      ? 0.72 + uCharge * 0.28
      : smoothstep(0.0, 0.14, uCharge * 7.2 - fi + 0.55);
    float radius = min(0.42, 0.275 + fi * (0.015 + uCharge * 0.016));
    float d = abs(length(p) - radius);
    float thickness = 0.0032 + uCharge * 0.002 + uLevel * 0.0055;
    float ring = exp(-pow(d / thickness, 1.28));
    float sweep = mix(
      1.0,
      0.58 + 0.42 * cos(atan(p.y, p.x) - uTime * 1.7),
      uSpin
    );
    float amount = appear * ring * sweep;
    vec3 tone = mix(brass, signal, clamp(fi / 7.0 * uCharge + uLevel * 0.5, 0.0, 1.0));
    color += tone * amount;
    alpha = max(alpha, min(amount, 1.0));
  }

  float coreRadius = 0.02 + uCharge * 0.05 + uLevel * 0.012;
  float core = exp(-pow(length(p) / max(coreRadius, 0.0001), 1.55));
  color += mix(brass, signal, clamp(uCharge + uLevel * 0.4, 0.0, 1.0)) * core;
  alpha = max(alpha, core * 0.92);
  float presence = exp(-pow(length(p) / (0.09 + uCharge * 0.46), 2.0));
  float field = presence * (0.08 + uCharge * 0.28 + uLevel * 0.1);
  color += mix(brass, signal, clamp(uCharge, 0.0, 1.0)) * field;
  alpha = max(alpha, field);

  float vignette = smoothstep(0.48, 0.2, length(p));
  float a = clamp(alpha * vignette, 0.0, 1.0);
  gl_FragColor = vec4(color * vignette * a, a);
}
`;

const narrowQuery = "(max-width: 760px)";
const reducedQuery = "(prefers-reduced-motion: reduce)";

function publishLevel(surface: HTMLDivElement, peak: number) {
  const level = peak < 0.0008 ? 0 : peak;
  const text = level === 0 ? "0" : level.toFixed(4);
  surface.dataset.level = text;
  surface.style.setProperty("--level", text);
  const canvas = surface.querySelector("canvas");
  if (canvas) canvas.dataset.peak = text;
}

export function ChargeRings({
  charge,
  progress,
  running,
  engine,
}: {
  charge: number;
  progress: { current: number };
  running: boolean;
  engine: () => AudioEngine | null;
}) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const runningRef = useRef(running);
  const kick = useRef<() => void>(() => {});
  const [mode, setMode] = useState<"css" | "webgl">("css");
  const modeRef = useRef(mode);
  function publishMode(next: "css" | "webgl") {
    if (modeRef.current === next) return;
    modeRef.current = next;
    setMode(next);
  }

  useEffect(() => {
    const surface = root.current;
    const glCanvas = canvas.current;
    if (!surface || !glCanvas) return;
    const narrow = matchMedia(narrowQuery);
    const reduced = matchMedia(reducedQuery);
    const advanced = () => !narrow.matches && !reduced.matches;

    let renderer: WebGLRenderingContext | null = null;
    let program: WebGLProgram | null = null;
    let buffer: WebGLBuffer | null = null;
    let attempted = false;
    let frame = 0;
    let time = 0;
    let last = 0;
    let onScreen = false;
    let analyser: AnalyserNode | undefined;
    let detach: (() => void) | undefined;
    let samples: Float32Array<ArrayBuffer> | undefined;
    const uniforms = {
      time: null as WebGLUniformLocation | null,
      charge: null as WebGLUniformLocation | null,
      level: null as WebGLUniformLocation | null,
      spin: null as WebGLUniformLocation | null,
      resolution: null as WebGLUniformLocation | null,
    };

    const sampleLevel = () => {
      if (!runningRef.current || reduced.matches || !analyser || !samples) {
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
      if (analyser || reduced.matches || !runningRef.current) return;
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
      detach?.();
      detach = undefined;
      analyser?.disconnect();
      analyser = undefined;
      samples = undefined;
    };
    const resize = () => {
      if (!renderer) return;
      const width = Math.max(1, glCanvas.clientWidth);
      const height = Math.max(1, glCanvas.clientHeight);
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      const pixelWidth = Math.round(width * ratio);
      const pixelHeight = Math.round(height * ratio);
      if (glCanvas.width !== pixelWidth || glCanvas.height !== pixelHeight) {
        glCanvas.width = pixelWidth;
        glCanvas.height = pixelHeight;
      }
      renderer.viewport(0, 0, glCanvas.width, glCanvas.height);
      renderer.uniform2f(uniforms.resolution, glCanvas.width, glCanvas.height);
    };
    const draw = (now: number) => {
      const level = sampleLevel();
      publishLevel(surface, runningRef.current ? level : 0);
      if (!renderer) return;
      const spinning =
        runningRef.current && !reduced.matches && !document.hidden;
      const delta = last === 0 ? 0 : Math.min(32, now - last);
      last = now;
      if (spinning) time += delta * 0.001;
      resize();
      renderer.uniform1f(uniforms.time, time);
      renderer.uniform1f(uniforms.charge, progress.current);
      renderer.uniform1f(uniforms.level, reduced.matches ? 0 : level);
      renderer.uniform1f(uniforms.spin, spinning ? 1 : 0);
      renderer.clear(renderer.COLOR_BUFFER_BIT);
      renderer.drawArrays(renderer.TRIANGLES, 0, 6);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
    };
    const tick = (now: number) => {
      if (
        document.hidden ||
        !onScreen ||
        !runningRef.current ||
        reduced.matches
      ) {
        frame = 0;
        if (!runningRef.current) disconnectTap();
        draw(now);
        return;
      }
      connectTap();
      draw(now);
      frame = requestAnimationFrame(tick);
    };
    const releaseRenderer = () => {
      if (renderer) {
        renderer.useProgram(null);
        renderer.bindBuffer(renderer.ARRAY_BUFFER, null);
        if (program) renderer.deleteProgram(program);
        if (buffer) renderer.deleteBuffer(buffer);
      }
      renderer = null;
      program = null;
      buffer = null;
    };
    const enableRenderer = () => {
      if (!advanced()) {
        publishMode("css");
        releaseRenderer();
        attempted = false;
        return;
      }
      if (renderer || attempted) return;
      attempted = true;
      const gl = glCanvas.getContext("webgl", {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: true,
      });
      if (!gl || gl.isContextLost()) return;
      const compiled = (type: number, source: string) => {
        const shader = gl.createShader(type);
        if (!shader) return null;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          gl.deleteShader(shader);
          return null;
        }
        return shader;
      };
      const vertex = compiled(gl.VERTEX_SHADER, vertexShader);
      const fragment = compiled(gl.FRAGMENT_SHADER, fragmentShader);
      if (!vertex || !fragment) {
        if (vertex) gl.deleteShader(vertex);
        if (fragment) gl.deleteShader(fragment);
        return;
      }
      program = gl.createProgram();
      if (!program) {
        gl.deleteShader(vertex);
        gl.deleteShader(fragment);
        return;
      }
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      gl.detachShader(program, vertex);
      gl.detachShader(program, fragment);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      renderer = gl;
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        releaseRenderer();
        return;
      }
      buffer = gl.createBuffer();
      if (!buffer) {
        releaseRenderer();
        return;
      }
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW,
      );
      const position = gl.getAttribLocation(program, "aPosition");
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      uniforms.time = gl.getUniformLocation(program, "uTime");
      uniforms.charge = gl.getUniformLocation(program, "uCharge");
      uniforms.level = gl.getUniformLocation(program, "uLevel");
      uniforms.spin = gl.getUniformLocation(program, "uSpin");
      uniforms.resolution = gl.getUniformLocation(program, "uResolution");
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);
      publishMode("webgl");
      resize();
    };
    const paint = () => {
      enableRenderer();
      const loop =
        onScreen && !document.hidden && runningRef.current && !reduced.matches;
      if (!runningRef.current) disconnectTap();
      if (loop) {
        if (frame === 0) frame = requestAnimationFrame(tick);
        return;
      }
      stop();
      draw(performance.now());
    };
    kick.current = paint;

    const onContextLost = (event: Event) => {
      event.preventDefault();
      releaseRenderer();
      publishMode("css");
    };
    const onContextRestored = () => {
      attempted = false;
      paint();
    };
    glCanvas.addEventListener("webglcontextlost", onContextLost);
    glCanvas.addEventListener("webglcontextrestored", onContextRestored);
    narrow.addEventListener("change", paint);
    reduced.addEventListener("change", paint);
    document.addEventListener("visibilitychange", paint);
    const observer = new ResizeObserver(resize);
    observer.observe(surface);
    const visibility = new IntersectionObserver(([entry]) => {
      onScreen = Boolean(entry?.isIntersecting);
      paint();
    });
    visibility.observe(surface);

    return () => {
      kick.current = () => {};
      stop();
      disconnectTap();
      publishLevel(surface, 0);
      observer.disconnect();
      visibility.disconnect();
      narrow.removeEventListener("change", paint);
      reduced.removeEventListener("change", paint);
      document.removeEventListener("visibilitychange", paint);
      glCanvas.removeEventListener("webglcontextlost", onContextLost);
      glCanvas.removeEventListener("webglcontextrestored", onContextRestored);
      releaseRenderer();
    };
  }, [engine, progress]);

  useEffect(() => {
    runningRef.current = running;
    kick.current();
  }, [charge, running]);

  return (
    <div
      ref={root}
      className="charge-rings"
      data-level="0"
      data-renderer={mode}
      data-running={running ? "true" : "false"}
      aria-hidden="true"
    >
      {Array.from({ length: 8 }, (_, index) => (
        <span
          key={index}
          className="charge-ring"
          style={{ "--i": index } as React.CSSProperties}
        />
      ))}
      <span className="charge-core" />
      <canvas ref={canvas} data-peak="0" />
    </div>
  );
}
