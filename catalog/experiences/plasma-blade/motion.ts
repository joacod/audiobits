/** CSS-pixel velocity, independent of device pixel ratio. Times are milliseconds. */
export function motionLevel(speed: number) {
  return Number.isFinite(speed) ? Math.min(1, Math.max(0, speed) / 1800) : 0;
}
export function smoothMotion(
  previous: number,
  target: number,
  elapsed: number,
) {
  const dt = Math.min(64, Math.max(0, Number.isFinite(elapsed) ? elapsed : 0));
  const tau = target > previous ? 35 : 140;
  return previous + (target - previous) * (1 - Math.exp(-dt / tau));
}
export type Point = { x: number; y: number };
export function segmentDistance(point: Point, a: Point, b: Point) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const length = dx * dx + dy * dy;
  const t =
    length === 0
      ? 0
      : Math.max(
          0,
          Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / length),
        );
  return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy);
}
