import { requireOfflineCheckpoints } from "./offline-capabilities";
import { test, expect } from "@playwright/test";
import { resolve } from "node:path";
interface Measurements {
  peak: number;
  energy: number;
  tail: number;
  onset: number;
  maxDelta: number;
  finished: number;
}
interface Checks {
  signal(count: number, action?: "cancel"): Promise<Measurements>;
  stopSignal(): Promise<{
    energy: number;
    releaseEnergy: number;
    late: number;
    delta: number;
  }>;
  lifecycle(): Promise<unknown>;
}

test("Native offline signal, overlap and cancellation", async ({
  page,
  browser,
  browserName,
}) => {
  console.log(`Audio checks: ${browserName} ${browser.version()}`);
  await page.goto("http://127.0.0.1:4173");
  await page.addScriptTag({
    path: resolve(
      "node_modules/.cache/audiobits-audio-tests/audio-harness.iife.js",
    ),
  });
  const output = await page.evaluate(async () => {
    const checks = (globalThis as unknown as { audioChecks: Checks })
      .audioChecks;
    return {
      single: await checks.signal(1),
      eight: await checks.signal(8),
      cancelled: await checks.signal(1, "cancel"),
    };
  });
  console.log(JSON.stringify(output));
  expect(output.single.energy).toBeGreaterThan(0.1);
  expect(output.single.peak).toBeGreaterThan(0.01);
  expect(output.single.peak).toBeLessThan(0.1);
  expect(output.eight.peak).toBeLessThan(1);
  expect(output.eight.peak).toBeCloseTo(output.single.peak * 8, 4);
  expect(output.single.onset).toBe(0);
  expect(output.single.tail).toBeLessThan(1e-6);
  expect(output.cancelled.energy).toBe(0);
});

test("native offline release during attack fades to silence", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4173");
  await requireOfflineCheckpoints(page);
  await page.addScriptTag({
    path: resolve(
      "node_modules/.cache/audiobits-audio-tests/audio-harness.iife.js",
    ),
  });
  const output = await page.evaluate(() =>
    (globalThis as unknown as { audioChecks: Checks }).audioChecks.stopSignal(),
  );
  expect(output.energy).toBeGreaterThan(0);
  expect(output.releaseEnergy).toBeGreaterThan(0.0001);
  expect(output.late).toBe(0);
  expect(output.delta).toBeLessThan(0.001);
});

test("Native lifecycle and simulated failed activation retry", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4173");
  await page.addScriptTag({
    path: resolve(
      "node_modules/.cache/audiobits-audio-tests/audio-harness.iife.js",
    ),
  });
  await page.evaluate(() => {
    const button = document.createElement("button");
    button.textContent = "Run lifecycle";
    button.onclick = () => {
      const checks = (globalThis as unknown as { audioChecks: Checks })
        .audioChecks;
      void checks
        .lifecycle()
        .then((result) => {
          button.textContent = JSON.stringify(result);
        })
        .catch((error: Error) => {
          button.textContent = `FAIL: ${error.message}`;
        });
    };
    document.body.append(button);
  });
  const button = page.getByRole("button", { name: "Run lifecycle" });
  await button.click();
  await expect(
    page.getByRole("button", { name: /"state":"disposed"/ }),
  ).toBeVisible();
});

test("site gesture, mute, stop and route teardown close owned context", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const contexts: AudioContext[] = [];
    const Native = globalThis.AudioContext;
    globalThis.AudioContext = class extends Native {
      constructor() {
        super();
        contexts.push(this);
      }
    };
    Object.assign(globalThis, { ownedContexts: contexts });
  });
  await page.goto("http://127.0.0.1:3100/sounds/confirmation");
  await expect(page.getByRole("status")).toHaveText("Audio: idle");
  expect(
    await page.evaluate(
      () =>
        (globalThis as unknown as { ownedContexts: AudioContext[] })
          .ownedContexts.length,
    ),
  ).toBe(0);
  await page.getByRole("button", { name: "Play confirmation" }).click();
  await expect(page.getByRole("status")).toHaveText("Audio: running");
  await page.getByRole("button", { name: "Mute", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Mute", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Stop all" }).click();
  await page.getByRole("link", { name: "Development docs" }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          globalThis as unknown as { ownedContexts: AudioContext[] }
        ).ownedContexts.map((context) => context.state),
      ),
    )
    .toEqual(["closed"]);
});

test("vanilla gesture and controls work with built public exports", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4173");
  await page.getByRole("button", { name: "Play confirmation" }).click();
  await expect(page.locator("#audio-state")).toHaveText("Audio: running");
  await page.getByRole("button", { name: "Mute", exact: true }).click();
  await expect(page.locator("#mute")).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Stop all" }).click();
  await expect(page.locator("#audio-error")).toBeEmpty();
});

test("actual Chromium autoplay block times out and retries from a gesture", async ({
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "Chromium-specific autoplay launch policy",
  );
  const { chromium } = await import("@playwright/test");
  const { readFile } = await import("node:fs/promises");
  const browser = await chromium.launch({
    args: ["--autoplay-policy=document-user-activation-required"],
  });
  try {
    const page = await browser.newPage();
    await page.route("**/audio-harness.js", async (route) => {
      await route.fulfill({
        contentType: "text/javascript",
        body: await readFile(
          resolve(
            "node_modules/.cache/audiobits-audio-tests/audio-harness.iife.js",
          ),
          "utf8",
        ),
      });
    });
    await page.route("**/autoplay.html", async (route) => {
      await route.fulfill({
        contentType: "text/html",
        body: `<!doctype html><title>Activation test</title><p id="result">Starting</p><button id="retry">Retry activation</button><script src="/audio-harness.js"></script><script>
      blockedActivation().then(result => document.querySelector('#result').textContent = JSON.stringify(result));
      document.querySelector('#retry').onclick = () => retryActivation().then(result => document.querySelector('#result').textContent = JSON.stringify(result)).catch(error => document.querySelector('#result').textContent = 'FAIL: ' + error.message);
    </script>`,
      });
    });
    await page.goto("http://127.0.0.1:4173/autoplay.html");
    await expect(page.locator("#result")).toHaveText(
      JSON.stringify({
        rejected: true,
        state: "suspended",
        nativeState: "suspended",
        counts: { active: 0, retiring: 0 },
      }),
    );
    await page.getByRole("button", { name: "Retry activation" }).click();
    await expect(page.locator("#result")).toHaveText(
      JSON.stringify({
        state: "disposed",
        nativeState: "closed",
        counts: { active: 0, retiring: 0 },
      }),
    );
  } finally {
    await browser.close();
  }
});
