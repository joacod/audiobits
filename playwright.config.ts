import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  failOnFlakyTests: !!process.env.CI,
  use: { trace: process.env.CI ? "retain-on-failure" : "off" },
  reporter: "list",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "pnpm --filter @audiobits/www start --port 3100",
      url: "http://127.0.0.1:3100",
      reuseExistingServer: false,
    },
    {
      command:
        "pnpm --filter @audiobits/vanilla preview --port 4173 --strictPort",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: false,
    },
  ],
});
