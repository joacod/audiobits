import { expect, test } from "@playwright/test";
import { resolve } from "node:path";
import { instrument, probe } from "./experience-probe";
import { requireOfflineCheckpoints } from "./offline-capabilities";

test("holding grows charge on one voice, releases and tears down @smoke", async ({
  page,
}) => {
  await instrument(page, "normal", "energy-charge");
  const hold = page.getByRole("button", {
    name: "Hold to charge",
    exact: true,
  });
  await expect(hold).toBeEnabled();
  await expect(
    page.locator(".energy-controls button, .energy-controls input"),
  ).toHaveCount(0);
  expect((await probe(page)).contexts).toEqual([]);
  await hold.focus();
  await page.keyboard.down("Space");
  await expect(page.locator(".energy-state")).toHaveText("Charge: running");
  await expect(hold).toHaveAttribute("data-full", "true");
  expect((await probe(page)).sources).toBe(4);
  await expect
    .poll(async () =>
      Number(
        await page.locator(".charge-rings canvas").getAttribute("data-peak"),
      ),
    )
    .toBeGreaterThan(0);
  await page.keyboard.up("Space");
  await expect.poll(async () => (await probe(page)).ended).toBe(4);
  for (let i = 0; i < 5; i++) {
    await hold.focus();
    await page.keyboard.down("Space");
    await expect(page.locator(".energy-state")).toHaveText("Charge: running");
    // Two per-sound voices plus one retiring voice, each with four sources.
    // Native ended delivery can lag disconnection of a stolen voice.
    expect((await probe(page)).ownedSources).toBeLessThanOrEqual(12);
    await page.keyboard.up("Space");
  }
  await expect
    .poll(async () => {
      const p = await probe(page);
      return p.sources === p.ended;
    })
    .toBe(true);
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Catalog", exact: true })
    .click();
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
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
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
    const hold = page.getByRole("button", {
      name: "Hold to charge",
      exact: true,
    });
    await expect(hold).toBeEnabled();
    const report = page.getByRole("textbox", {
      name: "Audio activation report",
    });
    let failureReport = "";
    await hold.focus();
    await page.keyboard.down("Space");
    if (mode === "held") {
      await expect(page.locator(".energy-state")).toHaveText(
        "Charge: starting",
      );
      await page.keyboard.up("Space");
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
        "Hold to charge again",
      );
      await expect(page.locator(".energy-controls [role=alert]")).toContainText(
        "AudioBitsError [start-failed]: Audio activation failed.",
      );
      failureReport = await report.inputValue();
      expect(JSON.parse(failureReport)).toMatchObject({
        error: {
          code: "start-failed",
          message: "Audio activation failed. Retry Play with a user gesture.",
        },
        input: { engineState: "suspended" },
      });
      expect(JSON.parse(failureReport).input.events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: "keydown" }),
          expect.objectContaining({ type: "engine-state", state: "starting" }),
        ]),
      );
      await report.focus();
      expect(
        await report.evaluate(
          (element: HTMLTextAreaElement) =>
            element.readOnly &&
            element.selectionStart === 0 &&
            element.selectionEnd === element.value.length,
        ),
      ).toBe(true);
    }
    expect((await probe(page)).sources).toBe(0);
    await page.keyboard.up("Space");
    await hold.focus();
    await page.keyboard.down("Space");
    await expect(page.locator(".energy-state")).toHaveText("Charge: running");
    await expect(page.locator(".energy-controls [role=alert]")).toHaveCount(0);
    if (mode === "failed") await expect(report).toHaveValue(failureReport);
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

test("controller usage copying, clipboard denial, narrow touch and reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await instrument(page, "normal", "energy-charge");
  const interaction = page.locator(".catalog-usage");
  await expect(page.locator(".charge-rings")).toHaveAttribute(
    "data-renderer",
    "css",
  );
  await interaction
    .getByRole("button", { name: "Copy energy-charge code", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => (globalThis as unknown as { copiedSource: string }).copiedSource,
    ),
  ).toBe(await interaction.locator("pre").innerText());
  await expect(interaction).toContainText("charge.setCharge(value)");
  await expect(interaction).toContainText("charge.release()");
  await page.evaluate(() => {
    navigator.clipboard.writeText = async () => {
      throw new Error("denied");
    };
  });
  await interaction
    .getByRole("button", { name: "Copy energy-charge code", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Clipboard unavailable" }),
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
  await page.goto("http://127.0.0.1:3100/catalog");
  await expect(
    page.getByRole("link", { name: "Open energy charge", exact: true }),
  ).toBeVisible();
});

test("Chromium signal bounds, smooth retargeting, partial/full release and intensity @smoke", async ({
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
    .poll(
      async () =>
        Number(
          (await pad.locator(".charge-percent").textContent())!.replace(
            "%",
            "",
          ),
        ) / 100,
    )
    .toBeGreaterThan(0.05);
  await page.keyboard.up("Enter");
  expect(errors).toEqual([]);
});
