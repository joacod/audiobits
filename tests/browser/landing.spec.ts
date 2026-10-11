import { expect, test } from "@playwright/test";

const home = "http://127.0.0.1:3100";

for (const width of [375, 768, 1440]) {
  test(`landing composition and navigation fit ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(home);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: "Hold to charge", exact: true }),
    ).toBeEnabled();
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const bounds = await page
      .getByRole("button", { name: "Hold to charge", exact: true })
      .boundingBox();
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(900);
    await expect(page.locator(".landing-install")).toHaveText(
      "npm install audiobits",
    );
    await expect(page.locator(".charge-binding code")).toContainText(
      "voice.set({ charge:",
    );
    for (const name of ["Home", "Catalog", "Docs", "GitHub"]) {
      await expect(
        page
          .getByRole("navigation", { name: "Main navigation" })
          .getByRole("link", { name, exact: true }),
      ).toBeVisible();
    }
    await expect(
      page.getByRole("link", { name: "Open energy charge", exact: true }),
    ).toHaveAttribute("href", "/experiences/energy-charge");
    const previews = page.locator(".landing-sound-entry");
    const structures: string[] = [];
    for (const [kind, family, shape, count] of [
      ["impact", "pulse", "ellipse", 4],
      ["glass-notification", "harmonic", "path", 4],
      ["whoosh", "flow", "path", 6],
    ] as const) {
      const entry = previews
        .filter({ has: page.locator(`svg.preview-${family}`) })
        .first();
      await expect(entry).toHaveAttribute("href", `/sounds/${kind}`);
      const svg = entry.locator(`svg.preview-${family}`);
      await expect(svg).toHaveAttribute("aria-hidden", "true");
      await expect(svg.locator(shape)).toHaveCount(count);
      structures.push(await svg.innerHTML());
      await entry.click();
      await expect(page).toHaveURL(`${home}/sounds/${kind}`);
      await expect(page.locator(".sound-workbench")).toBeVisible();
      await page.goto(home);
    }
    expect(new Set(structures).size).toBe(3);
    await page.screenshot({
      path: testInfo.outputPath(`landing-${width}.png`),
      fullPage: true,
    });
    await page.screenshot({ path: testInfo.outputPath(`hero-${width}.png`) });
    await page
      .getByRole("link", { name: "Explore the catalog", exact: true })
      .click();
    await expect(page.locator("article.sound-card")).toHaveCount(8);
  });
}

test("landing recovers from blocked activation and cancels a pending start", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Native = AudioContext;
    let attempts = 0;
    const contexts: AudioContext[] = [];
    globalThis.AudioContext = class extends Native {
      constructor() {
        super();
        contexts.push(this);
      }
      resume() {
        if (++attempts === 1)
          return Promise.reject(new Error("Simulated blocked activation"));
        if (attempts === 2)
          return new Promise<void>((resolve) => {
            Object.assign(globalThis, {
              releaseStart: () => {
                void super.resume().then(resolve);
              },
            });
          });
        return super.resume();
      }
    };
    Object.assign(globalThis, { landingContexts: contexts });
  });
  await page.goto(home);
  const start = page.getByRole("button", {
    name: "Start charge",
    exact: true,
  });
  await start.click();
  await expect(page.locator(".charge-hero [role=alert]")).toContainText(
    "Try Start charge again",
  );
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Charge: stopped",
  );
  await start.click();
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Charge: starting",
  );
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await page.evaluate(() =>
    (globalThis as unknown as { releaseStart(): void }).releaseStart(),
  );
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Charge: stopped",
  );
  await expect(page.locator(".charge-hero [role=alert]")).toHaveCount(0);
  await expect(page.locator(".charge-rings")).toHaveAttribute(
    "data-level",
    "0",
  );
  await start.click();
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Charge: running",
  );
  expect(
    await page.evaluate(
      () =>
        (globalThis as unknown as { landingContexts: unknown[] })
          .landingContexts.length,
    ),
  ).toBe(1);
});

test("reduced motion preserves keyboard hold, manual charge and focus", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(home);
  const pad = page.getByRole("button", { name: "Hold to charge", exact: true });
  await pad.focus();
  await page.keyboard.down("Space");
  await expect(pad).toHaveAttribute("data-full", "true");
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Charge: running",
  );
  await expect(page.locator(".charge-rings")).toHaveAttribute(
    "data-renderer",
    "css",
  );
  await expect(page.locator(".charge-rings")).toHaveAttribute(
    "data-level",
    "0",
  );
  await page.keyboard.up("Space");
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Charge: stopped",
  );
  const slider = page.getByRole("slider", { name: "Charge", exact: true });
  await slider.focus();
  await page.keyboard.press("End");
  await expect(slider).toHaveValue("1");
  await expect(page.locator(".charge-binding code")).toHaveText(
    "voice.set({ charge: 1.00 })",
  );
  const start = page.getByRole("button", { name: "Start charge", exact: true });
  await start.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Charge: running",
  );
  const stop = page.getByRole("button", { name: "Stop", exact: true });
  await stop.focus();
  expect(
    await stop.evaluate((element) => getComputedStyle(element).outlineStyle),
  ).toBe("solid");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Charge: stopped",
  );
});

test("release, cancellation and navigation leave no orphaned charge sources", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Native = AudioContext;
    const sources: { ended: boolean }[] = [];
    const contexts: AudioContext[] = [];
    globalThis.AudioContext = class extends Native {
      constructor() {
        super();
        contexts.push(this);
      }
      createOscillator() {
        const source = super.createOscillator();
        const record = { ended: false };
        sources.push(record);
        source.addEventListener("ended", () => {
          record.ended = true;
        });
        return source;
      }
      createBufferSource() {
        const source = super.createBufferSource();
        const record = { ended: false };
        sources.push(record);
        source.addEventListener("ended", () => {
          record.ended = true;
        });
        return source;
      }
    };
    Object.assign(globalThis, {
      landingSources: sources,
      landingContexts: contexts,
    });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(home);
  expect(
    await page.evaluate(
      () =>
        (globalThis as unknown as { landingContexts: unknown[] })
          .landingContexts.length,
    ),
  ).toBe(0);
  const pad = page.getByRole("button", { name: "Hold to charge", exact: true });
  await pad.focus();
  await page.keyboard.down("Enter");
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Charge: running",
  );
  await page.keyboard.up("Enter");
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Charge: stopped",
  );
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          globalThis as unknown as { landingSources: { ended: boolean }[] }
        ).landingSources.every((source) => source.ended),
      ),
    )
    .toBe(true);
  const box = (await pad.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Charge: running",
  );
  await pad.dispatchEvent("pointercancel", { pointerId: 99 });
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Charge: running",
  );
  await page.mouse.up();
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Charge: stopped",
  );
  const touch = await page.context().newCDPSession(page);
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
  });
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Charge: running",
  );
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Charge: stopped",
  );
  await page.getByRole("button", { name: "Start charge", exact: true }).click();
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Charge: running",
  );
  expect(
    await page.evaluate(() =>
      (
        globalThis as unknown as { landingSources: { ended: boolean }[] }
      ).landingSources.some((source) => !source.ended),
    ),
  ).toBe(true);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Charge: stopped",
  );
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          globalThis as unknown as { landingSources: { ended: boolean }[] }
        ).landingSources.every((source) => source.ended),
      ),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Start charge", exact: true }).click();
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Charge: running",
  );
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Charge: stopped",
  );
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          globalThis as unknown as { landingContexts: AudioContext[] }
        ).landingContexts.map((context) => context.state),
      ),
    )
    .toEqual(["suspended"]);
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Docs" })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          globalThis as unknown as { landingContexts: AudioContext[] }
        ).landingContexts.map((context) => context.state),
      ),
    )
    .toEqual(["closed"]);
});
