import type {
  ProbeEmission,
  ProbeReflection,
  MaterialId,
} from "../../../catalog/experiences/echo-probe/controller";

export type VisionPoint = readonly [number, number, number];
export interface VisionAim {
  x: number;
  y: number;
}
export interface VisionSurface {
  id: string;
  label: string;
  material: MaterialId;
  position: VisionPoint;
  size: VisionPoint;
  reflectivity: number;
  fade: number;
}
export const visionSurfaces: readonly VisionSurface[] = [
  {
    id: "wood",
    label: "Wood",
    material: "wood",
    position: [-2.1, 1.4, -4.5],
    size: [1.6, 2.8, 0.4],
    reflectivity: 1,
    fade: 1.15,
  },
  {
    id: "metal",
    label: "Metal",
    material: "metal",
    position: [0, 1.6, -6.5],
    size: [2.2, 2.5, 1.4],
    reflectivity: 0.95,
    fade: 1.8,
  },
  {
    id: "glass",
    label: "Glass",
    material: "glass",
    position: [2.2, 1.5, -8.4],
    size: [2.1, 3, 0.4],
    reflectivity: 1,
    fade: 1.5,
  },
  {
    id: "floor",
    label: "Wood floor",
    material: "wood",
    position: [0, 0, -4],
    size: [8, 0.1, 8],
    reflectivity: 0.5,
    fade: 0.95,
  },
  {
    id: "wall",
    label: "Far wall",
    material: "metal",
    position: [0, 1.8, -11],
    size: [8, 4, 0.1],
    reflectivity: 0.26,
    fade: 1.3,
  },
];
const tangent = Math.tan((38 * Math.PI) / 180);
const clamp = (value: number, low = 0, high = 1) =>
  Math.max(low, Math.min(high, value));
export function projectVisionPoint(
  [x, y, z]: VisionPoint,
  aspect: number,
): VisionAim {
  return {
    x: 0.5 + x / (-z * 2 * tangent),
    y: 0.5 - ((y - 1.6) * aspect) / (-z * 2 * tangent),
  };
}
export function visionReflections(aim: VisionAim, aspect: number) {
  const ray = [
    (aim.x * 2 - 1) * tangent,
    ((1 - aim.y * 2) * tangent) / aspect,
    -1,
  ];
  const length = Math.hypot(...ray);
  return visionSurfaces
    .map((surface) => {
      const [x, y, z] = surface.position;
      const distance = Math.hypot(x, y - 1.6, z);
      const angle = Math.acos(
        clamp(
          (x * ray[0] + (y - 1.6) * ray[1] + z * ray[2]) / (distance * length),
          -1,
          1,
        ),
      );
      const aperture =
        surface.id === "floor" ? 0.34 : 0.3 + surface.size[0] / (2 * distance);
      const intensity =
        Math.pow(clamp(1 - angle / aperture), 1.25) * surface.reflectivity;
      const reflection: ProbeReflection = {
        distance: clamp((distance - 2) / 11),
        pan: clamp(Math.atan2(x, -z) / ((38 * Math.PI) / 180), -1, 1),
        intensity,
        surface:
          surface.material === "wood"
            ? 0.1
            : surface.material === "glass"
              ? 0.95
              : 0.5,
        material: surface.material,
      };
      return { surface, reflection };
    })
    .filter((hit) => hit.reflection.intensity > 0.08)
    .sort((a, b) => b.reflection.intensity - a.reflection.intensity)
    .slice(0, 3)
    .sort((a, b) => a.reflection.distance - b.reflection.distance);
}

export interface VisionEmission {
  emission: ProbeEmission;
  hits: ReturnType<typeof visionReflections>;
}
/** Only sounded returns reveal geometry. A retirement cannot reveal future hits. */
export function visionRevelation(
  events: readonly VisionEmission[],
  now: number,
) {
  const levels = Object.fromEntries(
    visionSurfaces.map((surface) => [surface.id, 0]),
  );
  for (const { emission, hits } of events) {
    emission.reflections.forEach((reflection, index) => {
      const hit = hits[index];
      if (
        !hit ||
        now < reflection.at ||
        reflection.at > (emission.cancelledAt ?? Infinity)
      )
        return;
      const age = now - reflection.at;
      levels[hit.surface.id] = Math.max(
        levels[hit.surface.id],
        age < hit.surface.fade * 3 ? Math.exp(-age / hit.surface.fade) : 0,
      );
    });
  }
  return levels;
}
