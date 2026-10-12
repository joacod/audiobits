import { execFileSync } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  rm,
  writeFile,
  readFile,
  realpath,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const root = fileURLToPath(new URL("../../", import.meta.url));
export async function fixture() {
  const directory = await realpath(
    await mkdtemp(resolve(tmpdir(), "audiobits-mcp-")),
  );
  try {
    const consumer = resolve(directory, "consumer");
    const missing = resolve(directory, "missing");
    await mkdir(consumer);
    await mkdir(missing);
    await writeFile(
      resolve(consumer, "package.json"),
      '{"private":true,"type":"module"}',
    );
    await writeFile(resolve(missing, "package.json"), '{"private":true}');
    const npm = process.platform === "win32" ? "npm.cmd" : "npm";
    const pack = JSON.parse(
      execFileSync(
        npm,
        [
          "pack",
          "--ignore-scripts",
          "--cache",
          resolve(directory, "npm-cache"),
          "--json",
          "--pack-destination",
          directory,
        ],
        { cwd: resolve(root, "packages/audiobits"), encoding: "utf8" },
      ),
    );
    execFileSync(
      npm,
      [
        "install",
        "--cache",
        resolve(directory, "npm-cache"),
        "--offline",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        resolve(directory, pack[0].filename),
      ],
      { cwd: consumer, stdio: "pipe" },
    );
    const manifest = JSON.parse(
      await readFile(
        resolve(consumer, "node_modules/audiobits/package.json"),
        "utf8",
      ),
    );
    return {
      directory,
      consumer,
      missing,
      version: manifest.version as string,
      cleanup: () => rm(directory, { recursive: true, force: true }),
    };
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}

export async function protocolClient(
  cwd: string,
  offline = true,
  entry = resolve(root, "tools/mcp/dist/stdio.js"),
  extraArgs: string[] = [],
) {
  const client = new Client({
    name: "audiobits-protocol-test",
    version: "1.0.0",
  });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [
      ...(offline
        ? ["--import", resolve(root, "tools/mcp/offline-guard.mjs")]
        : []),
      entry,
      ...extraArgs,
    ],
    cwd,
    stderr: "pipe",
  });
  let stderr = "";
  transport.stderr!.on("data", (chunk) => {
    stderr += chunk.toString();
  });
  await client.connect(transport);
  return { client, transport, stderr: () => stderr };
}

export async function call(
  client: Client,
  name: string,
  args: Record<string, unknown> = {},
) {
  const response = await client.callTool({ name, arguments: args });
  if (!("content" in response) || !Array.isArray(response.content))
    throw new Error("Expected a tool result");
  const text = response.content.find((entry) => entry.type === "text");
  if (!text || text.type !== "text") throw new Error("Expected JSON text");
  return {
    error: response.isError ?? false,
    data: JSON.parse(text.text),
    response,
  };
}
