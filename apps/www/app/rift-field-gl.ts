// Cinematic WebGL2 field for The Rift stage. The stage owns geometry and
// phases; this module only shades the fracture it is handed each frame.

export const RIFT_SAMPLES = 35;
const PULSES = 4;

export type RiftFieldFrame = {
  width: number;
  height: number;
  ratio: number;
  time: number;
  /** 0 when no fracture is on screen. */
  active: number;
  center: [number, number];
  axis: [number, number];
  normal: [number, number];
  half: number;
  /** Per-sample centerline offset and half-opening in CSS pixels. */
  offsets: Float32Array;
  opens: Float32Array;
  shown: number;
  tension: number;
  instability: number;
  energy: number;
  sealing: number;
  seed: number;
  /** Seconds since the implosion, or a negative value before it. */
  implosion: number;
  span: number;
  /** Up to four disturbances: position along, side, age, strength; kind 0 crackle, 1 groan, 2 echo. */
  pulses: {
    s: number;
    side: number;
    age: number;
    strength: number;
    kind: number;
  }[];
  colors: { ink: string; low: string; mid: string; high: string };
};

const VERTEX = `#version 300 es
in vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

const FRAGMENT = `#version 300 es
precision highp float;
uniform vec2 u_size;
uniform float u_ratio;
uniform float u_time;
uniform float u_active;
uniform vec2 u_center;
uniform vec2 u_axis;
uniform vec2 u_normal;
uniform float u_half;
uniform float u_offset[${RIFT_SAMPLES}];
uniform float u_open[${RIFT_SAMPLES}];
uniform float u_shown;
uniform float u_tension;
uniform float u_instability;
uniform float u_energy;
uniform float u_sealing;
uniform float u_seed;
uniform float u_implosion;
uniform float u_span;
uniform vec4 u_pulse[${PULSES}];
uniform float u_kind[${PULSES}];
uniform vec3 u_ink;
uniform vec3 u_low;
uniform vec3 u_mid;
uniform vec3 u_high;
out vec4 outColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(17.1, 9.2);
    a *= 0.5;
  }
  return v;
}
float fbm3(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(17.1, 9.2);
    a *= 0.5;
  }
  return v;
}
float sampleOffset(float s) {
  float x = clamp(s, 0.0, 1.0) * float(${RIFT_SAMPLES - 1});
  int i = int(floor(x));
  int j = min(i + 1, ${RIFT_SAMPLES - 1});
  return mix(u_offset[i], u_offset[j], x - float(i));
}
float sampleOpen(float s) {
  float x = clamp(s, 0.0, 1.0) * float(${RIFT_SAMPLES - 1});
  int i = int(floor(x));
  int j = min(i + 1, ${RIFT_SAMPLES - 1});
  return mix(u_open[i], u_open[j], x - float(i));
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, u_size.y * u_ratio - gl_FragCoord.y) / u_ratio;
  vec2 q = p - u_center;
  float r = length(q);
  float t = u_time;

  // Space bends toward the fracture: background dust is sampled pulled inward.
  float pull = u_active * u_shown * (30.0 + 70.0 * u_tension) / (1.0 + r * 0.015);
  vec2 bp = p - (q / max(r, 1.0)) * pull;
  vec3 color = vec3(0.019, 0.019, 0.027);
  float fog = fbm3(bp * 0.0045 + vec2(u_seed * 0.001, t * 0.01));
  color += u_low * fog * fog * 0.06;
  vec2 cell = floor(bp / 4.0);
  float star = step(0.994, hash(cell + 7.0))
    * smoothstep(0.5, 0.05, length(fract(bp / 4.0) - 0.5));
  float twinkle = 0.55 + 0.45 * sin(t * 1.7 + hash(cell) * 40.0);
  color += u_ink * star * twinkle * 0.3;

  if (u_active > 0.5) {
    float along = dot(q, u_axis);
    float across = dot(q, u_normal);
    float s = along / (2.0 * u_half) + 0.5;
    bool within = s >= 0.0 && s <= 1.0;
    float off = sampleOffset(s);
    float w = within ? sampleOpen(s) : 0.0;
    // Fine edge noise only matters near the opening.
    float band = abs(across - off) - w;
    float fine = within && band < 24.0
      ? (fbm3(vec2(s * 46.0 + u_seed, t * (0.35 + 2.2 * u_instability))) - 0.5)
        * (1.2 + 4.0 * u_instability) * step(0.02, w)
      : 0.0;
    float a = across - off - fine;
    float tip = max(max(-s, s - 1.0), 0.0) * 2.0 * u_half;
    float d = within ? abs(a) - w : length(vec2(tip, a));

    // Light leaking out of the other side.
    float outside = max(d, 0.0);
    float breath = 0.35 + 0.65 * u_energy;
    color += u_mid * exp(-outside / (10.0 + 36.0 * u_energy + 22.0 * u_shown)) * (0.18 + 0.55 * u_energy) * min(1.0, u_shown * 4.0 + 0.2);
    color += u_low * exp(-outside / (90.0 + 80.0 * u_shown)) * 0.12 * u_shown;

    // Interior: a deep void with filaments flowing along the tear.
    if (d < 0.0) {
      float depth = clamp(-d / max(w, 1.0), 0.0, 1.0);
      float flow = t * (0.08 + 0.5 * u_instability);
      vec2 fc = vec2(along * 0.006 - flow, a / max(w, 1.0) * 1.2);
      float neb = fbm(fc * 2.6 + u_seed * 0.01);
      float fil = pow(1.0 - abs(fbm(fc * vec2(1.3, 5.0) + vec2(flow * 2.0, 0.0)) * 2.0 - 1.0), 7.0);
      vec3 inner = vec3(0.012, 0.006, 0.03);
      inner += mix(u_low, u_mid, neb) * neb * neb * (0.25 + 0.6 * u_energy);
      inner += mix(u_mid, u_high, u_instability) * fil * (0.12 + 0.4 * u_instability);
      inner += u_ink * fil * fil * 0.12 * breath;
      inner += u_mid * exp(d / (3.0 + 7.0 * u_energy)) * 0.6;
      inner *= mix(1.0, 0.55, depth * depth);
      color = mix(color, inner, smoothstep(0.0, 1.5, -d));
    }

    // White-hot unstable rim.
    float rimWidth = 0.9 + 2.2 * u_energy + 1.6 * u_sealing + 0.8 * u_instability;
    float rim = exp(-abs(d) / rimWidth);
    vec3 rimColor = mix(mix(u_mid, u_high, clamp(u_instability * 0.8 + u_sealing, 0.0, 1.0)),
                        u_ink, 0.6 * exp(-abs(d) / (rimWidth * 0.35)));
    float flicker = 0.85 + 0.15 * noise(vec2(s * 30.0, t * 9.0)) * (0.3 + u_instability);
    color += rimColor * rim * (0.75 + 0.9 * u_energy) * flicker;

    for (int k = 0; k < ${PULSES}; k++) {
      vec4 pulse = u_pulse[k];
      if (pulse.w <= 0.0) continue;
      float fade = clamp(1.0 - pulse.z / 0.6, 0.0, 1.0);
      if (u_kind[k] < 0.5) {
        float ps = pulse.x;
        vec2 ep = u_center + u_axis * (ps - 0.5) * 2.0 * u_half
          + u_normal * (sampleOffset(ps) + pulse.y * sampleOpen(ps));
        float de = length(p - ep);
        color += u_ink * exp(-de / (4.0 + 18.0 * pulse.z)) * fade * pulse.w * 0.9;
        color += u_high * exp(-de / 36.0) * fade * pulse.w * 0.35;
      } else {
        float radius = 8.0 + pulse.z * u_span * 0.5;
        vec3 ringColor = u_kind[k] < 1.5 ? u_high : u_low;
        color += ringColor * exp(-abs(r - radius) / (2.0 + 6.0 * pulse.z)) * fade * pulse.w * 0.55;
      }
    }
  }

  // Implosion: the seal flashes, a pinch ring snaps inward, a shock ring escapes.
  if (u_implosion >= 0.0 && u_implosion < 0.9) {
    float age = u_implosion;
    float fade = 1.0 - age / 0.9;
    color += u_ink * exp(-r / (3.0 + 26.0 * fade)) * fade * 1.6;
    if (age < 0.25) {
      float inward = u_span * 0.35 * (1.0 - age / 0.25);
      color += u_mid * exp(-abs(r - inward) / 3.0) * 0.8;
    }
    float shock = age * u_span * 0.9;
    color += mix(u_mid, u_low, age) * exp(-abs(r - shock) / (4.0 + 10.0 * age)) * fade * 0.45;
  }

  color = vec3(1.0) - exp(-color * 1.35);
  outColor = vec4(color, 1.0);
}
`;

function rgb(hex: string): [number, number, number] {
  const value = /^#([0-9a-f]{6})$/i.exec(hex.trim())?.[1] ?? "b44cff";
  return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255) as [
    number,
    number,
    number,
  ];
}

export type RiftField = {
  resize(pixelWidth: number, pixelHeight: number): void;
  render(frame: RiftFieldFrame): void;
  dispose(): void;
};

/** Returns null when WebGL2 or the shader is unavailable; the stage then paints Canvas 2D. */
export function createRiftField(
  canvas: HTMLCanvasElement,
  lost: () => void,
): RiftField | null {
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
  });
  if (!gl || gl.isContextLost()) return null;
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    gl.deleteShader(shader);
    return null;
  };
  const vertex = compile(gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT);
  const program = vertex && fragment ? gl.createProgram() : null;
  if (!program || !vertex || !fragment) {
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
    return null;
  }
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.detachShader(program, vertex);
  gl.detachShader(program, fragment);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  gl.useProgram(program);
  const vao = gl.createVertexArray();
  const buffer = gl.createBuffer();
  if (!vao || !buffer) {
    gl.deleteProgram(program);
    if (vao) gl.deleteVertexArray(vao);
    if (buffer) gl.deleteBuffer(buffer);
    return null;
  }
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  // One triangle covers the viewport.
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  );
  const position = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const at = (name: string) => gl.getUniformLocation(program, name);
  const u = {
    size: at("u_size"),
    ratio: at("u_ratio"),
    time: at("u_time"),
    active: at("u_active"),
    center: at("u_center"),
    axis: at("u_axis"),
    normal: at("u_normal"),
    half: at("u_half"),
    offset: at("u_offset"),
    open: at("u_open"),
    shown: at("u_shown"),
    tension: at("u_tension"),
    instability: at("u_instability"),
    energy: at("u_energy"),
    sealing: at("u_sealing"),
    seed: at("u_seed"),
    implosion: at("u_implosion"),
    span: at("u_span"),
    pulse: at("u_pulse"),
    kind: at("u_kind"),
    ink: at("u_ink"),
    low: at("u_low"),
    mid: at("u_mid"),
    high: at("u_high"),
  };
  const pulses = new Float32Array(PULSES * 4);
  const kinds = new Float32Array(PULSES);
  let alive = true;
  const onLost = (event: Event) => {
    event.preventDefault();
    if (!alive) return;
    alive = false;
    lost();
  };
  canvas.addEventListener("webglcontextlost", onLost);
  return {
    resize(pixelWidth, pixelHeight) {
      if (!alive) return;
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      gl.viewport(0, 0, pixelWidth, pixelHeight);
    },
    render(frame) {
      if (!alive || gl.isContextLost()) return;
      gl.uniform2f(u.size, frame.width, frame.height);
      gl.uniform1f(u.ratio, frame.ratio);
      gl.uniform1f(u.time, frame.time);
      gl.uniform1f(u.active, frame.active);
      gl.uniform2f(u.center, ...frame.center);
      gl.uniform2f(u.axis, ...frame.axis);
      gl.uniform2f(u.normal, ...frame.normal);
      gl.uniform1f(u.half, Math.max(1, frame.half));
      gl.uniform1fv(u.offset, frame.offsets);
      gl.uniform1fv(u.open, frame.opens);
      gl.uniform1f(u.shown, frame.shown);
      gl.uniform1f(u.tension, frame.tension);
      gl.uniform1f(u.instability, frame.instability);
      gl.uniform1f(u.energy, frame.energy);
      gl.uniform1f(u.sealing, frame.sealing);
      gl.uniform1f(u.seed, frame.seed % 1000);
      gl.uniform1f(u.implosion, frame.implosion);
      gl.uniform1f(u.span, frame.span);
      pulses.fill(0);
      kinds.fill(0);
      frame.pulses.slice(0, PULSES).forEach((pulse, index) => {
        pulses.set([pulse.s, pulse.side, pulse.age, pulse.strength], index * 4);
        kinds[index] = pulse.kind;
      });
      gl.uniform4fv(u.pulse, pulses);
      gl.uniform1fv(u.kind, kinds);
      gl.uniform3f(u.ink, ...rgb(frame.colors.ink));
      gl.uniform3f(u.low, ...rgb(frame.colors.low));
      gl.uniform3f(u.mid, ...rgb(frame.colors.mid));
      gl.uniform3f(u.high, ...rgb(frame.colors.high));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      canvas.removeEventListener("webglcontextlost", onLost);
      if (!alive) return;
      alive = false;
      gl.useProgram(null);
      gl.bindVertexArray(null);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      gl.deleteProgram(program);
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
    },
  };
}
