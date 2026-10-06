import { expect, test } from "@playwright/test";

test("site uses public exports and keyboard-operated Base UI control", async ({
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
    page.getByText("Unreleased · Workspace foundation"),
  ).toBeVisible();
  await expect(page.getByTestId("workspace-status")).toHaveText(
    "AudioBits workspace ready",
  );
  await page.getByRole("link", { name: "Development docs" }).focus();
  await page.keyboard.press("Tab");
  const details = page.getByRole("button", { name: "Workspace details" });
  await expect(details).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(details).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#workspace-details")).toBeVisible();
  await page.keyboard.press("Space");
  await expect(page.locator("#workspace-details")).toBeHidden();
  expect(errors).toEqual([]);
});

test("Fumadocs renders development MDX", async ({ page }) => {
  await page.goto("http://127.0.0.1:3100/docs");
  await expect(
    page.getByRole("heading", { name: "Workspace foundation", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("AudioBits is unreleased.", { exact: false }),
  ).toBeVisible();
});

test("vanilla consumer displays the built package export", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173");
  await expect(page.locator("#status")).toHaveText("AudioBits workspace ready");
});
