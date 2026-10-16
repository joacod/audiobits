import { expect, test } from "@playwright/test";
import { instrument, probe } from "./experience-probe";

// Keep the initial resume pending until a native touch event retries activation.
test("a first Echo Probe tap retries blocked activation on touch release", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "audioSession", {
      value: { type: "auto" },
    });
  });
  await instrument(page, "touch-release", "echo-probe");
  const stage = page.getByRole("group", { name: "Echo Probe stage" });
  await expect(stage).toHaveAttribute("data-ready", "true");
  await stage.scrollIntoViewIfNeeded();
  const box = (await stage.boundingBox())!;
  const touch = await page.context().newCDPSession(page);
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: box.x + 90, y: box.y + 100 }],
  });
  await expect(stage).toHaveAttribute("data-state", "starting");
  expect((await probe(page)).sources).toBe(0);
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(stage).toHaveAttribute("data-state", "running");
  expect((await probe(page)).sources).toBeGreaterThan(0);
  expect(
    await page.evaluate(
      () =>
        (navigator as Navigator & { audioSession: { type: string } })
          .audioSession.type,
    ),
  ).toBe("playback");
  expect(
    await stage.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        select: style.userSelect,
        touch: style.touchAction,
        callout: style.getPropertyValue("-webkit-touch-callout"),
      };
    }),
  ).toMatchObject({ select: "none", touch: "none" });
  expect(
    await stage.evaluate((element) =>
      element.dispatchEvent(new Event("contextmenu", { cancelable: true })),
    ),
  ).toBe(false);
  await stage.press("Escape");
});

test("native touch starts a hold, cancels cleanly and works after a persisted page hide", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await instrument(page, "touch-start", "energy-charge");
  const pad = page.getByRole("button", { name: "Hold to charge", exact: true });
  await expect(pad).toBeEnabled();
  await pad.scrollIntoViewIfNeeded();
  const box = (await pad.boundingBox())!;
  const touch = await page.context().newCDPSession(page);
  const press = () =>
    touch.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
    });
  await press();
  await expect(pad).toHaveAttribute("data-state", "running");
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
  await expect(pad).toHaveAttribute("data-state", "stopped");
  await page.evaluate(() =>
    window.dispatchEvent(
      new PageTransitionEvent("pagehide", { persisted: true }),
    ),
  );
  await expect
    .poll(async () => (await probe(page)).contexts)
    .toEqual(["suspended"]);
  await page.evaluate(() =>
    window.dispatchEvent(
      new PageTransitionEvent("pageshow", { persisted: true }),
    ),
  );
  expect((await probe(page)).contexts).toEqual(["suspended"]);
  await press();
  await expect(pad).toHaveAttribute("data-state", "running");
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(pad).toHaveAttribute("data-state", "stopped");
  expect((await probe(page)).contexts).toEqual(["running"]);
});
