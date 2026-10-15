import { z } from "zod";

export const stringList = z.array(z.string());
// Capability groups stay string lists. Structured entries, such as delay
// bounds, are metadata and are not membership-tested.
export const recipeCapability = z.union([
  stringList,
  z.record(z.string(), z.unknown()),
]);
export const capabilitiesContract = z.looseObject({
  packageVersion: z.string().min(1),
  schemaVersion: z.number().int().positive(),
  recipe: z.record(z.string(), recipeCapability),
  runtime: stringList,
  browserGate: z.string(),
  schemaNote: z.string(),
});
export type Capabilities = z.infer<typeof capabilitiesContract>;

export const validationContract = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), recipe: z.unknown() }),
  z.object({
    ok: z.literal(false),
    issues: z
      .array(
        z.object({ code: z.string(), path: z.string(), message: z.string() }),
      )
      .max(100),
  }),
]);

export interface RuntimeInfo {
  projectPath: string;
  packagePath: string;
  version: string;
  schema: Record<string, unknown>;
  capabilities: Capabilities;
}

export interface RuntimeRequest {
  projectPath: string;
  operation: "inspect" | "validate";
  recipe?: unknown;
}

export interface RuntimeResponse {
  runtime: RuntimeInfo;
  validation?: z.infer<typeof validationContract>;
}
