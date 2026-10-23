import { expect, test } from "@playwright/test";
import { instrument, probe, holdLightsaber } from "./experience-probe";
import { catalogEntriesByCategory } from "../../apps/www/lib/catalog";

const home = "http://127.0.0.1:3100";

for (const [width, height] of [
  [320, 667],
  [768, 1024],
  [1440, 900],
]) {
  test(`landing composition and navigation fit ${width}×${height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height });
    await page.goto(home);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator(".lightsaber-canvas")).toHaveAttribute(
      "data-renderer",
      /three|unavailable/,
    );
    await expect(page.locator(".lightsaber-activation")).toHaveCount(0);
    await expect(page.locator(".lightsaber-canvas")).not.toHaveAttribute(
      "inert",
    );
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const headingLines = await page
      .locator(".lightsaber-intro h1 > span")
      .evaluateAll((lines) =>
        lines.map((line) => {
          const range = document.createRange();
          range.selectNodeContents(line);
          const bounds = range.getBoundingClientRect();
          const gutter = parseFloat(
            getComputedStyle(document.querySelector(".foundation")!)
              .paddingLeft,
          );
          return { left: bounds.left, right: bounds.right, gutter };
        }),
      );
    for (const line of headingLines) {
      expect(line.left).toBeGreaterThanOrEqual(line.gutter);
      expect(line.right).toBeLessThanOrEqual(width - line.gutter);
    }
    const pad = (await page.locator(".lightsaber-canvas").boundingBox())!;
    expect(pad.height).toBeGreaterThanOrEqual(256);
    expect(pad.y + pad.height).toBeLessThanOrEqual(height);
    const nav = page.getByRole("navigation", { name: "Main navigation" });
    for (const [name, href] of [
      ["AudioBits", "/"],
      ["Catalog", "/catalog"],
      ["Docs", "/docs"],
      ["GitHub", "https://github.com/joacod/audiobits"],
      ["npm", "https://www.npmjs.com/package/audiobits"],
    ]) {
      const link = nav.getByRole("link", { name, exact: true });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", href);
      const box = (await link.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      if (name === "GitHub" || name === "npm") {
        expect(box.width).toBeGreaterThanOrEqual(44);
        await expect(link.locator("svg")).toHaveAttribute(
          "aria-hidden",
          "true",
        );
      }
    }
    await expect(nav.getByRole("link")).toHaveCount(5);
    await expect(
      page.getByRole("link", { name: "Open lightsaber source" }),
    ).toHaveAttribute("href", "/catalog/lightsaber");
    await expect(
      page.locator(".landing-experience").filter({ hasText: "Energy Charge" }),
    ).toHaveAttribute("href", "/catalog/energy-charge");
    const experiences = catalogEntriesByCategory("experience")
      .filter((entry) => entry.slug !== "lightsaber")
      .slice(0, 6);
    await expect(page.locator(".landing-experience")).toHaveCount(
      experiences.length,
    );
    await expect(page.locator(".landing-experience h3")).toHaveText(
      experiences.map((entry) => entry.title),
    );
    await expect(
      page.locator(
        '.landing-experience[href="/catalog/echo-probe"] .catalog-mark-pulse',
      ),
    ).toBeVisible();
    for (const entry of experiences)
      await expect(
        page.locator(".landing-experience").filter({ hasText: entry.title }),
      ).toHaveAttribute("href", entry.href);
    await expect(page.locator(".landing h2")).toHaveText([
      "Find your frequency.",
      "Hear it. Own it.",
      "Let your AI agent build the sound.",
    ]);
    await expect(page.locator(".landing-command pre")).toHaveCount(2);
    for (const command of await page.locator(".landing-command-row").all()) {
      const bounds = (await command.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      expect(
        await command.evaluate((node) => node.scrollWidth <= node.clientWidth),
      ).toBe(true);
      const copy = command.getByRole("button");
      await copy.focus();
      expect(
        await copy.evaluate((node) => getComputedStyle(node).outlineStyle),
      ).toBe("solid");
      expect((await copy.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath(`hero-${width}.png`) });
    await page.screenshot({
      path: testInfo.outputPath(`landing-${width}.png`),
      fullPage: true,
    });
  });
}

test("landing stays silent until holding, measures real output and disposes on navigation @required", async ({
  page,
}) => {
  // Bound software rendering at a desktop size that still exercises letter collisions.
  await page.setViewportSize({ width: 960, height: 640 });
  const errors: string[] = [];
  page.on("pageerror", (cause) => errors.push(cause.message));
  await instrument(page, "normal", "/");
  await expect(page.locator(".lightsaber-canvas")).toHaveAttribute(
    "data-audio-entry",
    "stage",
  );
  const initial = await probe(page);
  expect(initial.contexts).toEqual([]);
  expect(initial.sources).toBe(0);
  await expect(page.locator(".lightsaber-intro h1")).toHaveAccessibleName(
    "Sound that reacts.",
  );
  await expect(page.locator(".lightsaber-activation")).toHaveCount(0);
  // Read one visual frame per poll instead of making each assertion wait for a
  // separate render/automation round trip on software-rendered Chromium.
  const feedback = () =>
    page.locator(".lightsaber-hero").evaluate((hero) => {
      const stage = hero.querySelector<HTMLElement>(".lightsaber-canvas")!;
      const heat = Array.from(hero.querySelectorAll(".hero-letter"), (letter) =>
        Number(getComputedStyle(letter).getPropertyValue("--letter-heat")),
      );
      return {
        state: stage.dataset.state,
        peak: Number(stage.dataset.peak),
        extension: stage.dataset.extension,
        level: Number(getComputedStyle(hero).getPropertyValue("--hero-level")),
        wave: hero.querySelector(".hero-wave")!.getAttribute("d"),
        maximumHeat: Math.max(...heat),
        minimumHeat: Math.min(...heat),
      };
    });
  await holdLightsaber(page);
  await expect
    .poll(async () => {
      const value = await feedback();
      return {
        state: value.state,
        output: value.peak > 0,
        wave: value.wave !== "M0 30H600",
        level: value.level > 0,
        extension: value.extension,
      };
    })
    .toEqual({
      state: "running",
      output: true,
      wave: true,
      level: true,
      extension: "1.000",
    });
  const surface = page.locator(".lightsaber-canvas");
  const box = (await surface.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.28, box.y + box.height * 0.65);
  await expect
    .poll(async () => {
      const value = await feedback();
      return { maximum: value.maximumHeat, minimum: value.minimumHeat };
    })
    .toEqual({ maximum: 1, minimum: 0 });
  await page.mouse.up();
  await expect
    .poll(async () => {
      const p = await probe(page);
      return p.ended === p.sources;
    })
    .toBe(true);
  await expect.poll(feedback).toMatchObject({
    state: "stopped",
    peak: 0,
    wave: "M0 30H600",
    maximumHeat: 0,
    level: 0,
  });
  await holdLightsaber(page);
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Docs", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("http://127.0.0.1:3100/docs");
  await expect
    .poll(async () => (await probe(page)).contexts)
    .toEqual(["closed"]);
  await expect.poll(async () => (await probe(page)).connected).toBe(0);
  expect(errors).toEqual([]);
});

test("landing swing, release, touch cancellation and interruptions clean up @required", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await instrument(page, "normal", "/");
  const pad = page.getByRole("group", { name: "Lightsaber stage" });
  const box = (await pad.boundingBox())!;
  await page.mouse.move(box.x + 30, box.y + 80);
  await page.mouse.down();
  await expect(page.locator(".lightsaber-canvas")).toHaveAttribute(
    "data-state",
    "running",
  );
  await page.mouse.move(box.x + box.width - 30, box.y + 130, { steps: 8 });
  await expect
    .poll(async () => Number(await pad.getAttribute("data-motion")))
    .toBeGreaterThan(0);
  await pad.dispatchEvent("pointercancel", { pointerId: 99 });
  await expect(page.locator(".lightsaber-canvas")).toHaveAttribute(
    "data-state",
    "running",
  );
  await page.mouse.up();
  await expect(page.locator(".lightsaber-canvas")).toHaveAttribute(
    "data-state",
    "stopped",
  );
  await expect
    .poll(async () => {
      const p = await probe(page);
      return p.ended === p.sources;
    })
    .toBe(true);
  const touch = await page.context().newCDPSession(page);
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: box.x + 50, y: box.y + 80 }],
  });
  await expect(page.locator(".lightsaber-canvas")).toHaveAttribute(
    "data-state",
    "running",
  );
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: box.x + box.width - 40, y: box.y + 140 }],
  });
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
  await expect(page.locator(".lightsaber-canvas")).toHaveAttribute(
    "data-state",
    "stopped",
  );
  await touch.detach();
  await holdLightsaber(page);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(page.locator(".lightsaber-canvas")).toHaveAttribute(
    "data-state",
    "stopped",
  );
  await expect
    .poll(async () => {
      const p = await probe(page);
      return p.ended === p.sources;
    })
    .toBe(true);
  await page.mouse.up();
  await holdLightsaber(page);
  await expect(page.locator(".lightsaber-canvas")).toHaveAttribute(
    "data-state",
    "running",
  );
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator(".lightsaber-canvas")).toHaveAttribute(
    "data-state",
    "stopped",
  );
  await expect
    .poll(async () => (await probe(page)).contexts)
    .toEqual(["suspended"]);
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  await expect
    .poll(async () => (await probe(page)).contexts)
    .toEqual(["closed"]);
  await expect.poll(async () => (await probe(page)).connected).toBe(0);
});

test.describe("mobile landing activation", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test("landing activation failure keeps the button available for a fresh tap @required", async ({
    page,
  }) => {
    await instrument(page, "failed", "/");
    const activation = page.getByRole("button", {
      name: "Use the Force",
      exact: true,
    });
    const pad = page.locator(".lightsaber-canvas");
    await expect(pad).toHaveAttribute("inert", "");
    await activation.click();
    await expect(page.locator(".lightsaber-hero [role=alert]")).toContainText(
      "Tap Use the Force to retry",
    );
    await expect(activation).toBeEnabled();
    expect((await probe(page)).sources).toBe(0);
    // The retry also works from the keyboard and returns focus to the stage.
    await activation.focus();
    await page.keyboard.press("Enter");
    await expect(activation).toHaveCount(0);
    await expect(pad).toBeFocused();
    await expect(pad).not.toHaveAttribute("inert");
    await expect(page.locator(".lightsaber-hero [role=alert]")).toHaveCount(0);
    expect((await probe(page)).sources).toBe(0);
    await holdLightsaber(page);
    await expect(pad).toHaveAttribute("data-state", "running");
    await page.mouse.up();
  });

  test("pending landing activation waits for success without igniting @required", async ({
    page,
  }) => {
    await instrument(page, "held", "/");
    await page
      .getByRole("button", { name: "Use the Force", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Connecting…", exact: true }),
    ).toBeDisabled();
    await expect(page.locator(".lightsaber-canvas")).toHaveAttribute(
      "inert",
      "",
    );
    expect((await probe(page)).sources).toBe(0);
    await page.evaluate(() =>
      (
        globalThis as unknown as {
          thrusterProbe: { releaseActivation(): void };
        }
      ).thrusterProbe.releaseActivation(),
    );
    await expect
      .poll(async () => (await probe(page)).contexts)
      .toEqual(["running"]);
    await expect(page.locator(".lightsaber-activation")).toHaveCount(0);
    await expect(page.locator(".lightsaber-canvas")).toHaveAttribute(
      "data-state",
      "stopped",
    );
    expect((await probe(page)).sources).toBe(0);
  });
});

for (const route of ["/", "/catalog/confirmation"]) {
  test(`installation copying waits for hydration on ${route}`, async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    let release!: () => void;
    const hydration = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/_next/static/**/*.js", async (request) => {
      await hydration;
      await request.continue();
    });
    await page.goto(`${home}${route}`, { waitUntil: "commit" });
    const copy = page.getByRole("button", {
      name:
        route === "/"
          ? "Copy lightsaber install command"
          : "Copy Confirmation command",
      exact: true,
    });
    try {
      await expect(copy).toBeDisabled();
      if (route === "/")
        await expect(
          page.getByRole("button", { name: "Use the Force", exact: true }),
        ).toHaveCount(0);
    } finally {
      release();
    }
    await expect(copy).toBeEnabled();
    await copy.focus();
    await page.keyboard.press("Enter");
    await expect(
      page
        .locator(".landing-command")
        .filter({ has: copy })
        .getByRole("status"),
    ).toHaveText("Copied.");
  });
}
