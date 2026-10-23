import { defineConfig } from "@playwright/test";
import { shared } from "./playwright.shared";

export default defineConfig({
  ...shared,
  testMatch: [
    "audio.spec.ts",
    "automation.spec.ts",
    "delay.spec.ts",
    "release.spec.ts",
    "dynamic.spec.ts",
    "mixing.spec.ts",
  ],
  grepInvert: /@site/,
  webServer: {
    command:
      "pnpm --filter @audiobits/vanilla preview --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
  },
});
