import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const require = createRequire(
  new URL("../packages/audiobits/package.json", import.meta.url),
);
const { build } = await import(require.resolve("tsdown"));
// Bundle the exact displayed host examples, including setup, Stop and teardown.
const { libraryExample, rawHost, sounds, hasRawComparison } =
  await import("../apps/www/lib/gallery.ts");
const exampleInput = "apps/www/node_modules/.cache/audiobits-example-input";
await mkdir(exampleInput, { recursive: true });
const rawSource = await readFile("apps/www/lib/raw-example.ts", "utf8");
const imports = [],
  names = [];
for (const kind of Object.keys(sounds)) {
  for (const mode of hasRawComparison(kind)
    ? ["Library", "Raw"]
    : ["Library"]) {
    const name = `${kind}${mode}`;
    const binding = name.replaceAll("-", "_");
    const source =
      mode === "Library"
        ? libraryExample(sounds[kind], kind === "impact" ? 0.83 : 0.2, 7)
        : rawSource + rawHost(kind, kind === "impact" ? 0.83 : 0.2, 7);
    await writeFile(`${exampleInput}/${name}.ts`, source);
    imports.push(`import * as ${binding} from "./${name}";`);
    names.push(`${JSON.stringify(name)}: ${binding}`);
  }
}
const displayedEntry = resolve(`${exampleInput}/displayed-examples.ts`);
await writeFile(
  displayedEntry,
  `${imports.join("\n")}\nObject.assign(globalThis, { displayedExamples: { ${names.join(", ")} } });`,
);
for (const [index, entry] of [
  "tests/browser/audio-harness.ts",
  displayedEntry,
].entries())
  await build({
    entry: [entry],
    format: "iife",
    platform: "browser",
    target: "es2022",
    outDir: "node_modules/.cache/audiobits-audio-tests",
    dts: false,
    clean: index === 0,
  });
