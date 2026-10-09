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
      page.getByRole("button", { name: "Play glass", exact: true }),
    ).toBeEnabled();
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const bounds = await page
      .getByRole("button", { name: "Play glass", exact: true })
      .boundingBox();
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(900);
    await expect(page.locator(".landing-install")).toHaveText(
      "npm install audiobits",
    );
    for (const name of ["Sounds", "Docs", "GitHub"]) {
      await expect(
        page
          .getByRole("navigation", { name: "Main navigation" })
          .getByRole("link", { name, exact: true }),
      ).toBeVisible();
    }
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
      const svg = entry.locator("svg");
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
      .getByRole("link", { name: "Explore the full collection" })
      .click();
    await expect(page.locator("article.sound-card")).toHaveCount(8);
  });
}

test("landing recovers from blocked activation and cancels pending Play on selection", async ({
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
  const play = page.getByRole("button", { name: "Play glass", exact: true });
  await play.click();
  await expect(page.locator(".landing-stage [role=alert]")).toContainText(
    "Retry Play",
  );
  await expect(page.getByTestId("landing-playback-state")).toContainText(
    "error",
  );
  await play.click();
  await expect(page.getByTestId("landing-playback-state")).toContainText(
    "starting",
  );
  await page
    .getByRole("button", { name: "Impact One-shot", exact: true })
    .click();
  await page.evaluate(() =>
    (globalThis as unknown as { releaseStart(): void }).releaseStart(),
  );
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Impact: stopped",
  );
  await expect(page.locator(".landing-stage [role=alert]")).toHaveCount(0);
  await expect(page.locator(".stage-signal canvas")).toHaveAttribute(
    "data-peak",
    "0",
  );
  await page.getByRole("button", { name: "Play impact", exact: true }).click();
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Impact: playing",
  );
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Impact: ready",
  );
  expect(
    await page.evaluate(
      () =>
        (globalThis as unknown as { landingContexts: unknown[] })
          .landingContexts.length,
    ),
  ).toBe(1);
});

test("reduced motion preserves keyboard playback, selection and live control", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(home);
  const thruster = page.getByRole("button", {
    name: "Thruster Sustained",
    exact: true,
  });
  await thruster.focus();
  await page.keyboard.press("Space");
  await page
    .getByRole("button", { name: "Start thruster", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Thruster: running",
  );
  await expect(page.locator(".stage-signal canvas")).toHaveAttribute(
    "data-peak",
    "0",
  );
  await page.getByRole("slider", { name: "Throttle" }).focus();
  await page.keyboard.press("End");
  await expect(page.getByRole("slider", { name: "Throttle" })).toHaveValue("1");
  await expect(page.locator(".workflow-code pre")).toContainText(
    '"throttle":1',
  );
  const stop = page.getByRole("button", { name: "Stop", exact: true });
  await stop.focus();
  expect(
    await stop.evaluate((element) => getComputedStyle(element).outlineStyle),
  ).toBe("solid");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Thruster: stopped",
  );
});

test("rapid retriggers and changing selection leave no orphaned native sources", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Native = AudioContext;
    const sources: { ended: boolean }[] = [];
    globalThis.AudioContext = class extends Native {
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
    Object.assign(globalThis, { landingSources: sources });
  });
  await page.goto(home);
  const play = page.getByRole("button", { name: "Play glass", exact: true });
  await play.click();
  await expect(page.getByTestId("landing-playback-state")).toContainText(
    "playing",
  );
  await play.click();
  await play.click();
  await page
    .getByRole("button", { name: "Thruster Sustained", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          globalThis as unknown as { landingSources: { ended: boolean }[] }
        ).landingSources.every((source) => source.ended),
      ),
    )
    .toBe(true);
  await page
    .getByRole("button", { name: "Start thruster", exact: true })
    .click();
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Thruster: running",
  );
  expect(
    await page.evaluate(() =>
      (
        globalThis as unknown as { landingSources: { ended: boolean }[] }
      ).landingSources.some((source) => !source.ended),
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Impact One-shot", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          globalThis as unknown as { landingSources: { ended: boolean }[] }
        ).landingSources.every((source) => source.ended),
      ),
    )
    .toBe(true);
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Impact: stopped",
  );
});
