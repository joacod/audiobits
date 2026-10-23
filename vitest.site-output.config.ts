import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { include: ["tests/site-output.test.ts"] },
});
