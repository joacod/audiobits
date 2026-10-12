import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tools/mcp/unit.test.ts", "tools/mcp/protocol.test.ts"],
    testTimeout: 15000,
    hookTimeout: 30000,
  },
});
