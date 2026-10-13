import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

const site = "http://127.0.0.1:3100";
const canonical = "https://www.audiobits.dev";
const docsDirectory = "apps/www/content/docs";
const docs = readdirSync(docsDirectory, { recursive: true })
  .filter((path): path is string => typeof path === "string")
  .filter((path) => path.endsWith(".mdx"))
  .map((path) => {
    const source = readFileSync(join(docsDirectory, path), "utf8");
    const slug = path
      .replace(/\([^/]+\)\//g, "")
      .replace(/\.mdx$/, "")
      .replace(/(^|\/)index$/, "");
    const url = `/docs${slug ? `/${slug}` : ""}`;
    return {
      path,
      source,
      url,
      markdownUrl: `/docs/${slug || "index"}.md`,
      title: /^title: (.+)$/m.exec(source)![1],
      description: /^description: (.+)$/m.exec(source)![1],
    };
  });

test("production Markdown endpoints export every page once and preserve readable content", async ({
  request,
}) => {
  const indexResponse = await request.get(`${site}/llms.txt`);
  expect(indexResponse.status()).toBe(200);
  expect(indexResponse.headers()["content-type"]).toContain("text/plain");
  const index = await indexResponse.text();
  expect(index).toContain("# AudioBits Documentation");
  for (const section of [
    "Getting Started",
    "Runtime Reference",
    "Catalog & Editable Source",
    "AI Agents",
  ]) {
    expect(index).toContain(section);
  }
  expect(
    index.match(/\]\(https:\/\/www\.audiobits\.dev\/docs[^)]*\)/g),
  ).toHaveLength(docs.length);

  const fullResponse = await request.get(`${site}/llms-full.txt`);
  expect(fullResponse.status()).toBe(200);
  expect(fullResponse.headers()["content-type"]).toContain("text/plain");
  const full = await fullResponse.text();
  expect(full.match(/^# /gm)).toHaveLength(docs.length);

  for (const doc of docs) {
    expect(index).toContain(`[${doc.title}](${canonical}${doc.url})`);
    const response = await request.get(`${site}${doc.markdownUrl}`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/markdown");
    const markdown = await response.text();
    expect(markdown).toContain(`# ${doc.title}\n\nURL: ${canonical}${doc.url}`);
    expect(markdown).toContain(doc.description);
    expect(full.split(`# ${doc.title}\n`).length - 1).toBe(1);
    expect(full).toContain(markdown.trim());
    expect(markdown).not.toMatch(
      /<\/?(?:PackageChannel|Cards?|Tabs?|Callout|Steps?|Files?|Folder)\b|^---\n|\[#/m,
    );
    expect(markdown).not.toContain("\0");
    // Compare the actual authored fences, including imports and indentation.
    for (const fence of doc.source.matchAll(/```[^\n]*\n[\s\S]*?```/g)) {
      expect(markdown).toContain(fence[0]);
    }
    for (const link of doc.source.matchAll(/\]\((\/[^)]*)\)/g)) {
      expect(markdown).toContain(`](${canonical}${link[1]})`);
    }
  }

  const intro = await (await request.get(`${site}/docs/index.md`)).text();
  const { version } = JSON.parse(
    readFileSync("packages/audiobits/package.json", "utf8"),
  );
  expect(intro).toContain(`AudioBits API · ${version} · Available on npm.`);
  expect(intro).toContain(
    "**[Runtime](https://www.audiobits.dev/docs#install-the-runtime)**",
  );
  expect(intro).toContain(
    "**[AI Agents](https://www.audiobits.dev/docs/agents)**",
  );
  expect(intro).toContain(
    "> **Start audio from a user gesture**\n>\n> Create the engine",
  );
  expect(intro).toContain("**pnpm**\n\n```sh\npnpm add audiobits\n```");
  const catalog = await (await request.get(`${site}/docs/catalog.md`)).text();
  expect(catalog).toMatch(/- src\/\n\s+- sounds\/\n\s+- recipes\//);
  expect(catalog).toContain("- recipe.ts");
  expect(catalog).toContain("- progress.ts");
  expect(catalog).toContain("### Discover and inspect an item");
});

test("unknown Markdown pages and invalid content paths return 404", async ({
  request,
}) => {
  for (const path of [
    "/docs/does-not-exist.md",
    "/docs/runtime/api.md",
    "/llms.mdx/docs/api/not-markdown",
  ]) {
    expect((await request.get(`${site}${path}`)).status()).toBe(404);
  }
});

test("page actions copy the current page after navigation and link to pathless MDX sources", async ({
  page,
  context,
  request,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  for (const url of ["/docs", "/docs/catalog", "/docs/agents", "/docs/api"]) {
    const doc = docs.find((doc) => doc.url === url)!;
    if (url === "/docs") await page.goto(`${site}${url}`);
    else {
      // Keep the client mounted to detect stale page URLs/cached clipboard data.
      await page.locator(`.prose a[href="${url}"]`).first().click();
      await expect(page).toHaveURL(`${site}${url}`);
    }
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(doc.title);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `${canonical}${url}`,
    );
    const actions = page.getByRole("group", { name: "Page actions" });
    const github = actions.getByRole("link", { name: "View on GitHub" });
    const githubUrl = await github.getAttribute("href");
    expect(decodeURIComponent(githubUrl!)).toBe(
      `https://github.com/joacod/audiobits/blob/main/${docsDirectory}/${doc.path}`,
    );
    await expect(github).toHaveAttribute("target", "_blank");
    const openMarkdown = actions.getByRole("link", { name: "Open Markdown" });
    await expect(openMarkdown).toHaveAttribute("href", doc.markdownUrl);
    await expect(openMarkdown).toHaveAttribute("target", "_blank");
    await expect(actions.getByRole("link")).toHaveCount(2);

    const expected = await (
      await request.get(`${site}${doc.markdownUrl}`)
    ).text();
    await actions.getByRole("button", { name: "Copy Markdown" }).click();
    await expect(
      actions.getByRole("button", { name: "Copied Markdown" }),
    ).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      expected,
    );
    await expect(page.locator("#nd-page > .prose")).not.toContainText(
      "<PackageChannel",
    );
  }
});
