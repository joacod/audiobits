import { createMDX } from "fumadocs-mdx/next";

const legacyRoutes = [
  ["/sounds", "/catalog"],
  ["/sounds/:slug", "/catalog/:slug"],
  ["/experiences/energy-charge", "/catalog/energy-charge"],
  ["/experiences/reactive-thruster", "/catalog/reactive-thruster"],
];

export default createMDX()({
  reactStrictMode: true,
  transpilePackages: ["audiobits"],
  async redirects() {
    return legacyRoutes.map(([source, destination]) => ({
      source,
      destination,
      permanent: true,
    }));
  },
});
