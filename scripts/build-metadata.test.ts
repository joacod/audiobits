import { execFileSync } from "node:child_process";
import {
  copyFile,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, test } from "vitest";

test("the bare bundler retains public metadata after cleaning, without the build script's copy step", async () => {
  const output = await mkdtemp(join(tmpdir(), "audiobits-build-metadata-"));
  const directory = resolve("packages/audiobits");
  try {
    // pnpm dev builds first, then launches the bare bundler in watch mode.
    // Its initial clean must restore the JSON exports alongside JS and types.
    for (const name of ["schema", "capabilities"])
      await copyFile(
        join(directory, `src/recipe/${name}.json`),
        join(output, `${name}.json`),
      );
    await writeFile(join(output, "stale.txt"), "Must be cleaned");
    execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `
      import { build } from "tsdown";
      import configuration from "./tsdown.config.ts";
      await build({ ...configuration, config: false, outDir: process.argv[1] });
    `,
        output,
      ],
      { cwd: directory, stdio: "pipe" },
    );
    expect((await readdir(output)).sort()).toEqual([
      "capabilities.json",
      "index.d.ts",
      "index.js",
      "schema.json",
    ]);
    for (const name of ["schema", "capabilities"])
      expect(await readFile(join(output, `${name}.json`))).toEqual(
        await readFile(join(directory, `src/recipe/${name}.json`)),
      );
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});
