import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import { siteUrl } from "./lib/site-url";

export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    postprocess: {
      includeProcessedMarkdown: {
        output: "function",
        headingIds: false,
        stringify(node, _parent, state, info) {
          if (node.type === "link" && node.url.startsWith("/")) {
            const title = node.title ? ` ${JSON.stringify(node.title)}` : "";
            return `[${state.containerPhrasing(node, info)}](${new URL(node.url, siteUrl).href}${title})`;
          }
        },
      },
    },
  },
});
export default defineConfig({
  mdxOptions: {
    remarkStructureOptions: {
      // Index readable content inside MDX components, not their JSX markup.
      types: ["heading", "paragraph", "blockquote", "tableCell"],
    },
  },
});
