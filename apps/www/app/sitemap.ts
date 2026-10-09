import type { MetadataRoute } from "next";
import { soundKinds } from "../lib/gallery";
import { source } from "../lib/source";
import { siteUrl } from "../lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "/",
    "/sounds",
    ...soundKinds.map((slug) => `/sounds/${slug}`),
    ...source.getPages().map((page) => page.url),
  ];
  const urls = paths.map((path) =>
    new URL(path, siteUrl).toString().replace(/\/$/, ""),
  );
  return [...new Set(urls)].map((url) => ({ url }));
}
