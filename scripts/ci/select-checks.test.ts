import { expect, test } from "vitest";
import { selectChecks } from "./select-checks.mjs";

test("main always receives every browser", () => {
  expect(selectChecks([], true)).toEqual({
    chromium: true,
    crossBrowser: true,
  });
});
test("prose skips browsers, showcase and tuning use Chromium", () => {
  expect(selectChecks(["docs/development.md", "README.md"])).toEqual({
    chromium: false,
    crossBrowser: false,
  });
  for (const path of [
    "apps/www/app/page.tsx",
    "apps/www/content/docs/api.mdx",
    "packages/audiobits/src/recipes/index.ts",
    "packages/audiobits/README.md",
    "packages/audiobits/skill/SKILL.md",
  ])
    expect(selectChecks([path])).toEqual({
      chromium: true,
      crossBrowser: false,
    });
});
test("browser behavior and unknown paths cannot bypass the matrix", () => {
  for (const path of [
    "packages/audiobits/src/runtime/engine.ts",
    "packages/audiobits/src/compiler/plan.ts",
    "playwright.config.ts",
    "apps/www/app/sound-gallery.tsx",
    "apps/www/app/output-scope.tsx",
    "apps/www/lib/raw-example.ts",
    "tests/browser/gallery.spec.ts",
    "scripts/ci/setup-linux-audio.sh",
    ".github/workflows/ci.yml",
    "pnpm-lock.yaml",
    "new-infrastructure.json",
  ])
    expect(selectChecks(["apps/www/app/page.tsx", path])).toEqual({
      chromium: true,
      crossBrowser: true,
    });
});
