import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test, vi } from "vitest";
import {
  catalog,
  compatibility,
  itemByName,
  retrieveSources,
  searchCatalog,
  sourceUrl,
  MAX_SOURCE_BYTES,
} from "./catalog.js";
import type { RuntimeInfo } from "./contracts.js";

test("offline metadata and intent search derive from registry fields", () => {
  expect(catalog.items).toHaveLength(11);
  expect(
    searchCatalog("lightsaber ignite spark retract", "experience")[0].name,
  ).toBe("lightsaber");
  expect(searchCatalog("soft completed action")[0].name).toBe("confirmation");
  expect(searchCatalog("living move release", "experience")[0].name).toBe(
    "reactive-thruster",
  );
  expect(searchCatalog("", "recipe")).toHaveLength(8);
  expect(searchCatalog("nothing-matches-this")).toEqual([]);
  expect(() => itemByName("unknown")).toThrow();
  expect(JSON.stringify(catalog)).not.toContain("import { defineSound");
});

test("compatibility reports schema and every missing capability without inference", () => {
  const runtime = {
    version: "fixture",
    capabilities: { schemaVersion: 2, recipe: {}, runtime: [] },
  } as unknown as RuntimeInfo;
  const checked = compatibility(itemByName("reactive-thruster"), runtime);
  expect(checked.compatible).toBe(false);
  expect(checked.issues).toContainEqual(
    expect.objectContaining({ code: "schema-mismatch" }),
  );
  expect(checked.issues).toContainEqual(
    expect.objectContaining({ requirement: "runtime:live-controls" }),
  );
  expect(checked.issues).toContainEqual(
    expect.objectContaining({ requirement: "waveforms:sawtooth" }),
  );
});

for (const path of [
  "LICENSE",
  "../LICENSE",
  "catalog/recipes/confirmation/../recipe.ts",
  "/LICENSE",
  "https://evil.example/LICENSE",
  "LICENSE?token=secret",
  "catalog/recipes/confirmation/%2e%2e",
  "catalog/recipes/confirmation/.",
]) {
  test(`rejects unsafe source path ${path}`, () =>
    expect(() => sourceUrl(path)).toThrow());
}

test("retrieval checks all requested paths before any network activity", async () => {
  const network = vi.fn();
  await expect(
    retrieveSources(
      itemByName("confirmation"),
      ["LICENSE", "catalog/recipes/impact/recipe.ts"],
      undefined,
      network,
    ),
  ).rejects.toMatchObject({ code: "undeclared-source" });
  expect(network).not.toHaveBeenCalled();
});

function response(body: BodyInit, url: string, headers?: HeadersInit) {
  const result = new Response(body, { headers });
  Object.defineProperty(result, "url", { value: url });
  return result;
}

test("retrieval uses immutable public origin, no credentials and declared SHA-256", async () => {
  const bytes = await readFile("catalog/recipes/confirmation/recipe.ts");
  const path = "catalog/recipes/confirmation/recipe.ts";
  const network = vi.fn(async (url) => response(bytes, String(url)));
  const retrieved = await retrieveSources(
    itemByName("confirmation"),
    [path],
    undefined,
    network,
  );
  expect(network).toHaveBeenCalledWith(
    sourceUrl(path),
    expect.objectContaining({ redirect: "error", credentials: "omit" }),
  );
  expect(retrieved[0].content).toBe(bytes.toString("utf8"));
  expect(retrieved[0].origin).toContain(catalog.revision);
});

test("rejects changed content and incorrect origin", async () => {
  const item = itemByName("confirmation");
  await expect(
    retrieveSources(item, [item.files[0].path], undefined, async (url) =>
      response("changed", String(url)),
    ),
  ).rejects.toMatchObject({ code: "integrity-mismatch" });
  await expect(
    retrieveSources(item, [item.files[0].path], undefined, async () =>
      response("license", "https://evil.example/LICENSE"),
    ),
  ).rejects.toMatchObject({ code: "source-unavailable" });
});

test("rejects oversized declared and streamed source content", async () => {
  const item = itemByName("confirmation");
  await expect(
    retrieveSources(item, [item.files[0].path], undefined, async (url) =>
      response("", String(url), {
        "content-length": String(MAX_SOURCE_BYTES + 1),
      }),
    ),
  ).rejects.toMatchObject({ code: "source-unavailable" });
  await expect(
    retrieveSources(item, [item.files[0].path], undefined, async (url) =>
      response("x".repeat(MAX_SOURCE_BYTES + 1), String(url)),
    ),
  ).rejects.toMatchObject({ code: "source-too-large" });
});

test("monorepo verifies installed sound source and excludes demo dependencies without network", async () => {
  const network = vi.fn();
  const output = await retrieveSources(
    itemByName("reactive-thruster"),
    [
      "catalog/experiences/reactive-thruster/pointer.ts",
      "catalog/experiences/reactive-thruster/recipe.ts",
    ],
    resolve("."),
    network,
  );
  expect(output).toHaveLength(2);
  expect(output.every((file) => file.origin === "local")).toBe(true);
  for (const path of [
    "LICENSE",
    "catalog/recipes/impact/recipe.ts",
    "catalog/experiences/reactive-thruster/host.ts",
  ]) {
    await expect(
      retrieveSources(
        itemByName("reactive-thruster"),
        [path],
        resolve("."),
        network,
      ),
    ).rejects.toMatchObject({ code: "undeclared-source" });
  }
  expect(network).not.toHaveBeenCalled();
});

test("modified local source integrity fails without a remote fallback", async () => {
  const item = structuredClone(itemByName("confirmation"));
  item.files[0].sha256 = "0".repeat(64);
  const network = vi.fn();
  await expect(
    retrieveSources(item, [item.files[0].path], resolve("."), network),
  ).rejects.toMatchObject({ code: "integrity-mismatch" });
  expect(network).not.toHaveBeenCalled();
});

test("explicit network failures produce actionable source diagnostics", async () => {
  await expect(
    retrieveSources(
      itemByName("confirmation"),
      [itemByName("confirmation").files[0].path],
      undefined,
      async () => {
        throw new Error("offline");
      },
    ),
  ).rejects.toMatchObject({
    code: "source-unavailable",
    action: expect.stringContaining("network access"),
  });
});
