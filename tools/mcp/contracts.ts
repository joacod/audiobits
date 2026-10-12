import { z } from "zod";

export const stringList = z.array(z.string());
export const capabilitiesContract = z.looseObject({
  packageVersion: z.string().min(1),
  schemaVersion: z.number().int().positive(),
  recipe: z.record(z.string(), stringList),
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
