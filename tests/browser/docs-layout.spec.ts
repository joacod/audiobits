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

for (const width of [375, 768, 1024, 1440]) {
  for (const theme of ["light", "dark"]) {
    test(`documentation fits ${width}px in ${theme} mode`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(
        (value) => localStorage.setItem("theme", value),
        theme,
      );
      for (const path of [
        "/docs",
        "/docs/catalog",
        "/docs/agents",
        "/docs/api",
      ]) {
        await page.goto(`${site}${path}`);
        await expect(page.locator("html")).toHaveClass(new RegExp(theme));
        await page.evaluate(() => document.fonts.ready);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(width);
        const controls = page
          .locator(
            'header a, header button, #nd-subnav button, [aria-label="Documentation utilities"] a, [aria-label="Documentation utilities"] button',
          )
          .filter({ visible: true });
        const boxes = await controls.evaluateAll(
          (elements, viewport) => {
            return elements.flatMap((element) => {
              const { x, y, width, height } = element.getBoundingClientRect();
              const onScreen =
                width > 0 &&
                height > 0 &&
                x < viewport.width &&
                x + width > 0 &&
                y < viewport.height &&
                y + height > 0;
              if (!onScreen) return [];
              return [
                {
                  label:
                    element.getAttribute("aria-label") ??
                    element.textContent?.trim(),
                  x,
                  y,
                  width,
                  height,
                },
              ];
            });
          },
          { width, height: 900 },
        );
        expect(boxes.length).toBeGreaterThan(0);
        for (const [index, box] of boxes.entries()) {
          expect(box.x, box.label ?? "control").toBeGreaterThanOrEqual(0);
          expect(box.x + box.width, box.label ?? "control").toBeLessThanOrEqual(
            width,
          );
          for (const other of boxes.slice(index + 1)) {
            const overlapX =
              Math.min(box.x + box.width, other.x + other.width) -
              Math.max(box.x, other.x);
            const overlapY =
              Math.min(box.y + box.height, other.y + other.height) -
              Math.max(box.y, other.y);
            expect(
              overlapX > 1 && overlapY > 1,
              `${box.label} overlaps ${other.label}`,
            ).toBe(false);
          }
        }
        if (width < 768) {
          await page
            .locator("#nd-subnav")
            .getByRole("button", { name: "Open Sidebar", exact: true })
            .click();
          const sidebar = page.locator("#nd-sidebar-mobile");
          await expect(sidebar).toBeVisible();
          await expect(
            sidebar.locator('a[data-active="true"]'),
          ).toBeInViewport();
          expect(
            await sidebar.evaluate((element) => element.scrollWidth),
          ).toBeLessThanOrEqual(width);
        }
      }
    });
  }
}

for (const width of [768, 1024, 1440]) {
  test(`collapsed docs navigation stays aligned at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${site}/docs`);
    const toc = page.locator("#nd-toc");
    if (width >= 1280) {
      const utilities = toc.getByRole("group", {
        name: "Documentation utilities",
      });
      await expect(utilities).toBeVisible();
      const utilitiesBox = (await utilities.boundingBox())!;
      const titleBox = (await toc.locator("#toc-title").boundingBox())!;
      expect(utilitiesBox.y + utilitiesBox.height).toBeLessThan(titleBox.y);
      expect(utilitiesBox.x).toBe(titleBox.x);
    } else {
      await expect(
        page.locator("#nd-sidebar").getByRole("group", {
          name: "Documentation utilities",
        }),
      ).toBeVisible();
    }
    await page
      .locator("#nd-sidebar")
      .getByRole("button", {
        name: "Collapse Sidebar",
        exact: true,
      })
      .click();
    const toolbar = page.locator(".audiobits-docs-collapsed-header");
    await expect(toolbar).toBeVisible();
    await expect(page.locator("[data-sidebar-panel]")).not.toBeVisible();
    await expect(page.locator("#nd-sidebar")).toHaveAttribute("inert", "");
    const expand = toolbar.getByRole("button", { name: "Expand Sidebar" });
    await expect(expand).toBeInViewport();
    // Read both positions in one frame while the native grid animates.
    const alignment = await page.evaluate(() => {
      const button = document
        .querySelector(".audiobits-docs-collapsed-header button")!
        .getBoundingClientRect();
      const heading = document
        .querySelector("#nd-page h1")!
        .getBoundingClientRect();
      return {
        offset: Math.abs(button.x - heading.x),
        gap: heading.y - button.bottom,
      };
    });
    expect(alignment.offset).toBeLessThanOrEqual(1);
    expect(alignment.gap).toBeGreaterThan(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await toolbar.getByRole("button", { name: "Open Search" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expand.click();
    await expect(page.locator("#nd-sidebar")).toHaveAttribute(
      "data-collapsed",
      "false",
    );
    await expect(toolbar).toHaveCount(0);
    await page
      .locator("#nd-sidebar")
      .getByRole("navigation", {
        name: "AudioBits site",
      })
      .getByRole("link", { name: "Catalog" })
      .click();
    await expect(page).toHaveURL(`${site}/catalog`);
  });
}

test("documentation external links open new tabs and local links stay in this tab", async ({
  page,
}) => {
  for (const path of [
    "/docs",
    "/docs/catalog",
    "/docs/agents",
    "/docs/mcp",
    "/docs/api",
  ]) {
    await page.goto(`${site}${path}`);
    const external = page.locator('#nd-page a[href^="https://"]');
    for (const link of await external.all()) {
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", /noopener/);
      await expect(link).toHaveAttribute("rel", /noreferrer/);
    }
    const internal = page.locator('#nd-page a[href^="/"]');
    for (const link of await internal.all()) {
      expect(await link.getAttribute("target")).toBeNull();
    }
  }
});
