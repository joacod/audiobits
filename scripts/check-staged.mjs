import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { ESLint } from "eslint";
import * as prettier from "prettier";

const git = (...args) => execFileSync("git", args, { encoding: "utf8" });
process.chdir(git("rev-parse", "--show-toplevel").trim());
const files = git("diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z")
  .split("\0")
  .filter(Boolean);
const eslint = new ESLint();
let failed = false;
for (const file of files) {
  const filepath = resolve(file);
  const info = await prettier.getFileInfo(filepath, {
    ignorePath: ".prettierignore",
  });
  const format = !info.ignored && info.inferredParser;
  const lint =
    /\.(?:[cm]?js|jsx|ts|tsx)$/.test(file) &&
    !(await eslint.isPathIgnored(filepath));
  if (!format && !lint) continue;
  // Read the index, never rewrite or accidentally stage an unstaged edit.
  const source = git("show", `:${file}`);
  if (format) {
    const options = (await prettier.resolveConfig(filepath)) ?? {};
    if (!(await prettier.check(source, { ...options, filepath }))) {
      console.error(
        `Formatting: ${file}. Format and stage the intended changes.`,
      );
      failed = true;
    }
  }
  if (lint) {
    const results = await eslint.lintText(source, { filePath: filepath });
    const output = await (
      await eslint.loadFormatter("stylish")
    ).format(results);
    if (output) console.error(output);
    failed ||= results.some((result) => result.errorCount > 0);
  }
}
if (failed) process.exitCode = 1;
