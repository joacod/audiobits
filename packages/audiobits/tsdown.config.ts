import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "es2022",
  dts: true,
  clean: true,
  copy: ["src/recipe/schema.json", "src/recipe/capabilities.json"],
  sourcemap: false,
  outExtensions: () => ({ js: ".js", dts: ".d.ts" }),
});
