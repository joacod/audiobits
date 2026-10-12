import {
  cp,
  readFile,
  readdir,
  realpath,
  symlink,
  writeFile,
} from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { expect, test } from "vitest";
import { fixture, protocolClient, call } from "./fixtures.js";

const skill = fileURLToPath(
  new URL("../../skills/audiobits/", import.meta.url),
);

test("external Skill runs all tools without server dependencies and uses the explicit consumer", async () => {
  const external = await fixture();
  const installed = resolve(external.directory, "installed skill");
  await cp(skill, installed, { recursive: true });
  const connection = await protocolClient(
    external.missing,
    true,
    resolve(installed, "scripts/mcp.mjs"),
    ["--project", external.consumer],
  );
  try {
    expect((await connection.client.listTools()).tools).toHaveLength(5);
    expect(await readdir(resolve(external.consumer, "node_modules"))).toEqual([
      ".package-lock.json",
      "audiobits",
    ]);
    expect(
      (await call(connection.client, "inspect_project")).data.packagePath,
    ).toBe(resolve(external.consumer, "node_modules/audiobits"));
    expect(
      (
        await call(connection.client, "search_catalog", {
          query: "soft completed action",
        })
      ).data.items[0].name,
    ).toBe("confirmation");
    expect(
      (
        await call(connection.client, "get_catalog_item", {
          name: "confirmation",
        })
      ).data.files.length,
    ).toBeGreaterThan(0);
    expect(
      (
        await call(connection.client, "check_compatibility", {
          name: "energy-charge",
        })
      ).data.compatible,
    ).toBe(true);
    const invalid = await call(connection.client, "validate_recipe", {
      recipe: { schemaVersion: 999 },
    });
    expect(invalid.data.validation.ok).toBe(false);
    expect(
      (
        await call(connection.client, "inspect_project", {
          projectPath: external.missing,
        })
      ).data.diagnostic.code,
    ).toBe("runtime-missing");
    const manifest = resolve(
      external.consumer,
      "node_modules/audiobits/package.json",
    );
    const caps = resolve(
      external.consumer,
      "node_modules/audiobits/dist/capabilities.json",
    );
    const version = `${external.version}-external-bundle`;
    await writeFile(
      manifest,
      JSON.stringify({
        ...JSON.parse(await readFile(manifest, "utf8")),
        version,
      }),
    );
    await writeFile(
      caps,
      JSON.stringify({
        ...JSON.parse(await readFile(caps, "utf8")),
        packageVersion: version,
      }),
    );
    expect(
      (await call(connection.client, "inspect_project")).data.version,
    ).toBe(version);
    expect(connection.stderr()).toBe("");
  } finally {
    await connection.client.close();
    await external.cleanup();
  }
});

test("setup resolves a symlinked installed Skill, emits settings and never writes configuration", async () => {
  const external = await fixture();
  try {
    const installed = resolve(external.directory, "installed skill");
    await cp(skill, installed, { recursive: true });
    const linked = resolve(external.directory, "agent skill");
    await symlink(installed, linked, "dir");
    const settings = resolve(external.consumer, "opencode.jsonc");
    const existing =
      '// Preserve comments and unrelated settings\n{"mcp":{"servers":{"audiobits":{"type":"local","command":["existing"]}}},"theme":"system"}\n';
    await writeFile(settings, existing);
    const before = await readdir(external.consumer);
    const helper = resolve(linked, "scripts/setup-mcp.mjs");
    const launch = JSON.parse(
      execFileSync(process.execPath, [helper, "--project", external.consumer], {
        cwd: external.missing,
        encoding: "utf8",
      }),
    );
    expect(launch).toEqual({
      command: await realpath(process.execPath),
      args: [
        resolve(installed, "scripts/mcp.mjs"),
        "--project",
        external.consumer,
      ],
    });
    expect(
      JSON.parse(
        execFileSync(
          process.execPath,
          [helper, "--project", external.consumer],
          { encoding: "utf8" },
        ),
      ),
    ).toEqual(launch);
    expect(await readdir(external.consumer)).toEqual(before);
    expect(await readFile(settings, "utf8")).toBe(existing);
    expect(() =>
      execFileSync(
        process.execPath,
        [helper, "--project", external.directory],
        { stdio: "pipe" },
      ),
    ).toThrow();
    // The normal workflow needs no MCP registration: use public runtime exports.
    const validation = execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        'import { validateRecipe } from "audiobits"; console.log(JSON.stringify(validateRecipe({schemaVersion:999})));',
      ],
      { cwd: external.consumer, encoding: "utf8" },
    );
    expect(JSON.parse(validation).ok).toBe(false);
  } finally {
    await external.cleanup();
  }
});
