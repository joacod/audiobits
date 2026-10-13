import { defineConfig, defineDocs } from "fumadocs-mdx/config";

export const docs = defineDocs({ dir: "content/docs" });
export default defineConfig({
  mdxOptions: {
    remarkStructureOptions: {
      // Index readable content inside MDX components, not their JSX markup.
      types: ["heading", "paragraph", "blockquote", "tableCell"],
    },
  },
});
