import { defineConfig } from "@playwright/test";
import { shared, runtimeSpecs } from "./playwright.shared";

const suite = process.env.AUDIOBITS_BROWSER_SUITE ?? "required";
if (!["required", "regression", "full"].includes(suite))
  throw new Error(`Unknown browser suite: ${suite}`);

const files = JSON.parse(process.env.AUDIOBITS_BROWSER_FILES ?? "[]");
if (
  !Array.isArray(files) ||
  !files.every(
    (file) =>
      typeof file === "string" &&
      /^tests\/browser\/[\w-]+\.spec\.ts$/.test(file),
  )
)
  throw new Error("Invalid selected browser files");
// Playwright's grep title includes the filename. Select the union in one run,
// so required cases in edited files are never executed a second time.
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const selected = files.map((file) => escape(file.split("/").at(-1)!));
const grep =
  suite === "required"
    ? /@required/
    : suite === "regression" && selected.length
      ? new RegExp(`@required|(?:^|[\\s/])(?:${selected.join("|")})(?:\\s|$)`)
      : undefined;

// Native cases already ran through the standalone runtime configuration. Mixed
// files still contribute their @site regressions to this website execution.
const regressionExclusions = selected.length
  ? new RegExp(
      `@extended|(?:^|[\\s/])(?:${runtimeSpecs.map(escape).join("|")})(?:\\s|$)(?!.*@site)`,
    )
  : /@extended/;

export default defineConfig({
  ...shared,
  grep,
  grepInvert: suite === "regression" ? regressionExclusions : undefined,
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
