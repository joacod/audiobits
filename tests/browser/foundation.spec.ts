import { expect, test } from "@playwright/test";
import manifest from "../../packages/audiobits/package.json" with { type: "json" };

test("site uses public exports and keyboard-operated thruster playback", async ({
  page,
  browser,
}) => {
  console.log(`${browser.browserType().name()} ${browser.version()}`);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:3100");
  await expect(page).toHaveTitle("AudioBits | Procedural Sound Effects");
  await expect(page.locator(".landing-own pre")).toHaveText(
    "npx shadcn@latest add joacod/audiobits/reactive-thruster",
  );
  await expect(
    page
      .locator(".landing-footer")
      .getByRole("link", { name: "npm", exact: true }),
  ).toHaveAttribute("href", "https://www.npmjs.com/package/audiobits");
  await expect(page.locator("main")).not.toContainText(
    /Local workspace package|Development|unpublished|not yet been published|prepared for stable publication/,
  );
  await expect(
    page.getByRole("heading", {
      name: "Sound that reacts.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText(`Available on npm · ${manifest.version}`),
  ).toBeVisible();
  const start = page.getByRole("button", {
    name: "Start thruster",
    exact: true,
  });
  await expect(start).toBeEnabled();
  await start.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Thruster: running",
  );
  expect(errors).toEqual([]);
});

test("Fumadocs renders package MDX", async ({ page }) => {
  await page.goto("http://127.0.0.1:3100/docs");
  await expect(page.locator("main pre").first()).toContainText(
    "npm install audiobits",
  );
  await expect(
    page.getByRole("heading", {
      name: "Introduction and quick start",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText(`AudioBits API · ${manifest.version} · Available on npm.`, {
      exact: false,
    }),
  ).toBeVisible();
});

test("Fumadocs keeps stock neutral styling and persists theme selection", async ({
  page,
}) => {
  // A fresh visitor starts dark even when the OS prefers light.
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("http://127.0.0.1:3100/docs");
  const root = page.locator("html");
  const body = page.locator("body");
  const sidebar = page.locator("#nd-sidebar");
  const code = page.locator("main pre code").first();
  const toggle = page.getByRole("button", {
    name: "Toggle Theme",
    exact: true,
  });
  await expect(root).toHaveClass(/dark/);
  await expect(body).toHaveCSS("background-color", "rgb(18, 18, 18)");
  await expect(body).toHaveCSS("color", "rgb(235, 235, 235)");
  await expect(sidebar).toHaveCSS("background-color", "rgb(25, 25, 25)");
  await expect(code).toHaveCSS("font-family", /ui-monospace/);

  for (const element of [root, body, sidebar, code]) {
    expect(
      await element.evaluate((node) =>
        ["--void", "--ink", "--font-display"].map((name) =>
          getComputedStyle(node).getPropertyValue(name).trim(),
        ),
      ),
    ).toEqual(["", "", ""]);
    await expect(element).not.toHaveCSS("font-family", /geistMono/);
  }

  await toggle.click();
  await expect(root).toHaveClass(/light/);
  await expect(body).toHaveCSS("background-color", "rgb(245, 245, 245)");
  await expect(body).toHaveCSS("color", "rgb(10, 10, 10)");
  await expect(sidebar).toHaveCSS("background-color", "rgb(241, 241, 241)");
  await expect(code).toHaveCSS("font-family", /ui-monospace/);
  await page.reload();
  await expect(root).toHaveClass(/light/);
  await expect(body).toHaveCSS("background-color", "rgb(245, 245, 245)");
  await toggle.click();
  await expect(root).toHaveClass(/dark/);
  await page.reload();
  await expect(root).toHaveClass(/dark/);
  await expect(body).toHaveCSS("background-color", "rgb(18, 18, 18)");
});

test("vanilla consumer displays the lazy public engine", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173");
  await expect(page.locator("#status")).toHaveText("AudioBits: idle");
});
