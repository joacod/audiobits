import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import { expect, test } from "vitest";
import { libraryExample, rawHost, sounds } from "../apps/www/lib/gallery";

test("all documentation fences and current gallery/raw examples typecheck through public exports", () => {
  const snippets: string[] = [];
  for (const name of readdirSync("apps/www/content/docs")) {
    const text = readFileSync(`apps/www/content/docs/${name}`, "utf8");
    for (const match of text.matchAll(/```ts\n([\s\S]*?)```/g))
      snippets.push(match[1]);
  }
  const raw = readFileSync("apps/www/lib/raw-example.ts", "utf8");
  for (const kind of Object.keys(sounds) as (keyof typeof sounds)[]) {
    for (const control of [0, 0.5, 1]) {
      for (const seed of [0, 42, 0xffffffff]) {
        snippets.push(libraryExample(sounds[kind], control, seed));
        snippets.push(raw + rawHost(kind, control, seed));
      }
    }
  }
  const manifest = JSON.parse(
    readFileSync("packages/audiobits/package.json", "utf8"),
  ) as { version: string };
  expect(libraryExample(sounds.confirmation, 0, 42)).toContain(
    `AudioBits ${manifest.version}`,
  );
  const virtual = new Map(
    snippets.map((code, index) => [
      resolve(`apps/www/__example_${index}.ts`),
      code,
    ]),
  );
  const options: ts.CompilerOptions = {
    strict: true,
    noEmit: true,
    resolveJsonModule: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    types: [],
  };
  const host = ts.createCompilerHost(options);
  const read = host.readFile;
  const exists = host.fileExists;
  host.readFile = (path) => virtual.get(path) ?? read(path);
  host.fileExists = (path) => virtual.has(path) || exists(path);
  const program = ts.createProgram([...virtual.keys()], options, host);
  const errors = ts
    .getPreEmitDiagnostics(program)
    .map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"));
  expect(errors).toEqual([]);
});
