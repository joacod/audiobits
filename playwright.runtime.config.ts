import { defineConfig } from "@playwright/test";
import { shared, runtimeSpecs } from "./playwright.shared";

export default defineConfig({
  ...shared,
  testMatch: runtimeSpecs,
  grepInvert: /@site/,
  webServer: {
    command:
      "pnpm --filter @audiobits/vanilla preview --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
  },
});
