import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { instrument, probe } from "./experience-probe";
import { requireOfflineCheckpoints } from "./offline-capabilities";

test("progress moves both ways on one voice, holds full, releases and tears down", async ({
  page,
}) => {
  await instrument(page, "normal", "energy-charge");
  const slider = page.getByRole("slider", { name: "Charge", exact: true });
  await slider.fill("0.4");
  await page.getByRole("button", { name: "Mute", exact: true }).click();
  await page.getByRole("button", { name: "Stop all" }).click();
  expect((await probe(page)).contexts).toEqual([]);
  await page.getByRole("button", { name: "Mute", exact: true }).click();
  await page.getByRole("button", { name: "Start charge", exact: true }).click();
  await expect(page.locator(".energy-state")).toHaveText("Charge: running");
  for (const value of ["1", "0.2", "0.2", "0.8", "1"]) {
    await slider.fill(value);
    expect((await probe(page)).sources).toBe(4);
    await expect(page.locator(".energy-state")).toHaveText("Charge: running");
  }
  await expect
    .poll(async () =>
      Number(await page.locator("canvas").getAttribute("data-peak")),
    )
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "Release charge" }).click();
  await expect.poll(async () => (await probe(page)).ended).toBe(4);
  for (let i = 0; i < 5; i++) {
    await page
      .getByRole("button", { name: "Start charge", exact: true })
      .click();
    await expect(page.locator(".energy-state")).toHaveText("Charge: running");
    const p = await probe(page);
    expect(p.sources - p.ended).toBeLessThanOrEqual(12);
    await slider.fill("0.4");
    await page.getByRole("button", { name: "Release charge" }).click();
  }
  await page.getByRole("button", { name: "Stop all" }).click();
  await expect
    .poll(async () => {
      const p = await probe(page);
      return p.sources === p.ended;
    })
    .toBe(true);
  await page.getByRole("link", { name: "Sounds", exact: true }).click();
  await expect
    .poll(async () => (await probe(page)).contexts)
    .toEqual(["closed"]);
  expect((await probe(page)).connected).toBe(0);
});

test("hold keyboard and pointer reach full without completing; cancellation cuts", async ({
  page,
}) => {
  await instrument(page, "normal", "energy-charge");
  const pad = page.getByRole("button", { name: "Hold to charge", exact: true });
  await expect(pad).toBeEnabled();
  await pad.focus();
  await page.keyboard.down("Space");
  await expect(pad).toHaveAttribute("data-full", "true");
  await expect(page.locator(".energy-state")).toHaveText("Charge: running");
  await page.keyboard.up("Space");
  await expect(page.locator(".energy-state")).toHaveText("Charge: stopped");
  const box = (await pad.boundingBox())!;
  await page.mouse.move(box.x + 40, box.y + 40);
  await page.mouse.down();
  await expect(page.locator(".energy-state")).toHaveText("Charge: running");
  await pad.dispatchEvent("pointercancel", { pointerId: 99 });
  await expect(page.locator(".energy-state")).toHaveText("Charge: running");
  await page.mouse.up();
  await expect(page.locator(".energy-state")).toHaveText("Charge: stopped");
});

for (const mode of ["held", "failed"] as const) {
  test(`${mode} activation is recoverable and cannot resurrect cancellation`, async ({
    page,
  }) => {
    await instrument(page, mode, "energy-charge");
    await page
      .getByRole("button", { name: "Start charge", exact: true })
      .click();
    if (mode === "held") {
      await expect(page.locator(".energy-state")).toHaveText(
        "Charge: starting",
      );
      await page.getByRole("button", { name: "Stop all" }).click();
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
    } else {
      await expect(page.locator(".energy-controls [role=alert]")).toContainText(
        "Try Start charge",
      );
    }
    expect((await probe(page)).sources).toBe(0);
    await page
      .getByRole("button", { name: "Start charge", exact: true })
      .click();
    await expect(page.locator(".energy-state")).toHaveText("Charge: running");
    await expect(page.locator(".energy-controls [role=alert]")).toHaveCount(0);
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        value: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(page.locator(".energy-state")).toHaveText("Charge: stopped");
    await expect
      .poll(async () => (await probe(page)).contexts)
      .toEqual(["suspended"]);
    await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
    await expect
      .poll(async () => (await probe(page)).contexts)
      .toEqual(["closed"]);
    expect((await probe(page)).connected).toBe(0);
  });
}

test("canonical source copying, clipboard denial, narrow touch and reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await instrument(page, "normal", "energy-charge");
  for (const name of ["recipe.ts", "progress.ts", "host.ts", "index.html"]) {
    await page.locator("summary").filter({ hasText: name }).click();
    await page
      .getByRole("button", { name: `Copy ${name}`, exact: true })
      .click();
    expect(
      await page.evaluate(
        () => (globalThis as unknown as { copiedSource: string }).copiedSource,
      ),
    ).toBe(readFileSync(`catalog/energy-charge/${name}`, "utf8"));
  }
  await page.evaluate(() => {
    navigator.clipboard.writeText = async () => {
      throw new Error("denied");
    };
  });
  await page.getByRole("button", { name: "Copy host.ts", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Copy unavailable" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const pad = page.getByRole("button", { name: "Hold to charge", exact: true });
  await pad.scrollIntoViewIfNeeded();
  const box = (await pad.boundingBox())!;
  const touch = await page.context().newCDPSession(page);
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: box.x + 60, y: box.y + 60 }],
  });
  await expect(page.locator(".energy-state")).toHaveText("Charge: running");
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
  await expect(page.locator(".energy-state")).toHaveText("Charge: stopped");
  await page.goto("http://127.0.0.1:3100/sounds");
  await expect(
    page.getByRole("link", { name: "Try energy charge" }),
  ).toBeVisible();
});

test("Chromium signal bounds, smooth retargeting, partial/full release and intensity", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4173");
  await page.addScriptTag({
    path: resolve(
      "node_modules/.cache/audiobits-audio-tests/audio-harness.iife.js",
    ),
  });
  await requireOfflineCheckpoints(page);
  const results = await page.evaluate(async () => {
    type Signal = {
      energy: number;
      peak: number;
      delta: number;
      onset: number;
      tail: number;
      finished: number;
      releaseEnergy: number;
      afterRelease: number;
      brightness: number;
    };
    const h = globalThis as unknown as {
      dynamicSignal(
        rate: number,
        kind: string,
        value: number,
        update?: boolean,
        cancel?: boolean,
        count?: number,
        stopAt?: number,
      ): Promise<Signal>;
    };
    const results = [];
    for (const rate of [44100, 48000]) {
      results.push(
        await h.dynamicSignal(rate, "energy-charge", 0),
        await h.dynamicSignal(rate, "energy-charge", 1),
        await h.dynamicSignal(rate, "energy-charge", 0.4, true),
        await h.dynamicSignal(
          rate,
          "energy-charge",
          0.4,
          false,
          false,
          1,
          0.12,
        ),
      );
    }
    return results;
  });
  for (const s of results) {
    expect(s.energy).toBeGreaterThan(0);
    expect(s.peak).toBeLessThan(0.2);
    expect(s.delta).toBeLessThan(0.01);
    expect(s.onset).toBe(0);
    expect(s.tail).toBe(0);
    expect(s.finished).toBe(1);
    expect(s.releaseEnergy).toBeGreaterThan(0);
    expect(s.afterRelease).toBe(0);
  }
  for (const offset of [0, 4]) {
    expect(results[offset + 1].energy).toBeGreaterThan(
      results[offset].energy * 4,
    );
    expect(results[offset + 1].brightness).toBeGreaterThan(
      results[offset].brightness * 2,
    );
  }
});

// Model the first frame timestamp predating the event's performance.now().
test("hold progress uses only frame timestamps and never becomes negative", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (cause) => errors.push(cause.message));
  await page.addInitScript(() => {
    const raf = requestAnimationFrame;
    window.requestAnimationFrame = (callback) =>
      raf((time) => callback(time - 500));
  });
  await instrument(page, "normal", "energy-charge");
  const pad = page.getByRole("button", { name: "Hold to charge", exact: true });
  await expect(pad).toBeEnabled();
  await pad.focus();
  await page.keyboard.down("Enter");
  await expect
    .poll(async () =>
      Number(
        await page
          .getByRole("slider", { name: "Charge", exact: true })
          .inputValue(),
      ),
    )
    .toBeGreaterThan(0.05);
  await page.keyboard.up("Enter");
  expect(errors).toEqual([]);
});
