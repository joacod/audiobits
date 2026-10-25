import type { Mapping, Parameter } from "audiobits";

/** A fixed ratio of a declared parameter, resolved to ordinary recipe data. */
export function ratioMapping(
  control: string,
  parameter: Pick<Parameter, "min" | "max">,
  ratio: number,
): Mapping {
  if (!Number.isFinite(ratio) || ratio <= 0)
    throw new RangeError("Mapping ratio must be finite and positive");
  return {
    control,
    range: [parameter.min * ratio, parameter.max * ratio],
    scale: "linear",
  };
}
