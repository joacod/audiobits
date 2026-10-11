import { expect, test } from "@playwright/test";
import { readFileSync, readdirSync } from "node:fs";
import {
  bundledDetailDescription,
  catalogEntries,
  catalogEntriesByCategory,
  experienceDetailDescription,
} from "../../apps/www/lib/catalog";
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
      title: "AudioBits | Procedural Sound Effects for the Web",
      description:
        "Hear, customize, and integrate procedural sound effects generated in your browser with Web Audio.",
    },
    {
      path: "/catalog",
      title: "Catalog | AudioBits",
      description:
        "Browse interactive experiences and bundled sounds. Play a recipe, then open its workbench or the full example.",
    },
    ...catalogEntriesByCategory("experience").map((entry) => ({
      path: entry.href,
      title: `${entry.title} | AudioBits`,
      description: experienceDetailDescription(entry),
    })),
    ...catalogEntriesByCategory("bundled").map((entry) => ({
      path: entry.href,
      title: `${entry.title} | AudioBits`,
      description: bundledDetailDescription(entry),
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
    expect(
      await page.locator('a[href^="/sounds"], a[href^="/experiences"]').count(),
      route.path,
    ).toBe(0);
    if (route.path === "/catalog") {
      for (const entry of catalogEntries) {
        await expect(
          page.locator(`a[href="${entry.href}"]`).first(),
        ).toBeAttached();
      }
    }
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
    "/catalog",
    ...catalogEntries.map((entry) => entry.href),
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
    const response = await request.get(`${home}${new URL(url!).pathname}`, {
      maxRedirects: 0,
    });
    expect(response.status(), url!).toBe(200);
  }
  const legacy = [
    ["/sounds", "/catalog"],
    ...catalogEntries.map((entry) => [`/sounds/${entry.slug}`, entry.href]),
    ["/experiences/energy-charge", "/catalog/energy-charge"],
    ["/experiences/reactive-thruster", "/catalog/reactive-thruster"],
  ] as const;
  for (const [from, to] of legacy) {
    const response = await request.get(`${home}${from}?kept=1`, {
      maxRedirects: 0,
    });
    expect(response.status(), from).toBe(308);
    const location = new URL(response.headers().location ?? "", home);
    expect(location.pathname, from).toBe(to);
    expect(location.search, from).toBe("?kept=1");
    const followed = await request.get(`${home}${from}`);
    expect(followed.status(), from).toBe(200);
    expect(new URL(followed.url()).pathname, from).toBe(to);
  }
  const legacyMissing = await request.get(`${home}/sounds/not-a-sound`, {
    maxRedirects: 0,
  });
  expect(legacyMissing.status()).toBe(308);
  expect(new URL(legacyMissing.headers().location ?? "", home).pathname).toBe(
    "/catalog/not-a-sound",
  );
  expect((await request.get(`${home}/sounds/not-a-sound`)).status()).toBe(404);
  for (const path of [
    "/catalog/not-a-sound",
    "/experiences/not-a-page",
    "/docs/not-a-page",
  ]) {
    const response = await request.get(`${home}${path}`, { maxRedirects: 0 });
    expect(response.status(), path).toBe(404);
  }
});
