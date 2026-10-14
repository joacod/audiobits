import { expect, test, type Page } from "@playwright/test";
import { dragThruster, instrument, probe } from "./experience-probe";

const home = "http://127.0.0.1:3100";
const copy =
  "AudioBits is currently tested in Chromium-based browsers. Other browsers are not yet verified.";
const chromeUA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36";
const safariUA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15";

async function identify(
  page: Page,
  ua: string,
  brands?: string[],
  unavailable = false,
) {
  await page.addInitScript(
    ({ ua, brands, unavailable }) => {
      Object.defineProperty(navigator, "userAgent", { get: () => ua });
      Object.defineProperty(navigator, "userAgentData", {
        get: () => {
          if (unavailable)
            throw new Error("Browser identification unavailable");
          return brands
            ? { brands: brands.map((brand) => ({ brand })) }
            : undefined;
        },
      });
    },
    { ua, brands, unavailable },
  );
}

for (const { name, ua, brands, visible, unavailable } of [
  {
    name: "Chromium client hints",
    ua: "",
    brands: ["Not A Brand", "Chromium"],
    visible: false,
  },
  { name: "Chrome user-agent fallback", ua: chromeUA, visible: false },
  {
    name: "Edge user-agent fallback",
    ua: `${chromeUA} Edg/142.0.0.0`,
    visible: false,
  },
  { name: "Safari identification", ua: safariUA, visible: true },
  {
    name: "Firefox identification",
    ua: "Mozilla/5.0 (X11; Linux x86_64; rv:144.0) Gecko/20100101 Firefox/144.0",
    visible: true,
  },
  {
    name: "Chrome on iOS",
    ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/142.0.0.0 Mobile/15E148 Safari/604.1",
    visible: true,
  },
  {
    name: "Chrome on iOS requesting a desktop site",
    ua: `${safariUA} CriOS/142`,
    visible: true,
  },
  {
    name: "iOS branding overrides Chromium hints",
    ua: "iPad CriOS/142",
    brands: ["Chromium"],
    visible: true,
  },
  { name: "unknown identification", ua: "", visible: true },
  {
    name: "unavailable identification",
    ua: "",
    unavailable: true,
    visible: true,
  },
]) {
  test(`browser notice: ${name}`, async ({ page }) => {
    await identify(page, ua, brands, unavailable);
    await page.goto(`${home}/catalog/thruster`);
    // Wait for hydration even when the notice stays hidden.
    await expect(
      page.getByRole("button", { name: "Start thruster", exact: true }),
    ).toBeEnabled();
    const notice = page.locator(".browser-notice");
    await expect(notice).toHaveAttribute("data-visible", String(visible));
    if (visible) await expect(notice).toHaveText(copy);
    await expect(notice).toBeVisible({ visible });
  });
}

for (const width of [320, 1280]) {
  for (const recognized of [false, true]) {
    test(`notice hydration preserves layout at ${width}px, Chromium recognized: ${recognized}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await identify(page, recognized ? chromeUA : safariUA);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      let release!: () => void;
      const hydration = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route("**/_next/static/**/*.js", async (route) => {
        await hydration;
        await route.continue();
      });
      const geometry = () =>
        page.evaluate(() =>
          [".site-header", ".thruster-hero", ".flight-pad"].map((selector) => {
            const { top, height } = document
              .querySelector(selector)!
              .getBoundingClientRect();
            return { top, height };
          }),
        );
      let before: Awaited<ReturnType<typeof geometry>>;
      try {
        await page.goto(home, { waitUntil: "commit" });
        await expect(page.locator(".flight-pad")).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        await expect(page.locator(".browser-notice")).toBeHidden();
        before = await geometry();
      } finally {
        release();
      }
      await expect(
        page.getByRole("button", { name: "Copy thruster install command" }),
      ).toBeEnabled();
      await expect(page.locator(".browser-notice")).toBeVisible({
        visible: !recognized,
      });
      const after = await geometry();
      for (let index = 0; index < before.length; index++) {
        expect(after[index].top).toBeCloseTo(before[index].top, 1);
        expect(after[index].height).toBeCloseTo(before[index].height, 1);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(errors).toEqual([]);
    });
  }

  test(`unverified notice leaves playback and navigation usable at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await identify(page, safariUA);
    await instrument(page, "normal", "/");
    await expect(page.locator(".browser-notice")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`notice-${width}.png`) });
    await dragThruster(page);
    await expect
      .poll(async () => (await probe(page)).contexts)
      .toEqual(["running"]);
    expect((await probe(page)).sources).toBeGreaterThan(0);
    await page.mouse.up();
    await expect(
      page.getByRole("group", { name: "Drag to fly" }),
    ).toHaveAttribute("data-state", "stopped");
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Catalog", exact: true })
      .click();
    await expect(page).toHaveURL(`${home}/catalog`);
    await expect(page.locator(".browser-notice")).toBeVisible();
    await page
      .getByRole("link", { name: "Open thruster workbench", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Start thruster", exact: true })
      .click();
    await expect
      .poll(async () => (await probe(page)).contexts)
      .toEqual(["closed", "running"]);
    await page.getByRole("slider", { name: "Throttle" }).fill("0.7");
    await expect(page.getByRole("slider", { name: "Throttle" })).toHaveValue(
      "0.7",
    );
    await page
      .getByRole("button", { name: "Stop thruster", exact: true })
      .click();
    await expect(page.getByTestId("thruster-state")).toHaveText(
      "Thruster: stopped",
    );
    await expect(page.locator(".browser-notice")).toBeVisible();
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Docs", exact: true })
      .click();
    await expect(page).toHaveURL(`${home}/docs`);
    await expect(page.locator(".browser-notice")).toHaveCount(0);
  });
}
