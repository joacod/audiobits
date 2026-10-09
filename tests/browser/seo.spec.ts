import { expect, test } from "@playwright/test";
import { readFileSync, readdirSync } from "node:fs";
import { soundInfo, soundKinds } from "../../apps/www/lib/gallery";
import { siteUrl } from "../../apps/www/lib/site-url";

const home = "http://127.0.0.1:3100";
const docs = readdirSync("apps/www/content/docs")
  .filter((file) => file.endsWith(".mdx"))
  .map((file) => {
    const content = readFileSync(`apps/www/content/docs/${file}`, "utf8");
    return {
      path: file === "index.mdx" ? "/docs" : `/docs/${file.slice(0, -4)}`,
      title: content.match(/^title: (.+)$/m)![1],
      description: content.match(/^description: (.+)$/m)![1],
    };
  });

test.use({ javaScriptEnabled: false });

test("public pages expose unique metadata and content without JavaScript", async ({
  page,
}) => {
  const routes = [
    {
      path: "/",
      title: "AudioBits: Procedural Sound Effects for the Web",
      description:
        "Hear, customize, and integrate procedural sound effects generated in your browser with Web Audio.",
    },
    {
      path: "/sounds",
      title: "Sound collection | AudioBits",
      description:
        "Explore the bundled procedural sound effects. Play, compare, and customize sounds for interfaces and games, then open their code workbenches.",
    },
    ...soundKinds.map((slug) => ({
      path: `/sounds/${slug}`,
      title: `${soundInfo[slug].title} sound workbench | AudioBits`,
      description: `${soundInfo[slug].description} ${soundInfo[slug].use}. Play, customize, and integrate with AudioBits.`,
    })),
    ...docs.map((doc) => ({ ...doc, title: `${doc.title} | AudioBits` })),
  ];
  expect(new Set(routes.map((route) => route.title)).size).toBe(routes.length);
  for (const route of routes) {
    const response = await page.goto(`${home}${route.path}`);
    expect(response?.status(), route.path).toBe(200);
    expect(response?.headers()["x-robots-tag"] ?? "").not.toMatch(/noindex/i);
    await expect(page).toHaveTitle(route.title);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      route.description,
    );
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
    await expect(canonical).toHaveAttribute(
      "href",
      new URL(route.path, siteUrl).toString().replace(/\/$/, ""),
    );
    expect(
      await page
        .locator('meta[name="robots"]')
        .evaluateAll((tags) =>
          tags.map((tag) => tag.getAttribute("content")).join(" "),
        ),
    ).not.toMatch(/noindex/i);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).not.toBeEmpty();
    if (route.path.startsWith("/docs")) {
      await expect(page.locator('a[href="/docs/api"]').first()).toBeAttached();
    }
    if (!route.path.startsWith("/docs")) {
      await expect(page.locator("main")).toContainText("npm install audiobits");
      await expect(page.locator('a[href="/docs"]').first()).toBeAttached();
    }
  }
  await page.goto(`${home}/sounds`);
  for (const slug of soundKinds) {
    await expect(
      page.locator(`a[href="/sounds/${slug}"]`).first(),
    ).toBeAttached();
  }
});

test("crawl files cover exactly the public pages and invalid routes stay 404", async ({
  request,
  page,
}) => {
  const robots = await request.get(`${home}/robots.txt`);
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toBe(
    `User-Agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
  );
  const sitemap = await request.get(`${home}/sitemap.xml`);
  expect(sitemap.status()).toBe(200);
  expect(sitemap.headers()["content-type"]).toContain("xml");
  const xml = await sitemap.text();
  // Parse as XML rather than accepting a list of URLs inside malformed markup.
  const urls = await page.evaluate((text) => {
    const document = new DOMParser().parseFromString(text, "application/xml");
    if (document.querySelector("parsererror")) throw new Error("Invalid XML");
    if (
      document.documentElement.namespaceURI !==
      "http://www.sitemaps.org/schemas/sitemap/0.9"
    )
      throw new Error("Invalid sitemap namespace");
    return [...document.querySelectorAll("loc")].map((loc) => loc.textContent);
  }, xml);
  const paths = [
    "/",
    "/sounds",
    ...soundKinds.map((slug) => `/sounds/${slug}`),
    ...docs.map((doc) => doc.path),
  ];
  expect(urls.sort()).toEqual(
    paths
      .map((path) => new URL(path, siteUrl).toString().replace(/\/$/, ""))
      .sort(),
  );
  expect(xml).not.toMatch(/lastmod|image:|video:/);
  for (const url of urls) {
    expect(new URL(url!).origin).toBe(siteUrl);
    const response = await request.get(`${home}${new URL(url!).pathname}`);
    expect(response.status(), url!).toBe(200);
  }
  for (const path of ["/sounds/not-a-sound", "/docs/not-a-page"]) {
    const response = await request.get(`${home}${path}`);
    expect(response.status(), path).toBe(404);
  }
});
