import { expect, test } from "@playwright/test";

const site = "http://127.0.0.1:3100";

test("docs branding and persistent theme across reloads", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${site}/docs/api`);

  for (const theme of ["light", "dark"]) {
    const sidebar = page.locator("#nd-sidebar");
    const utilities = page
      .getByRole("group", { name: "Documentation utilities" })
      .filter({ visible: true });
    await expect(utilities).toHaveCount(1);
    const toggle = utilities.getByRole("button", { name: "Toggle Theme" });
    await toggle.click();
    await expect(page.locator("html")).toHaveClass(new RegExp(theme));
    await expect(
      page
        .getByRole("button", { name: "Toggle Theme" })
        .filter({ visible: true }),
    ).toHaveCount(1);
    await expect(
      utilities.getByRole("link", { name: "AudioBits on GitHub" }),
    ).toHaveAttribute("href", "https://github.com/joacod/audiobits");
    await expect(
      utilities.getByRole("link", { name: "AudioBits on npm" }),
    ).toHaveAttribute("href", "https://www.npmjs.com/package/audiobits");

    const active = sidebar.locator('a[data-active="true"]');
    await expect(active).toHaveAttribute("href", "/docs/api");
    await expect(active).toBeInViewport();
    const inactive = sidebar.locator('a[data-active="false"]').first();
    await inactive.hover();
    const selectedStyle = await active.evaluate((link) => ({
      color: getComputedStyle(link).color,
      background: getComputedStyle(link).backgroundColor,
    }));
    const hoverStyle = await inactive.evaluate((link) => ({
      color: getComputedStyle(link).color,
      background: getComputedStyle(link).backgroundColor,
    }));
    expect(selectedStyle.color).not.toBe(hoverStyle.color);
    expect(selectedStyle.background).not.toBe(hoverStyle.background);
    // Render the CSS color to RGB: the brand tint must be purple, not neutral.
    const [red, green, blue] = await active.evaluate((link) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const context = canvas.getContext("2d")!;
      context.fillStyle = getComputedStyle(link).color;
      context.fillRect(0, 0, 1, 1);
      return Array.from(context.getImageData(0, 0, 1, 1).data);
    });
    expect(red).toBeGreaterThan(green);
    expect(blue).toBeGreaterThan(red);

    const siteNavigation = sidebar.getByRole("navigation", {
      name: "AudioBits site",
    });
    await expect(siteNavigation).toBeInViewport();
    await expect(
      siteNavigation.getByRole("link", { name: "Home" }),
    ).toHaveAttribute("href", "/");
    await expect(
      siteNavigation.getByRole("link", { name: "Catalog" }),
    ).toHaveAttribute("href", "/catalog");
    await expect(
      sidebar.getByRole("button", { name: "Toggle Theme" }),
    ).toHaveCount(0);
    await page.reload();
    await expect(page.locator("html")).toHaveClass(new RegExp(theme));
    expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe(
      theme,
    );
  }

  const brand = page
    .getByRole("link", { name: "AudioBits", exact: true })
    .filter({ visible: true });
  await expect(brand).toHaveAttribute("href", "/docs");
  await expect(brand.locator("svg")).toBeVisible();
  expect(
    await brand.locator("svg").evaluate((mark) => {
      const gradient = mark.querySelector("linearGradient")!;
      return document.getElementById(gradient.id)?.closest("svg") === mark;
    }),
  ).toBe(true);
  expect(
    await brand
      .locator("svg")
      .evaluate((mark) =>
        ["--void", "--signal-low", "--signal-mid", "--signal-high"].map(
          (token) => getComputedStyle(mark).getPropertyValue(token).trim(),
        ),
      ),
  ).toEqual(["#050507", "#2a6cff", "#b44cff", "#ff2e88"]);
  await brand.click();
  await expect(page).toHaveURL(`${site}/docs`);
});
