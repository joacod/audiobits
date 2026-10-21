import * as THREE from "three";
import { visionSurfaces, type VisionAim } from "../lib/echo-vision";

/** Fixed viewpoint, bounded procedural surfaces. All visibility comes from return times. */
export function createEchoVisionRoom(
  canvas: HTMLCanvasElement,
  surface: HTMLElement,
) {
  const style = getComputedStyle(surface);
  const color = (name: string, fallback: string) =>
    style.getPropertyValue(name).trim() || fallback;
  const palette = {
    wood: color("--signal-mid", "#b44cff"),
    metal: color("--signal-low", "#2a6cff"),
    glass: color("--signal-high", "#ff2e88"),
  };
  const ground = color("--void", "#050507");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  const world = new THREE.Scene();
  world.background = new THREE.Color(ground);
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 30);
  camera.position.set(0, 1.6, 0);
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const geometry = <T extends THREE.BufferGeometry>(value: T) => {
    geometries.add(value);
    return value;
  };
  const material = <T extends THREE.Material>(value: T) => {
    materials.add(value);
    return value;
  };
  let disposed = false;
  try {
    const surfaces = visionSurfaces.map((value) => {
      const group = new THREE.Group();
      group.position.set(...value.position);
      world.add(group);
      const line = material(
        new THREE.LineBasicMaterial({
          color: palette[value.material],
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      const dots = material(
        new THREE.PointsMaterial({
          color: palette[value.material],
          size: 0.035,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      const points: number[] = [];
      const addEdges = (shape: THREE.BufferGeometry, x = 0, y = 0, z = 0) => {
        const mesh = new THREE.LineSegments(
          geometry(new THREE.EdgesGeometry(geometry(shape))),
          line,
        );
        mesh.position.set(x, y, z);
        group.add(mesh);
      };
      if (value.id === "wood") {
        for (let i = 0; i < 11; i++) {
          const x = (i - 5) * 0.16;
          addEdges(
            new THREE.BoxGeometry(0.075, value.size[1], 0.28),
            x,
            0,
            Math.sin(i * 0.5) * 0.13,
          );
          for (let y = -1.35; y <= 1.35; y += 0.08) points.push(x, y, 0.16);
        }
        for (const y of [-1.1, 1.1])
          addEdges(new THREE.BoxGeometry(1.7, 0.06, 0.34), 0, y, 0);
      } else if (value.id === "metal") {
        for (let i = 0; i < 5; i++) {
          const radius = 0.6 + i * 0.1;
          const ring = new THREE.LineLoop(
            geometry(
              new THREE.BufferGeometry().setFromPoints(
                Array.from({ length: 96 }, (_, index) => {
                  const a = (index / 96) * Math.PI * 2;
                  return new THREE.Vector3(
                    Math.cos(a) * radius,
                    Math.sin(a) * radius,
                    0,
                  );
                }),
              ),
            ),
            line,
          );
          ring.rotation.set(i * 0.27, i * 0.4, i * 0.12);
          group.add(ring);
        }
        addEdges(new THREE.CylinderGeometry(0.12, 0.22, 2.4, 12), 0, -0.4, 0);
        for (let i = 0; i < 360; i++) {
          const a = (i / 360) * Math.PI * 2;
          points.push(Math.cos(a), Math.sin(a), Math.sin(a * 3) * 0.32);
        }
      } else if (value.id === "glass") {
        for (let i = 0; i < 5; i++) {
          const arch: THREE.Vector3[] = [new THREE.Vector3(-1, -1.5, i * 0.18)];
          for (let j = 0; j <= 48; j++) {
            const a = Math.PI - (j / 48) * Math.PI;
            arch.push(
              new THREE.Vector3(Math.cos(a), Math.sin(a) + 0.5, i * 0.18),
            );
          }
          arch.push(new THREE.Vector3(1, -1.5, i * 0.18));
          group.add(
            new THREE.Line(
              geometry(new THREE.BufferGeometry().setFromPoints(arch)),
              line,
            ),
          );
        }
        for (let x = -0.95; x <= 0.95; x += 0.1)
          for (let y = -1.4; y <= 0.5 + Math.sqrt(1 - x * x); y += 0.1)
            points.push(x, y, 0.36);
      } else if (value.id === "floor") {
        for (let z = -7; z <= 1.8; z += 0.35) {
          group.add(
            new THREE.Line(
              geometry(
                new THREE.BufferGeometry().setFromPoints([
                  new THREE.Vector3(-4, 0, z),
                  new THREE.Vector3(4, 0, z),
                ]),
              ),
              line,
            ),
          );
          for (let x = -4; x <= 4; x += 0.3) points.push(x, 0, z);
        }
        for (let x = -4; x <= 4; x += 0.7)
          group.add(
            new THREE.Line(
              geometry(
                new THREE.BufferGeometry().setFromPoints([
                  new THREE.Vector3(x, 0, -7),
                  new THREE.Vector3(x, 0, 1.8),
                ]),
              ),
              line,
            ),
          );
      } else {
        addEdges(new THREE.BoxGeometry(8, 4, 0.1));
        for (let x = -4; x <= 4; x += 1)
          addEdges(new THREE.BoxGeometry(0.02, 4, 0.1), x, 0, 0.06);
        for (let x = -4; x <= 4; x += 0.22)
          for (let y = -1.8; y <= 2; y += 0.22) points.push(x, y, 0.08);
      }
      group.add(
        new THREE.Points(
          geometry(
            new THREE.BufferGeometry().setAttribute(
              "position",
              new THREE.Float32BufferAttribute(points, 3),
            ),
          ),
          dots,
        ),
      );
      return { id: value.id, group, line, dots };
    });
    const waveMaterial = material(
      new THREE.LineBasicMaterial({
        color: color("--ink", "#f2f2f2"),
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    const wave = new THREE.LineLoop(
      geometry(
        new THREE.BufferGeometry().setFromPoints(
          Array.from(
            { length: 96 },
            (_, i) =>
              new THREE.Vector3(
                Math.cos((i / 96) * Math.PI * 2),
                Math.sin((i / 96) * Math.PI * 2),
                0,
              ),
          ),
        ),
      ),
      waveMaterial,
    );
    world.add(wave);
    let failed = false;
    renderer.debug.onShaderError = () => {
      failed = true;
    };
    return {
      resize(width: number, height: number) {
        camera.aspect = width / height;
        camera.fov =
          (2 *
            Math.atan(Math.tan((38 * Math.PI) / 180) / camera.aspect) *
            180) /
          Math.PI;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
      },
      render(
        levels: Readonly<Record<string, number>>,
        pulseAge: number,
        aim: VisionAim,
        reduced: boolean,
      ) {
        for (const value of surfaces) {
          const level = levels[value.id] ?? 0;
          value.group.visible = level > 0.001;
          value.line.opacity = level * 0.9;
          value.dots.opacity = level * 0.65;
        }
        // This wave travels through empty space. It never lights a surface early.
        wave.visible = !reduced && pulseAge >= 0 && pulseAge < 0.75;
        if (wave.visible) {
          const distance = 1 + pulseAge * 15;
          wave.position.set(
            (aim.x - 0.5) * distance * 1.56,
            1.6 + ((0.5 - aim.y) * distance * 1.56) / camera.aspect,
            -distance,
          );
          wave.scale.setScalar(0.1 + pulseAge * 1.6);
          waveMaterial.opacity = 0.24 * (1 - pulseAge / 0.75);
        }
        renderer.render(world, camera);
        if (failed) throw new Error("The echo renderer could not compile");
        surface.dataset.renderer = "three";
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        geometries.forEach((value) => value.dispose());
        materials.forEach((value) => value.dispose());
        renderer.dispose();
        renderer.forceContextLoss();
      },
    };
  } catch (cause) {
    geometries.forEach((value) => value.dispose());
    materials.forEach((value) => value.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
    throw cause;
  }
}
