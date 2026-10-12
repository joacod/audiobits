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
      title: "AudioBits | Procedural Sound Effects",
      description:
        "Hear, customize, and integrate procedural sound effects generated in your browser with Web Audio.",
    },
    {
      path: "/catalog",
      title: "AudioBits | Catalog",
      description:
        "Browse interactive experiences and catalog sounds. Play a recipe, then open its workbench or the full example.",
    },
    ...catalogEntriesByCategory("experience").map((entry) => ({
      path: entry.href,
      title: `AudioBits | ${entry.title}`,
      description: experienceDetailDescription(entry),
    })),
    ...catalogEntriesByCategory("bundled").map((entry) => ({
      path: entry.href,
      title: `AudioBits | ${entry.title}`,
      description: bundledDetailDescription(entry),
    })),
    ...docs.map((doc) => ({ ...doc, title: `AudioBits | ${doc.title}` })),
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
    if (route.path === "/") {
      await expect(page.locator("h1")).toHaveText("Sound that reacts.");
      await expect(page.locator(".charge-lede")).toContainText(
        "Procedural sound effects for the web.",
      );
      for (const selector of [
        'meta[property="og:image:alt"]',
        'meta[name="twitter:image:alt"]',
      ]) {
        await expect(page.locator(selector)).toHaveAttribute(
          "content",
          "audiobits: SOUND THAT REACTS. procedural sound effects for the web. Bold white lettering and a blue-to-purple-to-pink waveform on a near-black background.",
        );
      }
    }
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

test("social metadata resolves to matching generated OG and Twitter cards", async ({
  page,
  request,
}) => {
  await page.goto(home);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
  );
  const images: Buffer[] = [];
  for (const [selector, route] of [
    ['meta[property="og:image"]', "/opengraph-image"],
    ['meta[name="twitter:image"]', "/twitter-image"],
  ]) {
    const imageUrl = await page.locator(selector).getAttribute("content");
    expect(imageUrl).toBeTruthy();
    const url = new URL(imageUrl!);
    expect(url.origin).toBe(siteUrl);
    expect(url.pathname).toBe(route);
    const response = await request.get(`${home}${url.pathname}${url.search}`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");
    const png = await response.body();
    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(png.subarray(12, 16).toString()).toBe("IHDR");
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
    images.push(png);
  }
  expect(images[1].equals(images[0])).toBe(true);
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
  for (const path of [
    "/sounds",
    ...catalogEntries.map((entry) => `/sounds/${entry.slug}`),
    "/sounds/not-a-sound",
    "/experiences/energy-charge",
    "/experiences/reactive-thruster",
    "/catalog/not-a-sound",
    "/experiences/not-a-page",
    "/docs/not-a-page",
  ]) {
    const response = await request.get(`${home}${path}`, { maxRedirects: 0 });
    expect(response.status(), path).toBe(404);
    expect(response.headers().location, path).toBeUndefined();
  }
});
