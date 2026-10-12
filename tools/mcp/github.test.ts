import { expect, test } from "vitest";
import { fixture, protocolClient, call } from "./fixtures.js";

test("explicit protocol request retrieves only a declared immutable GitHub source", async () => {
  const external = await fixture();
  const connection = await protocolClient(external.consumer, false);
  try {
    const item = await call(connection.client, "get_catalog_item", {
      name: "confirmation",
      sourcePaths: ["catalog/recipes/confirmation/recipe.ts"],
    });
    expect(item.error, JSON.stringify(item.data)).toBe(false);
    expect(item.data.sources).toHaveLength(1);
    expect(item.data.sources[0].origin).toContain(
      `raw.githubusercontent.com/joacod/audiobits/${item.data.source.revision}/`,
    );
    expect(item.data.sources[0].content).toContain("export const confirmation");
    expect(
      (await call(connection.client, "inspect_project")).data.version,
    ).toBe(external.version);
  } finally {
    await connection.client.close();
    await external.cleanup();
  }
});
