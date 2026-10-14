import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { Point } from "../../../catalog/experiences/lightsaber/motion";
import { readSignalPalette } from "../lib/signal-palette";

interface BladeFrame {
  base: Point;
  tip: Point;
  angle: number;
  extension: number;
  peak: number;
  motion: number;
  elapsed: number;
  reduced: boolean;
  targets: Point[];
  destroyed: boolean[];
  flashes: number[];
  trails: { base: Point; tip: Point; life: number }[];
  particles: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    total: number;
  }[];
}

/** Website-owned scene. Screen-plane coordinates keep the visible blade and hit tests aligned. */
export function createBladeScene(
  canvas: HTMLCanvasElement,
  surface: HTMLElement,
) {
  const palette = readSignalPalette(canvas);
  const violet = new THREE.Color().setRGB(...palette.mid, THREE.SRGBColorSpace);
  const blue = new THREE.Color().setRGB(...palette.low, THREE.SRGBColorSpace);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  let shaderFailed = false;
  // Report after Three has registered its program so failure cleanup can release it.
  renderer.debug.onShaderError = () => {
    shaderFailed = true;
  };
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#08080c");
  const fog = new THREE.Fog("#08080c", 1200, 3000);
  scene.fog = fog;
  const camera = new THREE.PerspectiveCamera(35, 1, 1, 4000);
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  let environment: THREE.WebGLRenderTarget | undefined;
  let composer: EffectComposer | undefined;
  let bloom: UnrealBloomPass | undefined;
  let output: OutputPass | undefined;
  let disposed = false;
  function geometry<T extends THREE.BufferGeometry>(value: T): T {
    geometries.add(value);
    return value;
  }
  function material<T extends THREE.Material>(value: T): T {
    materials.add(value);
    return value;
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const value of geometries) value.dispose();
    for (const value of materials) value.dispose();
    environment?.dispose();
    bloom?.dispose();
    output?.dispose();
    composer?.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    surface.dataset.renderer = "disposed";
  }
  try {
    const room = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    try {
      // Broad metal highlights need only a small reflection map, including on mobile GPUs.
      environment = pmrem.fromScene(room, 0.04, 0.1, 100, { size: 64 });
      scene.environment = environment.texture;
      scene.environmentIntensity = 0.7;
    } finally {
      room.dispose();
      pmrem.dispose();
    }
    if (shaderFailed) throw new Error("Blade shaders could not compile");
    const silver = material(
      new THREE.MeshStandardMaterial({
        color: "#b1b7c5",
        metalness: 0.94,
        roughness: 0.24,
      }),
    );
    const darkMetal = material(
      new THREE.MeshStandardMaterial({
        color: "#20242e",
        metalness: 0.85,
        roughness: 0.36,
      }),
    );
    const grip = material(
      new THREE.MeshStandardMaterial({
        color: "#101218",
        metalness: 0.25,
        roughness: 0.78,
      }),
    );
    const brass = material(
      new THREE.MeshStandardMaterial({
        color: "#b48b50",
        metalness: 0.8,
        roughness: 0.3,
      }),
    );
    const emitterMaterial = material(
      new THREE.MeshStandardMaterial({
        color: "#333344",
        emissive: violet,
        emissiveIntensity: 0,
        metalness: 0.7,
        roughness: 0.2,
      }),
    );
    const saber = new THREE.Group();
    const hilt = new THREE.Group();
    saber.add(hilt);
    scene.add(saber);
    // Recessed grip, turned collars, cooling fins, pommel and a raised activation switch.
    function cylinder(
      radius: number,
      length: number,
      y: number,
      surface: THREE.Material,
      top = radius,
    ) {
      const mesh = new THREE.Mesh(
        geometry(new THREE.CylinderGeometry(top, radius, length, 48)),
        surface,
      );
      mesh.position.y = y;
      hilt.add(mesh);
      return mesh;
    }
    cylinder(10.5, 79, -45, silver);
    cylinder(10.9, 49, -51, grip);
    for (let i = 0; i < 8; i++) cylinder(11.7, 2.4, -29 - i * 6, darkMetal);
    cylinder(12.5, 8, -88, silver, 11.2);
    cylinder(9.8, 3, -93, darkMetal);
    cylinder(12.8, 4, -22, brass);
    cylinder(11, 12, -13, darkMetal);
    for (let i = 0; i < 3; i++) cylinder(13, 2, -8 - i * 4, silver);
    cylinder(14.5, 10, -2, silver, 12.5);
    cylinder(8.5, 3, 4, emitterMaterial);
    const switchMount = new THREE.Mesh(
      geometry(new THREE.BoxGeometry(9, 12, 4)),
      darkMetal,
    );
    switchMount.position.set(0, -22, 11);
    hilt.add(switchMount);
    const switchLight = new THREE.Mesh(
      geometry(new THREE.CylinderGeometry(3, 3, 2, 24)),
      emitterMaterial,
    );
    switchLight.rotation.x = Math.PI / 2;
    switchLight.position.set(0, -21, 14);
    hilt.add(switchLight);
    const blade = new THREE.Group();
    const bladeGeometry = geometry(new THREE.CapsuleGeometry(1, 64, 8, 24));
    const coreMaterial = material(
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(2.5, 2, 3),
        fog: false,
      }),
    );
    const sheathMaterial = material(
      new THREE.MeshBasicMaterial({
        color: violet.clone().multiplyScalar(2.8),
        transparent: true,
        opacity: 0.65,
        fog: false,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    const core = new THREE.Mesh(bladeGeometry, coreMaterial);
    const sheath = new THREE.Mesh(bladeGeometry, sheathMaterial);
    blade.add(sheath, core);
    saber.add(blade);
    const bladeLight = new THREE.PointLight(violet, 0, 700, 1.5);
    scene.add(bladeLight);
    const key = new THREE.DirectionalLight("#d3ddeb", 1.8);
    key.position.set(-200, 300, 400);
    scene.add(key);
    const rim = new THREE.DirectionalLight("#7788af", 2);
    rim.position.set(200, 100, -100);
    scene.add(rim, new THREE.HemisphereLight("#99a8c4", "#08080c", 0.45));

    const floor = new THREE.Mesh(
      geometry(new THREE.PlaneGeometry(20000, 20000)),
      material(
        new THREE.MeshStandardMaterial({
          color: "#0b0e14",
          metalness: 0.2,
          roughness: 0.85,
          envMapIntensity: 0.15,
        }),
      ),
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    const platform = new THREE.Mesh(
      geometry(new THREE.CylinderGeometry(1, 1, 7, 96)),
      darkMetal,
    );
    scene.add(platform);
    const platformRing = new THREE.Mesh(
      geometry(new THREE.TorusGeometry(1, 0.003, 8, 96)),
      silver,
    );
    platformRing.rotation.x = -Math.PI / 2;
    scene.add(platformRing);
    const targetGeometry = geometry(new THREE.IcosahedronGeometry(15, 1));
    const targets = Array.from({ length: 2 }, () => {
      const group = new THREE.Group();
      const surface = material(
        new THREE.MeshStandardMaterial({
          color: "#4a3b2b",
          metalness: 0.75,
          roughness: 0.3,
          emissive: "#e7a75a",
          emissiveIntensity: 0.12,
          flatShading: true,
        }),
      );
      const body = new THREE.Mesh(targetGeometry, surface);
      group.add(body);
      scene.add(group);
      return { group, body, surface };
    });

    // Fixed buffers bound allocations; only the coordinates change while swinging.
    const trailPositions = new Float32Array(16 * 18);
    const trailGeometry = geometry(new THREE.BufferGeometry());
    trailGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(trailPositions, 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    const trailMaterial = material(
      new THREE.MeshBasicMaterial({
        color: violet,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    const ribbon = new THREE.Mesh(trailGeometry, trailMaterial);
    ribbon.frustumCulled = false;
    scene.add(ribbon);
    const sparkPositions = new Float32Array(140 * 6);
    const sparkColors = new Float32Array(140 * 6);
    const sparkGeometry = geometry(new THREE.BufferGeometry());
    sparkGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(sparkPositions, 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    sparkGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(sparkColors, 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    const sparks = new THREE.LineSegments(
      sparkGeometry,
      material(
        new THREE.LineBasicMaterial({
          vertexColors: true,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      ),
    );
    sparks.frustumCulled = false;
    scene.add(sparks);
    composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.45, 0.25, 1.4);
    output = new OutputPass();
    composer.addPass(renderPass);
    composer.addPass(bloom);
    composer.addPass(output);
    let width = 1,
      height = 1;
    function place(object: THREE.Object3D, point: Point, z = 0) {
      object.position.set(point.x - width / 2, height / 2 - point.y, z);
    }
    return {
      resize(w: number, h: number) {
        width = w;
        height = h;
        camera.aspect = width / height;
        camera.position.z =
          height / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        camera.updateProjectionMatrix();
        fog.near = camera.position.z + 200;
        fog.far = camera.position.z + 1800;
        renderer.setSize(width, height, false);
        composer!.setSize(width, height);
        floor.position.y = -height * 0.48;
        platform.position.set(0, floor.position.y + 2, -40);
        const radius = Math.min(width * 0.34, 270);
        platform.scale.set(radius, 1, radius);
        platformRing.position.set(0, floor.position.y + 6, -40);
        platformRing.scale.setScalar(radius * 0.94);
      },
      render(value: BladeFrame) {
        if (disposed) return;
        place(saber, value.base);
        saber.rotation.z = -value.angle;
        // The hilt rolls to reveal its curved surfaces; the blade axis stays on the hit plane.
        hilt.rotation.y = 0.4 + value.angle * 0.8;
        const length = Math.hypot(
          value.tip.x - value.base.x,
          value.tip.y - value.base.y,
        );
        blade.visible = length > 0.1;
        const radius = 2.8 + (value.reduced ? 0 : Math.min(value.peak * 5, 1));
        core.scale.set(radius, Math.max(0.001, length / 66), radius);
        sheath.scale.set(radius * 2, Math.max(0.001, length / 66), radius * 2);
        core.position.y = sheath.position.y = length / 2;
        emitterMaterial.emissiveIntensity = value.extension * 1.8;
        place(
          bladeLight,
          {
            x: (value.base.x + value.tip.x) / 2,
            y: (value.base.y + value.tip.y) / 2,
          },
          30,
        );
        bladeLight.intensity =
          value.extension * (2800 + (value.reduced ? 0 : value.peak * 9000));
        bloom!.strength =
          0.45 + (value.reduced ? 0 : Math.min(value.peak, 0.15));
        sheathMaterial.color
          .copy(violet)
          .lerp(blue, value.motion * 0.3)
          .multiplyScalar(2.8);
        for (let i = 0; i < targets.length; i++) {
          const target = targets[i];
          target.group.visible = !value.destroyed[i];
          place(target.group, value.targets[i]);
          target.surface.emissiveIntensity = 0.12 + value.flashes[i] * 3;
          target.group.scale.setScalar(
            1 + (value.reduced ? 0 : value.flashes[i] * 0.18),
          );
          if (!value.reduced) {
            target.body.rotation.set(
              value.elapsed / 4000,
              value.elapsed / 3000 + i * 2,
              0.2,
            );
          }
        }
        surface.dataset.targetsRemaining = String(
          targets.filter((target) => target.group.visible).length,
        );
        let count = 0;
        if (!value.reduced)
          for (let i = 1; i < value.trails.length; i++) {
            const a = value.trails[i - 1],
              b = value.trails[i];
            for (const point of [a.base, a.tip, b.tip, a.base, b.tip, b.base]) {
              trailPositions[count++] = point.x - width / 2;
              trailPositions[count++] = height / 2 - point.y;
              trailPositions[count++] = -2;
            }
          }
        trailGeometry.setDrawRange(0, count / 3);
        trailGeometry.attributes.position.needsUpdate = true;
        let sparkCount = 0;
        if (!value.reduced)
          for (const particle of value.particles) {
            const fade = particle.life / particle.total;
            for (let end = 0; end < 2; end++) {
              const offset = sparkCount++ * 3;
              sparkPositions[offset] =
                particle.x - width / 2 - (end ? particle.vx * 0.015 : 0);
              sparkPositions[offset + 1] =
                height / 2 - particle.y + (end ? particle.vy * 0.015 : 0);
              sparkPositions[offset + 2] = 2;
              sparkColors[offset] = 3 * fade;
              sparkColors[offset + 1] = 1.5 * fade;
              sparkColors[offset + 2] = 0.4 * fade;
            }
          }
        sparkGeometry.setDrawRange(0, sparkCount);
        sparkGeometry.attributes.position.needsUpdate = true;
        sparkGeometry.attributes.color.needsUpdate = true;
        composer!.render();
        if (shaderFailed) throw new Error("Blade shaders could not compile");
        surface.dataset.renderer = "three";
      },
      dispose,
    };
  } catch (cause) {
    dispose();
    throw cause;
  }
}
