/** Values are computed from owned linear schedules, never sampled mid-ramp. */
export interface LinearRamp {
  start: number;
  end: number;
  from: number;
  to: number;
  before?: number;
}
export function linearValue(
  ramp: LinearRamp | undefined,
  time: number,
  initial: number,
): number {
  if (!ramp) return initial;
  if (time < ramp.start) return ramp.before ?? ramp.from;
  const t =
    ramp.end <= ramp.start
      ? 1
      : Math.min(1, (time - ramp.start) / (ramp.end - ramp.start));
  return ramp.from + (ramp.to - ramp.from) * t;
}
export function holdLinear(
  param: AudioParam,
  time: number,
  value: number,
): void {
  if (typeof param.cancelAndHoldAtTime === "function") {
    param.cancelAndHoldAtTime(time);
    param.setValueAtTime(value, time);
  } else {
    // Reinsert the truncated linear endpoint so cancellation preserves the
    // preceding ramp as well as the held value. All managed retargets are linear.
    param.cancelScheduledValues(time);
    param.linearRampToValueAtTime(value, time);
  }
}
