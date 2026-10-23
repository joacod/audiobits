import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const require = createRequire(
  new URL("../packages/audiobits/package.json", import.meta.url),
);
const { build } = await import(require.resolve("tsdown"));
const runtime = process.argv.includes("--runtime");
const entries = [
  {
    "audio-harness": runtime
      ? "tests/browser/runtime-harness.ts"
      : "tests/browser/audio-harness.ts",
  },
];
if (!runtime) {
  // Bundle the exact displayed host examples, including setup, Stop and teardown.
  const { libraryExample, sounds } = await import("../apps/www/lib/gallery.ts");
  const exampleInput = "apps/www/node_modules/.cache/audiobits-example-input";
  await mkdir(exampleInput, { recursive: true });
  const imports = [],
    names = [];
  for (const kind of Object.keys(sounds)) {
    const name = `${kind}Library`;
    const binding = name.replaceAll("-", "_");
    await writeFile(
      `${exampleInput}/${name}.ts`,
      libraryExample(sounds[kind], kind === "impact" ? 0.83 : 0.2, 7),
    );
    imports.push(`import * as ${binding} from "./${name}";`);
    names.push(`${JSON.stringify(name)}: ${binding}`);
  }
  const displayedEntry = resolve(`${exampleInput}/displayed-examples.ts`);
  await writeFile(
    displayedEntry,
    `${imports.join("\n")}\nObject.assign(globalThis, { displayedExamples: { ${names.join(", ")} } });`,
  );
  entries.push({ "displayed-examples": displayedEntry });
}
for (const [index, entry] of entries.entries())
  await build({
    entry,
    format: "iife",
    platform: "browser",
    target: "es2022",
    outDir: "node_modules/.cache/audiobits-audio-tests",
    dts: false,
    clean: index === 0,
  });
