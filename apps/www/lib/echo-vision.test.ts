import { expect, test } from "vitest";
import {
  projectVisionPoint,
  visionSurfaces,
  visionReflections,
  visionRevelation,
  type VisionEmission,
} from "./echo-vision";

test("aim maps fixed room geometry to material, direction and distance", () => {
  const returns = visionSurfaces.slice(0, 3).map((surface) => {
    const hits = visionReflections(
      projectVisionPoint(surface.position, 1.6),
      1.6,
    );
    const strongest = [...hits].sort(
      (a, b) => b.reflection.intensity - a.reflection.intensity,
    )[0];
    expect(strongest.surface).toBe(surface);
    expect(strongest.reflection.material).toBe(surface.material);
    return strongest.reflection;
  });
  expect(returns[0].pan).toBeLessThan(0);
  expect(returns[1].pan).toBe(0);
  expect(returns[2].pan).toBeGreaterThan(0);
  expect(returns[0].distance).toBeLessThan(returns[1].distance);
  expect(returns[1].distance).toBeLessThan(returns[2].distance);
});

test("only audible returns reveal surfaces and cancelled future returns stay dark", () => {
  const hits = visionReflections({ x: 0.5, y: 0.5 }, 1.6);
  expect(hits.length).toBeGreaterThan(1);
  const event: VisionEmission = {
    hits,
    emission: {
      at: 1,
      reflections: hits.map((hit, index) => ({
        ...hit.reflection,
        at: 2 + index,
      })),
      cancelledAt: null,
      ended: Promise.resolve(),
      stop() {},
    },
  };
  const first = hits[0].surface;
  const second = hits[1].surface;
  expect(
    Object.values(visionRevelation([event], 1.99)).every(
      (value) => value === 0,
    ),
  ).toBe(true);
  expect(visionRevelation([event], 2)[first.id]).toBe(1);
  const cancelled = {
    ...event,
    emission: { ...event.emission, cancelledAt: 2.5 },
  };
  expect(visionRevelation([cancelled], 3)[first.id]).toBeGreaterThan(0);
  expect(visionRevelation([cancelled], 3)[second.id]).toBe(0);
  expect(
    Object.values(visionRevelation([event], 20)).every((value) => value === 0),
  ).toBe(true);
});
