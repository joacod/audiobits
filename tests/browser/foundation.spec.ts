import { expect, test } from "@playwright/test";
import manifest from "../../packages/audiobits/package.json" with { type: "json" };

test("site uses public exports and keyboard-operated Base UI playback", async ({
  page,
  browser,
}) => {
  console.log(`${browser.browserType().name()} ${browser.version()}`);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:3100");
  await expect(page).toHaveTitle(
    "AudioBits: Procedural Sound Effects for the Web",
  );
  await expect(page.locator(".landing-footer pre")).toHaveText(
    "npm install audiobits",
  );
  await expect(page.locator("main")).not.toContainText(
    /Local workspace package|Development|unpublished|not yet been published|prepared for stable publication/,
  );
  await expect(
    page.getByRole("heading", {
      name: "Make interfaces sound alive.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText(`Available on npm · ${manifest.version}`),
  ).toBeVisible();
  const play = page.getByRole("button", { name: "Play glass" });
  await play.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Glass notification: playing",
  );
  expect(errors).toEqual([]);
});

test("Fumadocs renders package MDX", async ({ page }) => {
  await page.goto("http://127.0.0.1:3100/docs");
  await expect(page.locator("main pre").first()).toContainText(
    "npm install audiobits",
  );
  await expect(
    page.getByRole("heading", { name: "Quick start", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(`AudioBits API · ${manifest.version} · Available on npm.`, {
      exact: false,
    }),
  ).toBeVisible();
});

test("vanilla consumer displays the lazy public engine", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173");
  await expect(page.locator("#status")).toHaveText("AudioBits: idle");
});
