import { defineConfig, devices } from "@playwright/test";

export const runtimeSpecs = [
  "audio.spec.ts",
  "automation.spec.ts",
  "delay.spec.ts",
  "release.spec.ts",
  "dynamic.spec.ts",
  "mixing.spec.ts",
];

export const shared = defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 2,
  failOnFlakyTests: !!process.env.CI,
  use: { trace: process.env.CI ? "retain-on-failure" : "off" },
  reporter: "list",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
