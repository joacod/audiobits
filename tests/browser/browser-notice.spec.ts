import { expect, test } from "@playwright/test";

const home = "http://127.0.0.1:3100";

test.beforeEach(async ({ page }) => {
  // Local Next.js does not serve Vercel's analytics endpoint. Keep this
  // third-party dependency outside the hydration and layout assertions.
  await page.route(`${home}/_vercel/insights/script.js`, (route) =>
    route.fulfill({ contentType: "application/javascript", body: "" }),
  );
});

const safariUA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15";

const width = 320;

test("unverified notice hydrates without shifting the narrow landing layout", async ({
  page,
}) => {
  await page.setViewportSize({ width, height: 900 });
  await page.addInitScript((ua) => {
    Object.defineProperty(navigator, "userAgent", { get: () => ua });
    Object.defineProperty(navigator, "userAgentData", { get: () => undefined });
  }, safariUA);
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
      [".site-header", ".lightsaber-hero", ".lightsaber-canvas"].map(
        (selector) => {
          const { top, height } = document
            .querySelector(selector)!
            .getBoundingClientRect();
          return { top, height };
        },
      ),
    );
  let before: Awaited<ReturnType<typeof geometry>>;
  try {
    await page.goto(home, { waitUntil: "commit" });
    await expect(page.locator(".lightsaber-canvas")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator(".browser-notice")).toBeHidden();
    before = await geometry();
  } finally {
    release();
  }
  await expect(
    page.getByRole("button", { name: "Copy lightsaber install command" }),
  ).toBeEnabled();
  await expect(page.locator(".browser-notice")).toBeVisible();
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
