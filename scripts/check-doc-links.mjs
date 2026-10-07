import { readFile, readdir, access } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const ignored = new Set([
  ".git",
  "node_modules",
  "dist",
  ".next",
  ".source",
  "test-results",
  "playwright-report",
]);
async function check(dir) {
  // Vendored skill references are checked separately from project docs.
  if (resolve(dir) === resolve("apps/www/.agents/skills")) return;
  for (const item of await readdir(dir, { withFileTypes: true })) {
    if (ignored.has(item.name)) continue;
    const path = resolve(dir, item.name);
    if (item.isDirectory()) await check(path);
    else if (item.name.endsWith(".md")) {
      const content = await readFile(path, "utf8");
      for (const match of content.matchAll(
        /\[[^\]]*\]\(([^\s)]+)(?:\s+[^)]*)?\)/g,
      )) {
        const target = match[1].replace(/^<|>$/g, "");
        if (/^(?:[a-z]+:|#|\/)/i.test(target)) continue;
        await access(
          resolve(dirname(path), decodeURIComponent(target.split("#")[0])),
        );
      }
    }
  }
}
await check(".");
console.log(
  "Relative Markdown file targets resolve (anchors and external URLs are not checked).",
);
