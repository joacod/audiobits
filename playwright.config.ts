import { defineConfig } from "@playwright/test";
import { shared } from "./playwright.shared";

export default defineConfig({
  ...shared,
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
