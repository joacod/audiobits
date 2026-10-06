import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = process.cwd();
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const run = (command, args, cwd = root) =>
  execFileSync(command, args, { cwd, stdio: "inherit" });
const consumer = await mkdtemp(join(tmpdir(), "audiobits-package-"));
try {
  run(pnpm, ["exec", "publint", "packages/audiobits", "--strict"]);
  run(pnpm, ["--filter", "audiobits", "pack", "--pack-destination", consumer]);
  const archive = join(
    consumer,
    (await readdir(consumer)).find((file) => file.endsWith(".tgz")),
  );
  const files = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" })
    .trim()
    .split("\n");
  const allowed = new Set([
    "package/package.json",
    "package/README.md",
    "package/LICENSE",
    "package/dist/index.js",
    "package/dist/index.d.ts",
  ]);
  if (files.length !== allowed.size || files.some((file) => !allowed.has(file)))
    throw new Error(`Unexpected package files: ${files.join(", ")}`);
  await writeFile(
    join(consumer, "package.json"),
    JSON.stringify({
      name: "isolated-consumer",
      private: true,
      type: "module",
    }),
  );
  // npm in a system temporary directory cannot resolve workspace:* or root sources.
  run(
    npm,
    [
      "install",
      archive,
      "--offline",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--cache",
      join(consumer, "cache"),
    ],
    consumer,
  );
  await writeFile(
    join(consumer, "index.ts"),
    'import { workspaceStatus } from "audiobits"; const status: string = workspaceStatus; console.log(status);\n',
  );
  run(
    process.execPath,
    [
      resolve("node_modules/typescript/bin/tsc"),
      "--noEmit",
      "--strict",
      "--module",
      "NodeNext",
      "--moduleResolution",
      "NodeNext",
      "--target",
      "ES2022",
      "index.ts",
    ],
    consumer,
  );
  run(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
    import assert from 'node:assert/strict';
    assert.equal(typeof window, 'undefined');
    assert.equal(typeof AudioContext, 'undefined');
    const { workspaceStatus } = await import('audiobits');
    assert.equal(workspaceStatus, 'AudioBits workspace ready');
    assert.ok(import.meta.resolve('audiobits').startsWith(new URL('./node_modules/', import.meta.url).href));
    console.log('Isolated Node import and exported value passed.');
  `,
    ],
    consumer,
  );
  const manifest = JSON.parse(
    await readFile(
      join(consumer, "node_modules/audiobits/package.json"),
      "utf8",
    ),
  );
  if (!manifest.private || manifest.dependencies || manifest.peerDependencies)
    throw new Error(
      "Runtime must remain private with zero runtime dependencies",
    );
  const output = await readFile(
    join(consumer, "node_modules/audiobits/dist/index.js"),
    "utf8",
  );
  if (
    output.includes(root) ||
    output.includes(consumer) ||
    /sourceMappingURL/.test(output)
  )
    throw new Error("Nonportable package output");
  console.log(
    "Package allowlist, zero runtime dependencies, declarations, and SSR import passed.",
  );
} finally {
  await rm(consumer, { recursive: true, force: true });
}
