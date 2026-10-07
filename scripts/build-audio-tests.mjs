import { createRequire } from "node:module";
const require = createRequire(
  new URL("../packages/audiobits/package.json", import.meta.url),
);
const { build } = await import(require.resolve("tsdown"));
await build({
  entry: ["tests/browser/audio-harness.ts"],
  format: "iife",
  platform: "browser",
  target: "es2022",
  outDir: "node_modules/.cache/audiobits-audio-tests",
  dts: false,
  clean: true,
});
