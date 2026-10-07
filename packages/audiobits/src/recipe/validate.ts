import { recipeSchema } from "./generated";
import type { Recipe } from "./generated";

export interface RecipeIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}
export type ValidationResult =
  | { readonly ok: true; readonly recipe: Recipe }
  | { readonly ok: false; readonly issues: readonly RecipeIssue[] };
interface Shape {
  $ref?: string;
  const?: unknown;
  enum?: unknown[];
  anyOf?: Shape[];
  type?: string;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  prefixItems?: Shape[];
  items?: Shape;
  properties?: Record<string, Shape>;
  required?: string[];
}
const schema = recipeSchema as unknown as { $defs: Record<string, Shape> };

export function validateRecipe(input: unknown): ValidationResult {
  const issues: RecipeIssue[] = [];
  const add = (code: string, path: string, message: string) => {
    if (issues.length < 100) issues.push({ code, path, message });
  };
  let visited = 0;
  let exhausted = false;
  const ancestors = new Set<object>();
  // Inspect JavaScript data before schema traversal or cloning. Accessors are rejected.
  function inspect(value: unknown, path: string, depth: number): void {
    if (exhausted) return;
    if (++visited > 10000 || depth > 16) {
      exhausted = true;
      add(
        "resource-limit",
        path,
        "Input exceeds depth 16 or 10000 visited values.",
      );
      return;
    }
    if (typeof value === "number" && !Number.isFinite(value))
      add("non-finite", path, "Expected a finite number.");
    else if (value !== null && typeof value === "object") {
      if (ancestors.has(value)) {
        add("cycle", path, "Cyclic data is not JSON.");
        return;
      }
      if (
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) !== Object.prototype &&
        Object.getPrototypeOf(value) !== null
      ) {
        add("type", path, "Expected a plain JSON object.");
        return;
      }
      ancestors.add(value);
      if (Reflect.ownKeys(value).length > 10000 - visited) {
        exhausted = true;
        add("resource-limit", path, "Input exceeds 10000 visited values.");
      } else
        for (const key of Reflect.ownKeys(value)) {
          if (Array.isArray(value) && key === "length") continue;
          if (
            Array.isArray(value) &&
            (typeof key !== "string" || !/^(0|[1-9][0-9]*)$/.test(key))
          ) {
            add("type", path, "Arrays may contain only indexed JSON values.");
            continue;
          }
          const field = `${path}[${JSON.stringify(String(key))}]`;
          const property = Object.getOwnPropertyDescriptor(value, key)!;
          if (
            typeof key === "symbol" ||
            !property.enumerable ||
            !("value" in property)
          )
            add(
              "type",
              field,
              "Only enumerable JSON data properties are supported.",
            );
          else inspect(property.value, field, depth + 1);
          if (exhausted || issues.length === 100) break;
        }
      ancestors.delete(value);
    } else if (
      value === undefined ||
      typeof value === "function" ||
      typeof value === "symbol" ||
      typeof value === "bigint"
    )
      add("type", path, "Expected JSON data.");
  }
  inspect(input, "$", 0);
  if (issues.length) return { ok: false, issues };
  function check(value: unknown, node: Shape, path: string): void {
    if (issues.length === 100) return;
    if (node.$ref)
      return check(value, schema.$defs[node.$ref.split("/").at(-1)!], path);
    if (node.anyOf) {
      const candidate =
        typeof value === "number" ? node.anyOf[0] : node.anyOf[1];
      return check(value, candidate, path);
    }
    if ("const" in node && value !== node.const) {
      add(
        path === '$["schemaVersion"]' ? "version" : "unsupported",
        path,
        `Expected ${JSON.stringify(node.const)}.`,
      );
      return;
    }
    if (node.enum && !node.enum.includes(value)) {
      add("unsupported", path, `Expected one of ${node.enum.join(", ")}.`);
      return;
    }
    if (node.type === "number") {
      if (typeof value !== "number") add("type", path, "Expected a number.");
      else if (
        value < node.minimum! ||
        value > node.maximum! ||
        (node.exclusiveMinimum !== undefined && value <= node.exclusiveMinimum)
      )
        add("range", path, "Number is outside the supported range.");
    } else if (node.type === "string") {
      if (typeof value !== "string") add("type", path, "Expected a string.");
      else if (value.length < node.minLength! || value.length > node.maxLength!)
        add("range", path, "String length is outside the supported range.");
    } else if (node.type === "array") {
      if (!Array.isArray(value)) {
        add("type", path, "Expected an array.");
        return;
      }
      if (value.length < node.minItems! || value.length > node.maxItems!)
        add(
          "resource-limit",
          path,
          "Array length is outside the supported bound.",
        );
      // A sparse array cannot be normalized as JSON without changing its meaning.
      for (let i = 0; i < Math.min(value.length, node.maxItems!); i++) {
        if (!(i in value)) add("type", `${path}[${i}]`, "Missing array value.");
        else
          check(
            value[i],
            node.prefixItems?.[i] ?? node.items!,
            `${path}[${i}]`,
          );
      }
    } else if (node.type === "object") {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        add("type", path, "Expected an object.");
        return;
      }
      const record = value as Record<string, unknown>;
      for (const key of node.required!)
        if (!Object.hasOwn(record, key))
          add(
            "required",
            `${path}[${JSON.stringify(key)}]`,
            "Required field is missing.",
          );
      for (const key of Object.keys(record).sort()) {
        const child = node.properties![key];
        if (!Object.hasOwn(node.properties!, key))
          add(
            "unknown-field",
            `${path}[${JSON.stringify(key)}]`,
            "Field is not supported in this schema subset.",
          );
        else check(record[key], child, `${path}[${JSON.stringify(key)}]`);
      }
    }
  }
  check(input, schema.$defs.Recipe, "$");
  if (issues.length) return { ok: false, issues };
  const recipe = input as Recipe;
  const ids = new Set<string>();
  let effects = recipe.effects?.length ?? 0;
  let points = 0;
  recipe.layers.forEach((layer, i) => {
    const path = `$["layers"][${i}]`;
    if (ids.has(layer.id))
      add("duplicate", `${path}["id"]`, "Layer identifiers must be unique.");
    ids.add(layer.id);
    effects += layer.effects?.length ?? 0;
    if (
      Math.max(0.002, layer.envelope.attack) + layer.envelope.decay >
      recipe.duration
    )
      add(
        "timeline",
        `${path}["envelope"]`,
        "Effective attack plus decay exceeds gate duration.",
      );
    const frequency = layer.source.frequency;
    if (typeof frequency !== "number") {
      points += frequency.points.length;
      let previous = -1;
      frequency.points.forEach(([time], index) => {
        if (
          (index === 0 && time !== 0) ||
          time <= previous ||
          time > recipe.duration
        )
          add(
            "timeline",
            `${path}["source"]["frequency"]["points"][${index}][0]`,
            "Automation must start at zero, increase strictly, and end by gate close.",
          );
        previous = time;
      });
    }
  });
  if (effects > 8)
    add(
      "resource-limit",
      '$["effects"]',
      "At most eight filters across the recipe.",
    );
  if (points > 128)
    add(
      "resource-limit",
      '$["layers"]',
      "At most 128 automation points across the recipe.",
    );
  if (issues.length) return { ok: false, issues };
  return { ok: true, recipe: snapshot(recipe) };
}

function snapshot<T>(value: T): T {
  if (Array.isArray(value)) return Object.freeze(value.map(snapshot)) as T;
  if (value && typeof value === "object")
    return Object.freeze(
      Object.fromEntries(
        Object.keys(value)
          .sort()
          .map((key) => [
            key,
            snapshot((value as Record<string, unknown>)[key]),
          ]),
      ),
    ) as T;
  return value;
}

export class AudioBitsError extends Error {
  readonly code: string;
  readonly issues: readonly RecipeIssue[];
  constructor(
    code: string,
    message: string,
    issues: readonly RecipeIssue[] = [],
  ) {
    super(message);
    this.name = "AudioBitsError";
    this.code = code;
    this.issues = issues;
  }
}
export function defineSound(input: unknown): Recipe {
  const result = validateRecipe(input);
  if (!result.ok)
    throw new AudioBitsError(
      "invalid-recipe",
      "Recipe validation failed.",
      result.issues,
    );
  return result.recipe;
}
