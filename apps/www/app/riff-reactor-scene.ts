import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Scene,
  ShaderMaterial,
  TorusGeometry,
  WebGLRenderer,
} from "three";

/** Website-only harmonic field. The stage supplies its clock and measured audio. */
export function createReactorScene(surface: HTMLElement, colors: string[]) {
  const renderer = new WebGLRenderer({ alpha: true, antialias: true });
  renderer.setClearColor(0x050507, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  const canvas = renderer.domElement;
  canvas.className = "riff-reactor-field";
  canvas.setAttribute("aria-hidden", "true");
  surface.prepend(canvas);
  // Context loss leaves the independent 2D game fully playable.
  const lost = (event: Event) => {
    event.preventDefault();
    canvas.hidden = true;
    surface.dataset.renderer = "canvas";
  };
  canvas.addEventListener("webglcontextlost", lost);
  const scene = new Scene();
  const camera = new PerspectiveCamera(45, 1, 0.1, 50);
  camera.position.z = 9;
  const reactor = new Group();
  reactor.position.y = 1.65;
  scene.add(reactor);
  const uniforms = {
    time: { value: 0 },
    energy: { value: 0 },
    low: { value: new Color(colors[0]) },
    high: { value: new Color(colors[2]) },
  };
  const coronaGeometry = new PlaneGeometry(5.5, 5.5);
  const coronaMaterial = new ShaderMaterial({
    uniforms,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    vertexShader: `varying vec2 uvField;
      void main() { uvField = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform float time;
      uniform float energy;
      uniform vec3 low;
      uniform vec3 high;
      varying vec2 uvField;
      void main() {
        vec2 p = (uvField - 0.5) * 2.0;
        float r = length(p);
        float angle = atan(p.y, p.x);
        float halo = exp(-r * r * 6.0) * (0.1 + energy * 0.22);
        float corona = exp(-abs(r - 0.3 - energy * 0.018) * 85.0);
        float filaments = pow(abs(sin(angle * 7.0 + r * 30.0 - time)), 12.0);
        float flare = filaments * exp(-abs(r - 0.33) * 18.0) * energy * 0.22;
        vec3 color = mix(low, high, sin(angle * 2.0 + time * 0.2) * 0.5 + 0.5);
        gl_FragColor = vec4(color, halo + corona * (0.22 + energy * 0.5) + flare);
      }`,
  });
  const corona = new Mesh(coronaGeometry, coronaMaterial);
  corona.position.z = -0.9;
  reactor.add(corona);
  const coreGeometry = new IcosahedronGeometry(0.68, 4);
  const coreMaterial = new ShaderMaterial({
    uniforms,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    vertexShader: `
      uniform float time;
      uniform float energy;
      varying vec3 normalView;
      varying vec3 viewDirection;
      varying float ridge;
      void main() {
        ridge = sin(position.y * 19.0 + time * 2.0) * sin(position.x * 14.0 - time);
        vec3 p = position + normal * ridge * energy * 0.1;
        vec4 view = modelViewMatrix * vec4(p, 1.0);
        normalView = normalize(normalMatrix * normal);
        viewDirection = normalize(-view.xyz);
        gl_Position = projectionMatrix * view;
      }`,
    fragmentShader: `
      uniform float energy;
      uniform vec3 low;
      uniform vec3 high;
      varying vec3 normalView;
      varying vec3 viewDirection;
      varying float ridge;
      void main() {
        float rim = pow(1.0 - abs(dot(normalize(normalView), normalize(viewDirection))), 2.0);
        float striation = smoothstep(0.55, 0.95, ridge) * (0.1 + energy * 0.7);
        vec3 color = mix(low, high, rim) + vec3(0.65) * pow(rim, 5.0);
        gl_FragColor = vec4(color * (0.18 + rim * 1.6 + striation), 0.85);
      }`,
  });
  const core = new Mesh(coreGeometry, coreMaterial);
  reactor.add(core);
  const cageGeometry = new IcosahedronGeometry(0.83, 1);
  const cageMaterial = new MeshBasicMaterial({
    color: colors[1],
    wireframe: true,
    transparent: true,
    opacity: 0.24,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  const cage = new Mesh(cageGeometry, cageMaterial);
  reactor.add(cage);
  const ringGeometry = new TorusGeometry(1.18, 0.012, 6, 160);
  const ringMaterials = colors.map(
    (color) =>
      new MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.65,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
  );
  const rings = ringMaterials.map((material, index) => {
    const ring = new Mesh(ringGeometry, material);
    ring.scale.setScalar(1 + index * 0.24);
    reactor.add(ring);
    return ring;
  });
  // Fixed particle storage, with no per-frame spawning.
  const positions = new Float32Array(320 * 3);
  for (let i = 0; i < 320; i++) {
    const angle = i * 2.399963;
    const radius = 2.2 + ((i * 37) % 101) / 20;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = Math.sin(angle) * radius;
    positions[i * 3 + 2] = -((i * 17) % 90) / 10;
  }
  const dustGeometry = new BufferGeometry();
  dustGeometry.setAttribute("position", new BufferAttribute(positions, 3));
  const dustMaterial = new PointsMaterial({
    color: colors[1],
    size: 0.022,
    transparent: true,
    opacity: 0.42,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  const dust = new Points(dustGeometry, dustMaterial);
  scene.add(dust);
  let energy = 0;
  let disposed = false;
  return {
    resize(width: number, height: number) {
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
      // Keep the instrument at the highway's vanishing point on narrow screens.
      reactor.scale.setScalar(Math.min(1, camera.aspect / 1.2));
    },
    draw(
      beat: number,
      level: number,
      bass: number,
      treble: number,
      still: boolean,
    ) {
      if (disposed || canvas.hidden) return;
      const resting = still || beat < 0;
      energy = resting ? 0 : energy + (Math.min(1, level * 5) - energy) * 0.18;
      const time = resting ? 0 : Math.max(0, beat) * 0.35;
      uniforms.time.value = time;
      uniforms.energy.value = energy;
      core.scale.setScalar(1 + energy * 0.12);
      cage.rotation.set(time * 0.14, time * 0.2, 0.2);
      cageMaterial.opacity = 0.24 + energy * 0.36;
      rings.forEach((ring, index) => {
        ring.rotation.set(
          0.8 + index * 0.65 + Math.sin(time * 0.18) * 0.2,
          time * (index % 2 ? -0.13 : 0.16) + index,
          time * 0.08 + index,
        );
        ringMaterials[index].opacity = 0.4 + energy * 0.5;
        ring.scale.setScalar(
          (1 + index * 0.24) * (1 + (resting ? 0 : bass) * 0.12),
        );
      });
      dust.rotation.z = time * 0.015;
      dustMaterial.opacity = 0.32 + (resting ? 0 : treble) * 0.4;
      renderer.render(scene, camera);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      canvas.removeEventListener("webglcontextlost", lost);
      coronaGeometry.dispose();
      coronaMaterial.dispose();
      coreGeometry.dispose();
      coreMaterial.dispose();
      cageGeometry.dispose();
      cageMaterial.dispose();
      ringGeometry.dispose();
      ringMaterials.forEach((material) => material.dispose());
      dustGeometry.dispose();
      dustMaterial.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
