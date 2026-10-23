import { expect, test } from "@playwright/test";
import { resolve } from "node:path";
import { requireOfflineCheckpoints } from "./offline-capabilities";

test("managed offline linear automation preserves signal without native hold", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4173");
  await requireOfflineCheckpoints(page);
  await page.addScriptTag({
    path: resolve(
      "node_modules/.cache/audiobits-audio-tests/audio-harness.iife.js",
    ),
  });
  const results = await page.evaluate(async () => {
    const helpers = globalThis as unknown as {
      audioChecks: {
        stopSignal(): Promise<{
          energy: number;
          late: number;
          delta: number;
        }>;
      };
      dynamicSignal(
        rate: number,
        kind: string,
        control: number,
        update: boolean,
      ): Promise<{
        energy: number;
        tail: number;
        delta: number;
        finished: number;
      }>;
      mixingSignal(
        rate: number,
        cut: boolean,
      ): Promise<{
        tailEnergy: number;
        fadeEnergy: number;
        latePeak: number;
      }>;
    };
    const baseline = await helpers.audioChecks.stopSignal();
    Object.defineProperty(AudioParam.prototype, "cancelAndHoldAtTime", {
      configurable: true,
      value: undefined,
    });
    const stopped = await helpers.audioChecks.stopSignal();
    const dynamic = await helpers.dynamicSignal(48000, "thruster", 0.2, true);
    const mixing = await helpers.mixingSignal(48000, true);
    return { baseline, stopped, dynamic, mixing };
  });
  expect(results.stopped.energy).toBeCloseTo(results.baseline.energy, 5);
  expect(results.stopped.late).toBe(0);
  expect(results.stopped.delta).toBeLessThan(0.001);
  expect(results.dynamic.energy).toBeGreaterThan(0);
  expect(results.dynamic.tail).toBe(0);
  expect(results.dynamic.delta).toBeLessThan(0.006);
  expect(results.dynamic.finished).toBe(1);
  expect(results.mixing.fadeEnergy).toBeGreaterThan(0);
  expect(results.mixing.tailEnergy).toBe(0);
  expect(results.mixing.latePeak).toBe(0);
});

test("managed live automation cleans up without native hold", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4173");
  await page.addScriptTag({
    path: resolve(
      "node_modules/.cache/audiobits-audio-tests/audio-harness.iife.js",
    ),
  });
  await page.evaluate(() => {
    Object.defineProperty(AudioParam.prototype, "cancelAndHoldAtTime", {
      configurable: true,
      value: undefined,
    });
    const button = document.createElement("button");
    button.textContent = "Fallback lifecycle";
    button.onclick = () => {
      void (globalThis as unknown as { mixingLifecycle(): Promise<unknown> })
        .mixingLifecycle()
        .then((result) => {
          button.textContent = JSON.stringify(result);
        })
        .catch((error: Error) => {
          button.textContent = `FAIL: ${error.message}`;
        });
    };
    document.body.append(button);
  });
  await page.getByRole("button", { name: "Fallback lifecycle" }).click();
  await expect(
    page.getByRole("button", { name: /"finalNodes":0/ }),
  ).toBeVisible();
});

// This native comparison uses website catalog metadata. Keep it in the full
// suite while the core automation checks above run without the website harness.
test("catalog live controls match native automation without native hold @site", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4173");
  await requireOfflineCheckpoints(page);
  await page.addScriptTag({
    path: resolve(
      "node_modules/.cache/audiobits-audio-tests/audio-harness.iife.js",
    ),
  });
  const result = await page.evaluate(() => {
    Object.defineProperty(AudioParam.prototype, "cancelAndHoldAtTime", {
      configurable: true,
      value: undefined,
    });
    return (
      globalThis as unknown as {
        catalogSignal(
          rate: number,
          kind: string,
          control: number,
          seed: number,
          action: string,
        ): Promise<{ difference: number; energy: number; latePeak: number }>;
      }
    ).catalogSignal(48000, "thruster", 0.2, 42, "live");
  });
  expect(result.energy).toBeGreaterThan(0);
  expect(result.difference).toBeLessThan(0.000001);
  expect(result.latePeak).toBe(0);
});
