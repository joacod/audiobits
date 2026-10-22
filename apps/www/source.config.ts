import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import type { remarkLLMs } from "fumadocs-core/mdx-plugins/remark-llms";
import { replaceSource } from "fumadocs-core/mdx-plugins/stringifier";
import { siteUrl } from "./lib/site-url";

function remarkAbsoluteLinks(): ReturnType<typeof remarkLLMs> {
  return (tree, file) => {
    function visit(node: Parameters<typeof replaceSource>[1]) {
      if (node.type === "link" && node.url.startsWith("/")) {
        const title = node.title ? ` ${JSON.stringify(node.title)}` : "";
        replaceSource(
          file,
          node,
          (source) =>
            `[${source.inner(node)}](${new URL(node.url, siteUrl).href}${title})`,
        );
      }
      if ("children" in node) node.children.forEach(visit);
    }
    visit(tree);
  };
}

export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    postprocess: {
      includeProcessedMarkdown: {
        output: "function",
        headingIds: false,
      },
    },
  },
});
export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkAbsoluteLinks],
    remarkStructureOptions: {
      // Index readable content inside MDX components, not their JSX markup.
      types: ["heading", "paragraph", "blockquote", "tableCell"],
    },
  },
});
