import { createHash } from "node:crypto";
import { readFile, realpath, stat } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import snapshot from "./snapshot.json" with { type: "json" };
import type { RuntimeInfo } from "./contracts.js";
import { ToolError } from "./errors.js";
import { validSourcePath } from "./source-path.mjs";

export const catalog = snapshot;
export type CatalogItem = (typeof catalog.items)[number];
export const MAX_SOURCE_BYTES = 128 * 1024;

export function itemByName(name: string): CatalogItem {
  const item = catalog.items.find((entry) => entry.name === name);
  if (!item)
    throw new ToolError(
      "unknown-item",
      "No catalog item has this name.",
      "Use search_catalog to find an item name.",
    );
  return item;
}

// Search only registry-owned metadata. Token matches score independently so natural
// language requests such as "soft notification for completed action" remain useful.
export function searchCatalog(query: string, category?: string, limit = 10) {
  const tokens = [...new Set(query.toLowerCase().match(/[a-z0-9]+/g) ?? [])];
  return catalog.items
    .filter((item) => !category || item.categories.includes(category))
    .map((item) => {
      const title =
        `${item.name} ${item.title} ${item.meta.tags.join(" ")}`.toLowerCase();
      const text =
        `${item.description} ${item.categories.join(" ")} ${item.meta.classification}`.toLowerCase();
      const score = tokens.reduce(
        (sum, token) =>
          sum + (title.includes(token) ? 3 : text.includes(token) ? 1 : 0),
        0,
      );
      return {
        name: item.name,
        title: item.title,
        description: item.description,
        tags: item.meta.tags,
        categories: item.categories,
        score,
      };
    })
    .filter((item) => !tokens.length || item.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "en"))
    .slice(0, limit);
}

export function compatibility(item: CatalogItem, runtime: RuntimeInfo) {
  const issues: { code: string; requirement: string; message: string }[] = [];
  if (item.meta.schemaVersion !== runtime.capabilities.schemaVersion)
    issues.push({
      code: "schema-mismatch",
      requirement: `schemaVersion:${item.meta.schemaVersion}`,
      message: `Item needs schema ${item.meta.schemaVersion}; installed runtime declares ${runtime.capabilities.schemaVersion}.`,
    });
  for (const [group, values] of Object.entries(
    item.meta.requiredCapabilities,
  )) {
    const supported =
      group === "runtime"
        ? runtime.capabilities.runtime
        : runtime.capabilities.recipe[group];
    for (const value of values)
      if (!supported?.includes(value))
        issues.push({
          code: "unsupported-capability",
          requirement: `${group}:${value}`,
          message: `Installed runtime does not declare ${group}:${value}.`,
        });
  }
  return {
    compatible: issues.length === 0,
    runtimeVersion: runtime.version,
    requiredSchemaVersion: item.meta.schemaVersion,
    issues,
    requirements: item.meta.compatibility,
    scope:
      "Declared runtime schema and capabilities only. Application build setup and browser synthesis require separate verification.",
  };
}

export function itemMetadata(item: CatalogItem) {
  const address = `joacod/audiobits/${item.name}#${catalog.revision}`;
  return {
    ...item,
    source: { repository: catalog.repository, revision: catalog.revision },
    installation: {
      inspect: `npx shadcn@latest view ${address}`,
      install: `npx shadcn@latest add ${address}`,
      guidance:
        "Run the established shadcn registry command from the consumer project and review conflicts. Install only the needed sound source; connect recipes or controllers to existing application inputs. The app owns gesture activation, Stop and disposal. Demo hosts and renderers are excluded. This MCP returns source for review and never installs it.",
    },
  };
}

export function sourceUrl(path: string) {
  if (!/^[a-f0-9]{40}$/.test(catalog.revision) || !validSourcePath(path))
    throw new ToolError(
      "unsafe-source",
      "Source revision or path is unsafe.",
      "Regenerate the catalog snapshot from a reviewed commit.",
    );
  return `https://raw.githubusercontent.com/joacod/audiobits/${catalog.revision}/${path}`;
}

export async function retrieveSources(
  item: CatalogItem,
  paths: string[],
  projectPath?: string,
  fetchSource: typeof fetch = fetch,
  signal?: AbortSignal,
) {
  const files = paths.map((path) => {
    const file = item.files.find((entry) => entry.path === path);
    if (!file)
      throw new ToolError(
        "undeclared-source",
        "Requested file is not declared for this item.",
        "Select paths from the item's source manifest.",
      );
    sourceUrl(path);
    if (file.bytes > MAX_SOURCE_BYTES || !/^[a-f0-9]{64}$/.test(file.sha256))
      throw new ToolError(
        "unsafe-source",
        "Source manifest exceeds limits or lacks integrity.",
        "Regenerate the catalog snapshot.",
      );
    return file;
  });
  // Only use local files when the selected project is this same AudioBits catalog.
  // An external consumer cannot redirect reads into its own catalog directory.
  let localRoot: string | undefined;
  if (projectPath) {
    const root = await realpath(resolve(projectPath));
    try {
      const registry = JSON.parse(
        await readFile(resolve(root, "registry.json"), "utf8"),
      );
      const manifest = JSON.parse(
        await readFile(resolve(root, "package.json"), "utf8"),
      );
      if (
        manifest.name === "audiobits-workspace" &&
        registry.name === "audiobits" &&
        JSON.stringify(
          registry.items.map((entry: { name: string }) => entry.name).sort(),
        ) === JSON.stringify(catalog.items.map((entry) => entry.name).sort()) &&
        (await stat(resolve(root, "packages/audiobits/package.json"))).isFile()
      )
        localRoot = root;
    } catch {
      /* External projects use the immutable public source. */
    }
  }
  const output = [];
  for (const file of files) {
    signal?.throwIfAborted();
    const url = sourceUrl(file.path);
    let content: Uint8Array;
    if (localRoot) {
      const local = await realpath(resolve(localRoot, file.path));
      const within = relative(localRoot, local);
      if (
        within === ".." ||
        within.startsWith(`..${sep}`) ||
        within.startsWith(sep) ||
        (await stat(local)).size > MAX_SOURCE_BYTES
      )
        throw new ToolError(
          "unsafe-source",
          "Local source escapes the catalog or exceeds limits.",
          "Review the local catalog path.",
        );
      content = await readFile(local);
    } else {
      let response: Response;
      try {
        response = await fetchSource(url, {
          redirect: "error",
          signal: AbortSignal.any([
            AbortSignal.timeout(10000),
            ...(signal ? [signal] : []),
          ]),
          credentials: "omit",
          headers: { Accept: "text/plain" },
        });
      } catch {
        throw new ToolError(
          "source-unavailable",
          "Declared public GitHub source could not be retrieved.",
          "Check network access and the immutable source URL; cancelled requests can be started again.",
        );
      }
      if (
        !response.ok ||
        response.url !== url ||
        !response.body ||
        Number(response.headers.get("content-length") ?? 0) > MAX_SOURCE_BYTES
      )
        throw new ToolError(
          "source-unavailable",
          "Public source origin, response or content size is invalid.",
          "Check the public GitHub source at the declared revision.",
        );
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let bytes = 0;
      try {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          bytes += chunk.value.length;
          if (bytes > MAX_SOURCE_BYTES)
            throw new ToolError(
              "source-too-large",
              "Source exceeds 128 KiB.",
              "Review the catalog source manifest.",
            );
          chunks.push(chunk.value);
        }
      } finally {
        await reader.cancel();
      }
      content = Buffer.concat(chunks);
    }
    if (
      content.length !== file.bytes ||
      createHash("sha256").update(content).digest("hex") !== file.sha256
    )
      throw new ToolError(
        "integrity-mismatch",
        "Source does not match the immutable catalog snapshot.",
        "Review local changes or regenerate the snapshot from a reviewed revision.",
      );
    output.push({
      ...file,
      origin: localRoot ? "local" : url,
      content: new TextDecoder("utf-8", { fatal: true }).decode(content),
    });
  }
  return output;
}
