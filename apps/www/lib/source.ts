import { llms, loader } from "fumadocs-core/source";
import { docs } from "../.source/server";
import { markdownComponents } from "./docs-markdown";
import { siteUrl } from "./site-url";

export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
});

export const docsLlms = llms(source, {
  renderName(node) {
    if (node === source.getPageTree()) return "AudioBits Documentation";
    if (node.type === "page")
      return source.getNodePage(node)?.data.title ?? String(node.name);
    return String(node.name);
  },
  async renderPage(page) {
    const content = await page.data.getText("processed", {
      components: markdownComponents,
    });
    return `# ${page.data.title}\n\nURL: ${new URL(page.url, siteUrl).href}\n\n${page.data.description ?? ""}\n\n${content.trim()}\n`;
  },
});
