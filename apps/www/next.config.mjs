import { createMDX } from "fumadocs-mdx/next";

export default createMDX()({
  reactStrictMode: true,
  transpilePackages: ["audiobits"],
  async rewrites() {
    return [
      {
        source: "/docs/:slug*.md",
        destination: "/llms.mdx/docs/:slug*/content.md",
      },
    ];
  },
});
