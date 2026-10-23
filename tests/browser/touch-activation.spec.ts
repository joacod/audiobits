// These Chromium checks protect host wiring and native signal, not iOS policy.
import { expect, test } from "@playwright/test";
import { instrument, probe } from "./experience-probe";

test.use({ hasTouch: true });

test("cold landing touch requires completed activation before a held gesture", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await instrument(page, "touch-release", "/");
  const pad = page.locator(".lightsaber-canvas");
  await expect(pad).toHaveAttribute("data-state", "stopped");
  {
    await expect(pad).toHaveAttribute("data-audio-entry", "stage");
    expect((await probe(page)).contexts).toEqual([]);
    await expect(pad).toHaveAttribute("inert", "");
    const activation = page.getByRole("button", {
      name: "Use the Force",
      exact: true,
    });
    await expect(activation).toBeEnabled();
    const button = (await activation.boundingBox())!;
    expect(button.height).toBeGreaterThanOrEqual(44);
    expect(button.x).toBeGreaterThanOrEqual(0);
    expect(button.x + button.width).toBeLessThanOrEqual(390);
    const tap = await page.context().newCDPSession(page);
    await tap.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: button.x + button.width / 2, y: button.y + button.height / 2 },
      ],
    });
    // A held button is not an activation: its completed tap supplies the click.
    expect((await probe(page)).contexts).toEqual([]);
    await tap.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(activation).toHaveCount(0);
    await expect(pad).not.toHaveAttribute("inert");
    expect((await probe(page)).contexts).toEqual(["running"]);
    expect((await probe(page)).sources).toBe(0);
    await tap.detach();
  }
  await expect(pad).toHaveAttribute("data-renderer", "three");
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
  {
    // Ignition must produce both the blade and sound before any drag/release.
    await expect(pad).toHaveAttribute("data-extension", "1.000");
    await expect
      .poll(async () => Number(await pad.getAttribute("data-peak")))
      .toBeGreaterThan(0);
  }
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: box.x + box.width * 0.8, y: box.y + box.height / 2 }],
  });
  await expect
    .poll(async () => Number(await pad.getAttribute("data-peak")))
    .toBeGreaterThan(0);
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(pad).toHaveAttribute("data-state", "stopped");
  expect(
    (await page.getByRole("alert").allTextContents()).join("").trim(),
  ).toBe("");
});

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
  expect((await probe(page)).contexts).toEqual(["suspended"]);
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

// The handoff must preserve native context identity across real client navigation.
// Direct-entry checks above cannot establish that earlier activation is retained.

test("lightsaber navigation prepares audio for the first held touch @required", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await instrument(page, "normal", "/catalog");
  expect((await probe(page)).contexts).toEqual([]);
  const link = page.getByRole("link", { name: "Open lightsaber", exact: true });
  await link.scrollIntoViewIfNeeded();
  const linkBox = (await link.boundingBox())!;
  const touch = await page.context().newCDPSession(page);
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: linkBox.x + linkBox.width / 2, y: linkBox.y + linkBox.height / 2 },
    ],
  });
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  const pad = page.locator(".lightsaber-canvas");
  await expect(pad).toHaveAttribute("data-state", "stopped");
  await expect(pad).toHaveAttribute("data-audio-entry", "navigation");
  await expect
    .poll(async () => (await probe(page)).contexts)
    .toEqual(["running"]);
  expect((await probe(page)).sources).toBe(0);
  await pad.scrollIntoViewIfNeeded();
  const box = (await pad.boundingBox())!;
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
  });
  await expect(pad).toHaveAttribute("data-state", "running");
  await expect
    .poll(async () => Number(await pad.getAttribute("data-peak")))
    .toBeGreaterThan(0);
  await expect(pad).toHaveAttribute("data-extension", "1.000");
  expect((await probe(page)).contexts).toEqual(["running"]);
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(pad).toHaveAttribute("data-state", "stopped");
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Catalog", exact: true })
    .click();
  await expect
    .poll(async () => (await probe(page)).contexts)
    .toEqual(["closed"]);
  expect((await probe(page)).connected).toBe(0);
});
