#!/usr/bin/env node
import { realpath, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Read-only: print launch settings; the user chooses their host and config scope.
try {
  if (process.argv.length !== 4 || process.argv[2] !== "--project") {
    throw new Error("Usage: node setup-mcp.mjs --project <consumer-project>");
  }
  const project = await realpath(resolve(process.argv[3]));
  if (!(await stat(project)).isDirectory())
    throw new Error("Consumer project must be a directory.");
  JSON.parse(await readFile(resolve(project, "package.json"), "utf8"));
  const script = await realpath(
    fileURLToPath(new URL("./mcp.mjs", import.meta.url)),
  );
  const command = await realpath(process.execPath);
  console.log(
    JSON.stringify({ command, args: [script, "--project", project] }, null, 2),
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
