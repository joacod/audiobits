import { expect, test } from "@playwright/test";

const site = "http://127.0.0.1:3100";

for (const mobile of [false, true]) {
  test(`docs branding and persistent theme on ${mobile ? "mobile" : "desktop"}`, async ({
    page,
  }) => {
    await page.setViewportSize(
      mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
    );
    await page.goto(`${site}/docs/api`);

    for (const theme of ["light", "dark"]) {
      const sidebar = page.locator(
        mobile ? "#nd-sidebar-mobile" : "#nd-sidebar",
      );
      if (mobile)
        await page
          .locator("#nd-subnav")
          .getByRole("button", { name: "Open Sidebar", exact: true })
          .click();
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

      // The desktop scroll area is the last child; the empty mobile footer is hidden.
      if (mobile)
        await expect(
          sidebar.locator(":scope > div:last-child"),
        ).not.toBeVisible();
      else
        await expect(
          sidebar.locator(
            ":scope > div:last-child [data-radix-scroll-area-viewport]",
          ),
        ).toBeVisible();
      await expect(
        sidebar.getByRole("button", { name: "Toggle Theme" }),
      ).toHaveCount(mobile ? 1 : 0);
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
}
