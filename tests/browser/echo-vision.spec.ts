import { expect, test } from "@playwright/test";
import { instrument, probe } from "./experience-probe";

const name = { name: "Echo Vision stage", exact: true };

// Native input and ownership matter here: the pure mapping tests cannot prove
// that one completed gesture emits, becomes quiet, or disposes on navigation.
test("one pulse reveals the room and naturally returns to silence and darkness", async ({
  page,
}) => {
  await instrument(page, "normal", "echo-vision");
  const stage = page.getByRole("group", name);
  await expect(stage).toHaveAttribute("data-ready", "true");
  await expect(stage).toHaveAttribute("data-visible-surfaces", "");
  await stage.hover();
  expect((await probe(page)).contexts).toEqual([]);
  await stage.click();
  await expect(stage).toHaveAttribute("data-state", "listening");
  await expect(stage.locator('[data-echo-surface="metal"]')).toHaveAttribute(
    "data-lit",
    "true",
  );
  const emitted = (await probe(page)).sources;
  expect(emitted).toBeGreaterThan(0);
  await expect
    .poll(async () => (await probe(page)).ownedSources, { timeout: 12000 })
    .toBe(0);
  await expect(stage).toHaveAttribute("data-state", "quiet");
  await expect(stage).toHaveAttribute("data-visible-surfaces", "");
  expect((await probe(page)).sources).toBe(emitted);
  await stage.click();
  await expect
    .poll(async () => (await probe(page)).sources)
    .toBeGreaterThan(emitted);
  await stage.getByRole("button", { name: "Stop echoes" }).click();
  await expect.poll(async () => (await probe(page)).ownedSources).toBe(0);
  await expect(stage).toHaveAttribute("data-visible-surfaces", "");
  await page
    .getByRole("link", { name: "Catalog", exact: true })
    .first()
    .click();
  await expect
    .poll(async () => (await probe(page)).contexts)
    .toEqual(["closed"]);
  await expect.poll(async () => (await probe(page)).connected).toBe(0);
});

test("Stop cancels pending activation and a fresh pulse recovers", async ({
  page,
}) => {
  await instrument(page, "held", "echo-vision");
  const stage = page.getByRole("group", name);
  await expect(stage).toHaveAttribute("data-ready", "true");
  await stage.click();
  await expect(stage).toHaveAttribute("data-state", "starting");
  await page.keyboard.press("Escape");
  await page.evaluate(() =>
    (
      globalThis as unknown as { thrusterProbe: { releaseActivation(): void } }
    ).thrusterProbe.releaseActivation(),
  );
  await expect(stage).toHaveAttribute("data-state", "quiet");
  expect((await probe(page)).sources).toBe(0);
  await stage.click();
  await expect.poll(async () => (await probe(page)).sources).toBeGreaterThan(0);
  await page.evaluate(() =>
    window.dispatchEvent(
      new PageTransitionEvent("pagehide", { persisted: true }),
    ),
  );
  await expect(stage).toHaveAttribute("data-state", "quiet");
  await expect.poll(async () => (await probe(page)).ownedSources).toBe(0);
  await stage.click();
  await page.evaluate(() =>
    (
      globalThis as unknown as { thrusterProbe: { releaseActivation(): void } }
    ).thrusterProbe.releaseActivation(),
  );
  await expect(stage).toHaveAttribute("data-state", "listening");
});

test("touch drag releases one pulse and cancellation remains silent with reduced motion", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await instrument(page, "normal", "echo-vision");
  const stage = page.getByRole("group", name);
  await expect(stage).toHaveAttribute("data-ready", "true");
  await stage.scrollIntoViewIfNeeded();
  const box = (await stage.boundingBox())!;
  const session = await context.newCDPSession(page);
  const point = { x: box.x + box.width * 0.5, y: box.y + box.height * 0.5 };
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [point],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ ...point, x: point.x + 55 }],
  });
  expect((await probe(page)).sources).toBe(0);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(stage).toHaveAttribute("data-state", "listening");
  await expect(stage.locator('[data-echo-surface="glass"]')).toHaveAttribute(
    "data-lit",
    "true",
  );
  await stage.press("Escape");
  await expect.poll(async () => (await probe(page)).ownedSources).toBe(0);
  const count = (await probe(page)).sources;
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [point],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
  await expect(stage).toHaveAttribute("data-state", "quiet");
  expect((await probe(page)).sources).toBe(count);
  await expect(stage).toHaveAttribute("data-visible-surfaces", "");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
