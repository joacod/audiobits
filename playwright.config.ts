import { defineConfig } from "@playwright/test";
import { shared } from "./playwright.shared";

const suite = process.env.AUDIOBITS_BROWSER_SUITE ?? "required";
if (!["required", "regression", "full"].includes(suite))
  throw new Error(`Unknown browser suite: ${suite}`);

export default defineConfig({
  ...shared,
  grep: suite === "required" ? /@required/ : undefined,
  grepInvert: suite === "regression" ? /@extended/ : undefined,
  globalTimeout:
    suite === "full" ? 300_000 : suite === "regression" ? 180_000 : 90_000,
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
