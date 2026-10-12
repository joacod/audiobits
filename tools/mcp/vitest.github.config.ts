import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tools/mcp/github.test.ts"],
    testTimeout: 15000,
    hookTimeout: 30000,
  },
});
