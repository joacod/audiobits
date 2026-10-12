import { readFile, realpath, stat } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parentPort, workerData } from "node:worker_threads";
import { isDeepStrictEqual } from "node:util";
import { capabilitiesContract, validationContract } from "./contracts.js";
import type { RuntimeRequest, RuntimeResponse } from "./contracts.js";
import { diagnostic, ToolError } from "./errors.js";

async function readJson(path: string): Promise<Record<string, unknown>> {
  if ((await stat(path)).size > 256 * 1024)
    throw new ToolError(
      "runtime-incompatible",
      "Runtime metadata exceeds 256 KiB.",
      "Install a supported AudioBits runtime.",
    );
  return JSON.parse(await readFile(path, "utf8"));
}

async function run(request: RuntimeRequest): Promise<RuntimeResponse> {
  let projectPath: string;
  try {
    projectPath = await realpath(request.projectPath);
    if (!(await stat(projectPath)).isDirectory()) throw new Error();
    await readJson(resolve(projectPath, "package.json"));
  } catch {
    throw new ToolError(
      "invalid-project",
      "Project must be an existing directory with a readable package.json.",
      "Pass the consumer project root as projectPath.",
    );
  }
  let packagePath: string;
  try {
    // Never search above the explicit project boundary or in the server workspace.
    // realpath permits the package-manager symlink installed in this project.
    packagePath = await realpath(
      resolve(projectPath, "node_modules/audiobits"),
    );
  } catch {
    throw new ToolError(
      "runtime-missing",
      "AudioBits is not installed in this project.",
      "Install audiobits in the selected project, or select its workspace root.",
    );
  }
  try {
    const manifest = await readJson(resolve(packagePath, "package.json"));
    if (manifest.name !== "audiobits" || typeof manifest.version !== "string")
      throw new Error("Invalid package manifest");
    const parent = pathToFileURL(resolve(projectPath, "package.json")).href;
    async function exported(specifier: string) {
      // The worker enables Node's parentURL resolver, preserving import conditions.
      const url = import.meta.resolve(specifier, parent);
      const path = await realpath(fileURLToPath(url));
      const within = relative(packagePath, path);
      if (
        within === ".." ||
        within.startsWith(`..${sep}`) ||
        within.startsWith(sep)
      )
        throw new Error("Export escaped installed package");
      return pathToFileURL(path).href;
    }
    const schema = await readJson(
      fileURLToPath(await exported("audiobits/schema.json")),
    );
    const capabilities = capabilitiesContract.parse(
      await readJson(
        fileURLToPath(await exported("audiobits/capabilities.json")),
      ),
    );
    const defs = schema.$defs as
      | Record<string, { properties?: { schemaVersion?: { const?: unknown } } }>
      | undefined;
    const versions = Object.values(defs ?? {}).flatMap((definition) =>
      definition.properties?.schemaVersion
        ? [definition.properties.schemaVersion.const]
        : [],
    );
    if (
      capabilities.packageVersion !== manifest.version ||
      !versions.length ||
      versions.some((version) => version !== capabilities.schemaVersion)
    )
      throw new Error("Metadata versions disagree");
    const runtime = await import(await exported("audiobits"));
    if (
      typeof runtime.validateRecipe !== "function" ||
      !isDeepStrictEqual(runtime.recipeSchema, schema)
    )
      throw new Error("Public runtime contracts unavailable");
    const info = {
      projectPath,
      packagePath,
      version: manifest.version,
      schema,
      capabilities,
    };
    return request.operation === "validate"
      ? {
          runtime: info,
          validation: validationContract.parse(
            runtime.validateRecipe(request.recipe),
          ),
        }
      : { runtime: info };
  } catch {
    throw new ToolError(
      "runtime-incompatible",
      "The installed AudioBits runtime cannot supply consistent public schema, capabilities and validation exports.",
      "Reinstall or update audiobits in the selected project; build it first when using the monorepo.",
    );
  }
}

try {
  parentPort!.postMessage({
    ok: true,
    result: await run(workerData as RuntimeRequest),
  });
} catch (error) {
  parentPort!.postMessage({ ok: false, diagnostic: diagnostic(error) });
}
