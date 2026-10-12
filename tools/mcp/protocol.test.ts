import { readFile, writeFile, mkdir, symlink } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, expect, test } from "vitest";
import { fixture, protocolClient, call } from "./fixtures.js";

let external: Awaited<ReturnType<typeof fixture>>;
let connection: Awaited<ReturnType<typeof protocolClient>>;
const recipe = {
  schemaVersion: 1,
  kind: "one-shot",
  duration: 0.1,
  layers: [
    {
      id: "tone",
      source: { type: "oscillator", waveform: "sine", frequency: 440 },
      gainDb: -12,
      envelope: { attack: 0.005, decay: 0.02, sustain: 0.1, release: 0.02 },
    },
  ],
};

beforeAll(async () => {
  external = await fixture();
  connection = await protocolClient(external.consumer);
});
afterAll(async () => {
  await connection?.client.close();
  await external?.cleanup();
});

test("actual SDK client initializes stdio and discovers precisely five tools", async () => {
  expect(connection.client.getServerVersion()?.name).toBe("audiobits-local");
  const tools = await connection.client.listTools();
  expect(tools.tools.map((tool) => tool.name).sort()).toEqual([
    "check_compatibility",
    "get_catalog_item",
    "inspect_project",
    "search_catalog",
    "validate_recipe",
  ]);
  expect(connection.stderr()).toBe("");
});

test("cwd and explicit resolution use packed external ESM exports", async () => {
  const inspected = await call(connection.client, "inspect_project");
  expect(inspected.error).toBe(false);
  expect(inspected.data.version).toBe(external.version);
  expect(inspected.data.packagePath).toBe(
    resolve(external.consumer, "node_modules/audiobits"),
  );
  expect(inspected.data.schema.$defs.Recipe).toBeDefined();
  expect(inspected.data.capabilities.recipe.sources).toContain("oscillator");
  const explicit = await call(connection.client, "inspect_project", {
    projectPath: external.consumer,
  });
  expect(explicit.data).toEqual(inspected.data);
});

test("packed validateRecipe returns structural, semantic and resource issues", async () => {
  const valid = await call(connection.client, "validate_recipe", { recipe });
  expect(valid.data.validation.ok).toBe(true);
  const invalid = await call(connection.client, "validate_recipe", {
    recipe: { ...recipe, duration: -1, extra: true },
  });
  expect(invalid.data.validation.ok).toBe(false);
  expect(invalid.data.validation.issues).toContainEqual(
    expect.objectContaining({ code: "range", path: '$["duration"]' }),
  );
  expect(invalid.data.validation.issues).toContainEqual(
    expect.objectContaining({ code: "unknown-field", path: '$["extra"]' }),
  );
  const semantic = await call(connection.client, "validate_recipe", {
    recipe: {
      ...recipe,
      parameters: { level: { mode: "play", min: 1, max: 1, default: 1 } },
    },
  });
  expect(semantic.data.validation.issues).toContainEqual(
    expect.objectContaining({
      code: "range",
      path: '$["parameters"]["level"]',
    }),
  );
  const resource = await call(connection.client, "validate_recipe", {
    recipe: { ...recipe, layers: Array(33).fill(recipe.layers[0]) },
  });
  expect(
    resource.data.validation.issues.some(
      (issue: { code: string }) => issue.code === "resource-limit",
    ),
  ).toBe(true);
});

test("offline search, metadata and compatibility need no GitHub access", async () => {
  const found = await call(connection.client, "search_catalog", {
    query: "soft completed action",
  });
  expect(found.data.items[0].name).toBe("confirmation");
  const item = await call(connection.client, "get_catalog_item", {
    name: "confirmation",
  });
  expect(item.data.sources).toBeUndefined();
  expect(item.data.installation.install).toContain(`#${found.data.revision}`);
  expect(item.data.files[0].sha256).toMatch(/^[a-f0-9]{64}$/);
  expect(
    (
      await call(connection.client, "check_compatibility", {
        name: "energy-charge",
      })
    ).data.compatible,
  ).toBe(true);
});

test("invalid projects, missing runtime, ancestor installation and incompatible exports fail clearly", async () => {
  expect(
    (
      await call(connection.client, "inspect_project", {
        projectPath: resolve(external.directory, "absent"),
      })
    ).data.diagnostic.code,
  ).toBe("invalid-project");
  expect(
    (
      await call(connection.client, "inspect_project", {
        projectPath: external.missing,
      })
    ).data.diagnostic.code,
  ).toBe("runtime-missing");
  const nested = resolve(external.consumer, "nested");
  await mkdir(nested);
  await writeFile(resolve(nested, "package.json"), '{"private":true}');
  expect(
    (await call(connection.client, "inspect_project", { projectPath: nested }))
      .data.diagnostic.code,
  ).toBe("runtime-missing");
  const bad = resolve(external.directory, "bad");
  await mkdir(resolve(bad, "node_modules/audiobits"), { recursive: true });
  await writeFile(resolve(bad, "package.json"), '{"private":true}');
  await writeFile(
    resolve(bad, "node_modules/audiobits/package.json"),
    '{"name":"audiobits","version":"0.0.0","exports":{}}',
  );
  expect(
    (await call(connection.client, "inspect_project", { projectPath: bad }))
      .data.diagnostic.code,
  ).toBe("runtime-incompatible");
});

test("malformed requests and tool errors recover without corrupting stdio", async () => {
  for (const [name, args] of [
    ["inspect_project", { projectPath: 42 }],
    ["search_catalog", { limit: -1 }],
    ["search_catalog", { unexpected: true }],
    ["get_catalog_item", { name: "../LICENSE" }],
    ["validate_recipe", {}],
    ["check_compatibility", {}],
  ] as const) {
    const response = await connection.client
      .callTool({ name, arguments: args })
      .catch((error) => error);
    expect(
      response.isError === true || response instanceof Error,
      `${name}: ${JSON.stringify(response)}`,
    ).toBe(true);
  }
  expect(
    (await call(connection.client, "get_catalog_item", { name: "unknown" }))
      .data.diagnostic.code,
  ).toBe("unknown-item");
  expect(
    (
      await call(connection.client, "get_catalog_item", {
        name: "confirmation",
        sourcePaths: ["LICENSE", "package.json"],
      })
    ).data.diagnostic.code,
  ).toBe("undeclared-source");
  expect((await call(connection.client, "inspect_project")).error).toBe(false);
});

test("package-manager symlinks resolve the selected installed runtime", async () => {
  const linked = resolve(external.directory, "linked");
  await mkdir(resolve(linked, "node_modules"), { recursive: true });
  await writeFile(resolve(linked, "package.json"), '{"private":true}');
  await symlink(
    resolve(external.consumer, "node_modules/audiobits"),
    resolve(linked, "node_modules/audiobits"),
    "dir",
  );
  expect(
    (await call(connection.client, "inspect_project", { projectPath: linked }))
      .data.version,
  ).toBe(external.version);
});

test("external version and missing capabilities override the monorepo installation", async () => {
  const packagePath = resolve(external.consumer, "node_modules/audiobits");
  const manifestPath = resolve(packagePath, "package.json");
  const capabilitiesPath = resolve(packagePath, "dist/capabilities.json");
  const originalManifest = await readFile(manifestPath, "utf8");
  const originalCapabilities = await readFile(capabilitiesPath, "utf8");
  try {
    const manifest = JSON.parse(originalManifest);
    const capabilities = JSON.parse(originalCapabilities);
    manifest.version = `${external.version}-consumer-fixture`;
    capabilities.packageVersion = manifest.version;
    capabilities.recipe.waveforms = [];
    capabilities.runtime = capabilities.runtime.filter(
      (feature: string) => feature !== "live-controls",
    );
    await writeFile(manifestPath, JSON.stringify(manifest));
    await writeFile(capabilitiesPath, JSON.stringify(capabilities));
    expect(
      (await call(connection.client, "inspect_project")).data.version,
    ).toBe(manifest.version);
    const checked = await call(connection.client, "check_compatibility", {
      name: "energy-charge",
    });
    expect(checked.data.compatible).toBe(false);
    expect(checked.data.issues).toContainEqual(
      expect.objectContaining({ requirement: "runtime:live-controls" }),
    );
    expect(checked.data.issues).toContainEqual(
      expect.objectContaining({ requirement: "waveforms:sine" }),
    );
  } finally {
    await writeFile(manifestPath, originalManifest);
    await writeFile(capabilitiesPath, originalCapabilities);
  }
});

test("EOF and SIGTERM cause clean server shutdown with protocol-only stdout", async () => {
  const entry = fileURLToPath(new URL("./dist/stdio.js", import.meta.url));
  const eof = spawn(process.execPath, [entry], {
    cwd: external.consumer,
    stdio: ["pipe", "pipe", "pipe"],
  });
  let output = "";
  eof.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  const exited = once(eof, "exit");
  eof.stdin.end();
  expect(await exited).toEqual([0, null]);
  expect(output).toBe("");
  const signaled = await protocolClient(external.consumer);
  try {
    const closed = new Promise<void>((accept) => {
      signaled.transport.onclose = accept;
    });
    process.kill(signaled.transport.pid!, "SIGTERM");
    await closed;
    expect(signaled.stderr()).toBe("");
  } finally {
    await signaled.client.close();
  }
});

test("installed runtime console output is isolated and a stuck runtime times out", async () => {
  const entry = resolve(
    external.consumer,
    "node_modules/audiobits/dist/index.js",
  );
  const original = await readFile(entry, "utf8");
  try {
    await writeFile(
      entry,
      `${original}\nconsole.log("installed output"); console.error("installed error");\n`,
    );
    expect((await call(connection.client, "inspect_project")).error).toBe(
      false,
    );
    expect(connection.stderr()).toBe("");
    await writeFile(entry, `${original}\nwhile (true) {}\n`);
    expect(
      (await call(connection.client, "inspect_project")).data.diagnostic.code,
    ).toBe("runtime-timeout");
  } finally {
    await writeFile(entry, original);
  }
  expect((await call(connection.client, "inspect_project")).error).toBe(false);
});

test("EOF cancels an active installed runtime worker and exits cleanly", async () => {
  const packageRoot = resolve(external.consumer, "node_modules/audiobits");
  const entry = resolve(packageRoot, "dist/index.js");
  const original = await readFile(entry, "utf8");
  const child = spawn(
    process.execPath,
    [
      "--import",
      fileURLToPath(new URL("./shutdown-observer.mjs", import.meta.url)),
      fileURLToPath(new URL("./dist/stdio.js", import.meta.url)),
    ],
    { cwd: external.consumer, stdio: ["pipe", "pipe", "pipe"] },
  );
  const started = new Promise<void>((accept) => {
    child.stderr.on("data", (chunk) => {
      if (chunk.toString().includes("worker-online")) accept();
    });
  });
  try {
    await writeFile(entry, `${original}\nwhile (true) {}\n`);
    const initialized = new Promise<void>((accept) => {
      let buffer = "";
      child.stdout.on("data", (chunk) => {
        buffer += chunk.toString();
        if (buffer.includes('"id":0')) accept();
      });
    });
    child.stdin.write(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 0,
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: { name: "shutdown-test", version: "1.0.0" },
        },
      }) + "\n",
    );
    await initialized;
    child.stdin.write(
      JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) +
        "\n",
    );
    child.stdin.write(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "inspect_project", arguments: {} },
      }) + "\n",
    );
    await started;
    const exited = once(child, "exit");
    child.stdin.end();
    expect(await exited).toEqual([0, null]);
  } finally {
    if (child.exitCode === null) child.kill("SIGKILL");
    await writeFile(entry, original);
  }
});
