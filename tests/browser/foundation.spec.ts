import { expect, test } from "@playwright/test";

test("site uses public exports and keyboard-operated Base UI playback", async ({
  page,
  browser,
}) => {
  console.log(`Chromium ${browser.version()}`);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:3100");
  await expect(
    page.getByRole("heading", { name: "AudioBits", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Unreleased · 0.1.0-rc.0 · Local workspace package"),
  ).toBeVisible();
  const play = page.getByRole("button", { name: "Play confirmation" });
  await play.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toHaveText("Audio: running");
  expect(errors).toEqual([]);
});

test("Fumadocs renders development MDX", async ({ page }) => {
  await page.goto("http://127.0.0.1:3100/docs");
  await expect(
    page.getByRole("heading", { name: "Quick start", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("AudioBits is unreleased.", { exact: false }),
  ).toBeVisible();
});

test("vanilla consumer displays the built package export", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173");
  await expect(page.locator("#status")).toHaveText("AudioBits workspace ready");
});
