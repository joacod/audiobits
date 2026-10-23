import { expect, test } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import {
  bundledDetailDescription,
  catalogEntries,
  catalogEntriesByCategory,
  experienceDetailDescription,
} from "../apps/www/lib/catalog";
import { siteUrl } from "../apps/www/lib/site-url";

const docs = readdirSync("apps/www/content/docs", { recursive: true })
  .filter((file) => file.endsWith(".mdx"))
  .map((file) => {
    const content = readFileSync(`apps/www/content/docs/${file}`, "utf8");
    const slugs = file
      .slice(0, -4)
      .split("/")
      .filter((segment) => !/^\(.+\)$/.test(segment) && segment !== "index");
    return {
      path: ["/docs", ...slugs].join("/"),
      title: content.match(/^title: (.+)$/m)![1],
      description: content.match(/^description: (.+)$/m)![1],
    };
  });

const decode = (text: string) =>
  text
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
const tags = (html: string, tag: string) =>
  [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>`, "g"))].map(([element]) =>
    Object.fromEntries(
      [...element.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, key, value]) => [
        key,
        decode(value),
      ]),
    ),
  );
const text = (html: string) =>
  decode(html.replace(/<[^>]*>/g, "").replace(/<!--.*?-->/g, ""));

test("every production route has canonical metadata, installed commands and ordered pagination", () => {
  const routes = [
    {
      path: "/",
      title: "AudioBits | Procedural Sound Effects",
      description:
        "A tiny Web Audio engine plus a catalog of sounds you copy into your app and own. Play them, tweak them live, or let your coding agent add them.",
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
    const html = readFileSync(
      `apps/www/.next/server/app/${route.path === "/" ? "index" : route.path.slice(1)}.html`,
      "utf8",
    ).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "");
    expect(
      decode(html.match(/<title>([\s\S]*?)<\/title>/)![1]),
      route.path,
    ).toBe(route.title);
    const metas = tags(html, "meta");
    expect(
      metas.find((tag) => tag.name === "description")?.content,
      route.path,
    ).toBe(route.description);
    expect(
      metas
        .filter((tag) => tag.name === "robots")
        .map((tag) => tag.content)
        .join(" "),
    ).not.toMatch(/noindex/i);
    expect(tags(html, "link").filter((tag) => tag.rel === "canonical")).toEqual(
      [
        {
          rel: "canonical",
          href: new URL(route.path, siteUrl).toString().replace(/\/$/, ""),
        },
      ],
    );
    expect([...html.matchAll(/<h1\b/g)], route.path).toHaveLength(1);
    expect(text(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)![1]).trim()).not.toBe(
      "",
    );
    const links = tags(html, "a");
    expect(
      links.filter((tag) => /^\/(sounds|experiences)(?:\/|$)/.test(tag.href)),
    ).toEqual([]);
    if (route.path === "/catalog") {
      const cards = [
        ...html.matchAll(
          /<article\b[^>]*data-catalog-entry="([^"]+)"[^>]*>([\s\S]*?)<\/article>/g,
        ),
      ];
      expect(cards.map(([, slug]) => slug)).toEqual(
        catalogEntries.map((entry) => entry.slug),
      );
      for (const [index, card] of cards.entries()) {
        const entry = catalogEntries[index];
        expect(text(card[2])).toContain(entry.title);
        expect(text(card[2])).toContain(entry.description);
        expect(tags(card[2], "a")).toEqual([
          expect.objectContaining({ href: entry.href }),
        ]);
      }
    }
    const entry = catalogEntries.find((entry) => entry.href === route.path);
    if (!entry) continue;
    const item =
      entry.category === "experience" ? entry.source.item : entry.slug;
    expect(text(html)).toContain(
      `npx shadcn@latest add joacod/audiobits/${item}`,
    );
    expect(links).toContainEqual(
      expect.objectContaining({ href: "/docs/catalog#install-source" }),
    );
    expect(text(html)).toContain("Installs the catalog defaults");
    const index = catalogEntries.indexOf(entry);
    for (const [rel, neighbor] of [
      ["prev", catalogEntries[index - 1]],
      ["next", catalogEntries[index + 1]],
    ] as const) {
      const pagination = links.filter((link) => link.rel === rel);
      expect(pagination, `${route.path} ${rel}`).toEqual(
        neighbor ? [expect.objectContaining({ href: neighbor.href, rel })] : [],
      );
    }
  }
});
