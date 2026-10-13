import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, expect, test } from "vitest";
import {
  checkDocLinks,
  documentationRoute,
  linkTargets,
} from "./check-doc-links.mjs";

const temporary: string[] = [];
afterEach(async () => {
  await Promise.all(
    temporary
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function fixture(
  content: string,
  file = "apps/www/content/docs/(start)/index.mdx",
) {
  const root = await mkdtemp(join(tmpdir(), "audiobits-doc-links-"));
  temporary.push(root);
  for (const [path, text] of Object.entries({
    "README.md": "[Docs](/docs/api#exports)",
    "docs/guide.md": "Guide",
    "docs/file name.md": "Guide",
    "apps/www/content/docs/(start)/index.mdx": "Introduction",
    "apps/www/content/docs/(runtime)/api.mdx": "API",
    "apps/www/content/docs/(runtime)/advanced/index.md": "Advanced",
    [file]: content,
  })) {
    const pathOnDisk = join(root, path);
    await mkdir(dirname(pathOnDisk), { recursive: true });
    await writeFile(pathOnDisk, text);
  }
  return root;
}

test("default Fumadocs paths omit groups and index filenames", () => {
  expect(documentationRoute("(start)/index.mdx")).toBe("/docs");
  expect(documentationRoute("(runtime)/api.mdx")).toBe("/docs/api");
  expect(documentationRoute("(runtime)/advanced/(group)/index.md")).toBe(
    "/docs/advanced",
  );
});

test.each([
  "[API](/docs/api#exports)",
  "[API](/docs/api?view=full#exports)",
  "[Home](/docs/) [Nested](/docs/advanced)",
  "[Markdown](/docs/api.md) [Home](/docs/index.md)",
  "[Source](../(runtime)/api.mdx#exports)",
  "[Sibling](docs/api) [Parent](../docs)",
  '<Card href="/docs/api" title="API" />',
  "<a href='/docs/api#exports'>API</a>",
  '[Reference][api]\n\n[api]: /docs/api "API title"',
  "[Canonical](https://www.audiobits.dev/docs/api)",
  "[Anchor](#install) [External](https://example.com/docs/missing) [Mail](mailto:dev@example.com)",
  "[Catalog](/catalog) [Protocol-relative](//example.com/docs/missing)",
])("valid MDX documentation destination: %s", async (content) => {
  const root = await fixture(content);
  await expect(checkDocLinks(root)).resolves.toEqual({ files: 6, routes: 3 });
});

test.each([
  "[Missing](/docs/missing)",
  "[Wrong group](/docs/(runtime)/api)",
  "[Wrong folder](/docs/runtime/api)",
  "[Missing source](../(runtime)/missing.mdx)",
  '<Card href="/docs/missing" />',
  "[Reference][missing]\n\n[missing]: /docs/missing",
  "[Missing relative page](missing)",
  "[Missing Markdown](/docs/missing.md)",
  "[Canonical](https://www.audiobits.dev/docs/missing)",
  "[Malformed](../broken%ZZ.md)",
])("invalid MDX documentation destination: %s", async (content) => {
  const root = await fixture(content);
  await expect(checkDocLinks(root)).rejects.toThrow(/index\.mdx: /);
});

test("repository Markdown file paths remain filesystem-relative", async () => {
  const root = await fixture(
    '[Guide](docs/guide.md?plain=1#heading) [Space](<docs/file name.md> "title")',
    "README.md",
  );
  await expect(checkDocLinks(root)).resolves.toBeDefined();
  await writeFile(join(root, "README.md"), "[Missing](docs/missing.md)");
  await expect(checkDocLinks(root)).rejects.toThrow(
    "README.md: docs/missing.md",
  );
});

test("examples in fences, inline code and comments are ignored", async () => {
  const content = [
    "````mdx",
    "```md",
    "[Example](/docs/missing)",
    "```",
    '<Card href="/docs/missing" />',
    "````",
    "~~~md",
    "[Example](missing.md)",
    "~~~",
    "`[Example](/docs/missing)` and ``<Card href='/docs/missing' />``",
    "<!-- [Example](/docs/missing) -->",
    "{/* <Card href='/docs/missing' /> */}",
    "[Real](/docs/api)",
  ].join("\n");
  expect(linkTargets(content)).toEqual(["/docs/api"]);
  await expect(checkDocLinks(await fixture(content))).resolves.toBeDefined();
});
