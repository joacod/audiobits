import { expect, test } from "@playwright/test";
import { instrument, probe } from "./experience-probe";

const home = "http://127.0.0.1:3100";

for (const [width, height] of [
  [320, 667],
  [375, 812],
  [768, 900],
  [1280, 800],
  [1440, 900],
]) {
  test(`landing composition and navigation fit ${width}×${height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height });
    await page.goto(home);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: "Start thruster" }),
    ).toBeEnabled();
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const pad = (await page
      .getByRole("group", { name: "Drag to fly" })
      .boundingBox())!;
    const signal = (await page.locator(".thruster-signal").boundingBox())!;
    expect(pad.height).toBeGreaterThanOrEqual(208);
    expect(signal.y).toBeCloseTo(pad.y + pad.height, 0);
    expect(signal.y + signal.height).toBeLessThanOrEqual(height);
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
      page.getByRole("link", { name: "Open thruster source" }),
    ).toHaveAttribute("href", "/catalog/reactive-thruster");
    await expect(
      page.locator(".landing-experience").filter({ hasText: "Energy Charge" }),
    ).toHaveAttribute("href", "/catalog/energy-charge");
    await expect(page.locator(".landing-experience")).toHaveCount(2);
    await page.screenshot({ path: testInfo.outputPath(`hero-${width}.png`) });
    await page.screenshot({
      path: testInfo.outputPath(`landing-${width}.png`),
      fullPage: true,
    });
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
      await expect(entry).toHaveAttribute("href", `/catalog/${kind}`);
      const svg = entry.locator(`svg.preview-${family}`);
      await expect(svg).toHaveAttribute("aria-hidden", "true");
      await expect(svg.locator(shape)).toHaveCount(count);
      structures.push(await svg.innerHTML());
      await entry.click();
      await expect(page).toHaveURL(`${home}/catalog/${kind}`);
      await expect(page.locator(".catalog-bench")).toBeVisible();
      await page.goto(home);
    }
    expect(new Set(structures).size).toBe(3);
    await page
      .getByRole("link", { name: "Explore the catalog", exact: true })
      .click();
    await expect(page).toHaveURL(`${home}/catalog`);
    await expect(page.locator("[data-catalog-entry]")).toHaveCount(10);
    await expect(page.locator("article.sound-card")).toHaveCount(0);
  });
}

test("landing stays silent until a gesture, measures output, mutes and disposes on navigation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (cause) => errors.push(cause.message));
  await instrument(page, "normal", "/");
  const start = page.getByRole("button", {
    name: "Start thruster",
    exact: true,
  });
  const mute = page.getByRole("button", { name: "Mute", exact: true });
  const stop = page.getByRole("button", { name: "Stop", exact: true });
  const slider = page.getByRole("slider", { name: "Throttle", exact: true });
  await expect(start).toBeEnabled();
  await slider.fill("0.8");
  await mute.click();
  await stop.click();
  expect((await probe(page)).contexts).toEqual([]);
  await mute.click();
  await start.click();
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Thruster: running",
  );
  await expect(page.locator(".flight-readout output")).toHaveText("80%");
  await expect
    .poll(async () =>
      Number(
        await page.locator(".thruster-signal canvas").getAttribute("data-peak"),
      ),
    )
    .toBeGreaterThan(0);
  await expect
    .poll(async () =>
      Number(
        await page
          .locator(".thruster-ribbons canvas")
          .getAttribute("data-peak"),
      ),
    )
    .toBeGreaterThan(0);
  await mute.click();
  await expect(mute).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".thruster-signal canvas")).toHaveAttribute(
    "data-peak",
    "0",
  );
  await expect(page.locator(".thruster-ribbons canvas")).toHaveAttribute(
    "data-peak",
    "0",
  );
  await mute.click();
  await expect
    .poll(async () =>
      Number(
        await page.locator(".thruster-signal canvas").getAttribute("data-peak"),
      ),
    )
    .toBeGreaterThan(0);
  await stop.click();
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Thruster: stopped",
  );
  await expect
    .poll(async () => {
      const p = await probe(page);
      return p.ended === p.sources;
    })
    .toBe(true);
  expect((await probe(page)).contexts).toEqual(["running"]);
  await start.click();
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Thruster: running",
  );
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Docs", exact: true })
    .click();
  await expect
    .poll(async () => (await probe(page)).contexts)
    .toEqual(["closed"]);
  await expect.poll(async () => (await probe(page)).connected).toBe(0);
  expect(errors).toEqual([]);
});

test("landing pointer acceleration, release, touch cancellation and interruptions clean up", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await instrument(page, "normal", "/");
  const pad = page.getByRole("group", { name: "Drag to fly" });
  const box = (await pad.boundingBox())!;
  await page.mouse.move(box.x + 30, box.y + 80);
  await page.mouse.down();
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Thruster: running",
  );
  await page.mouse.move(box.x + box.width - 30, box.y + 130, { steps: 8 });
  await expect
    .poll(async () =>
      Number(
        (await page.locator(".flight-readout output").textContent())!.replace(
          "%",
          "",
        ),
      ),
    )
    .toBeGreaterThan(0);
  await expect(page.locator(".flight-craft")).not.toHaveAttribute(
    "style",
    /left: 50%/,
  );
  await pad.dispatchEvent("pointercancel", { pointerId: 99 });
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Thruster: running",
  );
  await page.mouse.up();
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Thruster: stopped",
  );
  await expect.poll(async () => (await probe(page)).ended).toBe(3);
  const touch = await page.context().newCDPSession(page);
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: box.x + 50, y: box.y + 80 }],
  });
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Thruster: running",
  );
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: box.x + box.width - 40, y: box.y + 140 }],
  });
  await expect(page.locator(".flight-craft")).not.toHaveAttribute(
    "style",
    /left: 50%/,
  );
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Thruster: stopped",
  );
  await touch.detach();
  const start = page.getByRole("button", {
    name: "Start thruster",
    exact: true,
  });
  await start.click();
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Thruster: running",
  );
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Thruster: stopped",
  );
  await expect
    .poll(async () => {
      const p = await probe(page);
      return p.ended === p.sources;
    })
    .toBe(true);
  await start.click();
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Thruster: running",
  );
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Thruster: stopped",
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

test("landing activation failure recovers with a fresh gesture", async ({
  page,
}) => {
  await instrument(page, "failed", "/");
  const start = page.getByRole("button", {
    name: "Start thruster",
    exact: true,
  });
  await start.click();
  await expect(page.locator(".thruster-hero [role=alert]")).toContainText(
    "Try Start thruster or drag again",
  );
  expect((await probe(page)).sources).toBe(0);
  await start.click();
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Thruster: running",
  );
  await expect(page.locator(".thruster-hero [role=alert]")).toHaveCount(0);
});

test("a pending homepage start cannot outlive Stop", async ({ page }) => {
  await instrument(page, "held", "/");
  const start = page.getByRole("button", {
    name: "Start thruster",
    exact: true,
  });
  await start.click();
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Thruster: starting",
  );
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await page.evaluate(() =>
    (
      globalThis as unknown as { thrusterProbe: { releaseActivation(): void } }
    ).thrusterProbe.releaseActivation(),
  );
  await expect
    .poll(async () => (await probe(page)).contexts)
    .toEqual(["running"]);
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Thruster: stopped",
  );
  expect((await probe(page)).sources).toBe(0);
});

test("reduced motion preserves keyboard throttle, level feedback and focus", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await instrument(page, "normal", "/");
  const slider = page.getByRole("slider", { name: "Throttle", exact: true });
  await slider.focus();
  await page.keyboard.press("End");
  await expect(slider).toHaveValue("1");
  expect((await probe(page)).contexts).toEqual([]);
  const start = page.getByRole("button", {
    name: "Start thruster",
    exact: true,
  });
  await start.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Thruster: running",
  );
  await expect(page.locator(".flight-readout output")).toHaveText("100%");
  await expect(page.locator(".thruster-ribbons")).toHaveAttribute(
    "data-renderer",
    "canvas",
  );
  await expect(page.locator(".thruster-signal canvas")).toHaveAttribute(
    "data-peak",
    "0",
  );
  await expect
    .poll(() =>
      page
        .locator(".thruster-signal figure")
        .evaluate((node) =>
          Number((node as HTMLElement).style.getPropertyValue("--level")),
        ),
    )
    .toBeGreaterThan(0);
  const stop = page.getByRole("button", { name: "Stop", exact: true });
  await stop.focus();
  expect(
    await stop.evaluate((node) => getComputedStyle(node).outlineStyle),
  ).toBe("solid");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Thruster: stopped",
  );
  for (const name of ["GitHub", "npm"]) {
    const link = page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name, exact: true });
    await link.focus();
    expect(
      await link.evaluate((node) => getComputedStyle(node).outlineStyle),
    ).toBe("solid");
  }
});
