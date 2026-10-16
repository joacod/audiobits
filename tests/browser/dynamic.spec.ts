import { dragThruster } from "./experience-probe";
import { requireOfflineCheckpoints } from "./offline-capabilities";
import { expect, test } from "@playwright/test";
import { resolve } from "node:path";
import type { Page } from "@playwright/test";
async function harness(page: Page) {
  await page.goto("http://127.0.0.1:4173");
  await page.addScriptTag({
    path: resolve(
      "node_modules/.cache/audiobits-audio-tests/audio-harness.iife.js",
    ),
  });
}
interface Signal {
  count: number;
  peak: number;
  energy: number;
  onset: number;
  tail: number;
  delta: number;
  seamDelta: number;
  seamRms: number;
  steadyRms: number;
  checksum: number;
  finished: number;
}
interface Helpers {
  dynamicSignal(
    rate: number,
    kind: "impact" | "thruster",
    control: number,
    update?: boolean,
    cancel?: boolean,
    count?: number,
    stopAt?: number,
  ): Promise<Signal>;
  dynamicLifecycle(): Promise<unknown>;
}
test("dynamic offline extrema, seeded replay, loop seams, rapid updates and release at both rates @smoke", async ({
  page,
  browser,
}) => {
  await harness(page);
  await requireOfflineCheckpoints(page);
  const result = await page.evaluate(async () => {
    const helper = globalThis as unknown as Helpers;
    const output = [];
    for (const rate of [44100, 48000]) {
      for (const kind of ["impact", "thruster"] as const) {
        for (const control of [0, kind === "impact" ? 0.5 : 0.2, 1]) {
          output.push(await helper.dynamicSignal(rate, kind, control));
        }
      }
      const replay = await helper.dynamicSignal(rate, "impact", 0.5);
      const original = output[output.length - 5];
      if (replay.checksum !== original.checksum)
        throw new Error("Seed replay signal mismatch");
      output.push(
        await helper.dynamicSignal(rate, "impact", 0.5, false, false, 8),
      );
      output.push(
        await helper.dynamicSignal(rate, "thruster", 1, false, false, 1, 0.09),
      );
      output.push(await helper.dynamicSignal(rate, "thruster", 0.2, true));
      const cancelled = await helper.dynamicSignal(
        rate,
        "thruster",
        0.2,
        false,
        true,
      );
      if (cancelled.energy !== 0 || cancelled.finished !== 1)
        throw new Error("Sustained cancellation was not silent or clean");
    }
    return output;
  });
  console.log(
    `Dynamic signal ${browser.browserType().name()} ${browser.version()}: ${JSON.stringify(result)}`,
  );
  for (const signal of result) {
    expect(signal.peak).toBeGreaterThan(0.001);
    expect(signal.peak).toBeLessThan(signal.count === 8 ? 1 : 0.2);
    expect(signal.energy).toBeGreaterThan(0);
    expect(signal.onset).toBe(0);
    expect(signal.tail).toBe(0);
    expect(signal.finished).toBe(signal.count);
    expect(signal.delta).toBeLessThan(signal.count === 8 ? 0.04 : 0.006);
    expect(signal.seamDelta).toBeLessThan(0.006);
    if (signal.steadyRms > 0) {
      expect(signal.seamRms / signal.steadyRms).toBeGreaterThan(0.5);
      expect(signal.seamRms / signal.steadyRms).toBeLessThan(2);
    }
  }
});
test("native dynamic resource bounds, cleanup and timing baseline", async ({
  page,
}) => {
  await harness(page);
  await page.evaluate(() => {
    const button = document.createElement("button");
    button.textContent = "Dynamic lifecycle";
    button.onclick = () => {
      void (globalThis as unknown as Helpers)
        .dynamicLifecycle()
        .then((result) => {
          button.textContent = JSON.stringify(result);
        })
        .catch((error: Error) => {
          button.textContent = `FAIL: ${error.message}`;
        });
    };
    document.body.append(button);
  });
  await page.getByRole("button", { name: "Dynamic lifecycle" }).click();
  const button = page.getByRole("button", { name: /"finalNodes":0/ });
  await expect(button).toBeVisible();
  console.log(`Dynamic resources: ${await button.textContent()}`);
});
test("vanilla impact and one continuous thruster through public exports", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Native = globalThis.AudioContext;
    const sources: AudioScheduledSourceNode[] = [];
    const contexts: AudioContext[] = [];
    globalThis.AudioContext = class extends Native {
      constructor() {
        super();
        contexts.push(this);
      }
      createOscillator() {
        const node = super.createOscillator();
        sources.push(node);
        return node;
      }
      createBufferSource() {
        const node = super.createBufferSource();
        sources.push(node);
        return node;
      }
    };
    Object.assign(globalThis, { sources, contexts });
  });
  await page.goto("http://127.0.0.1:4173");
  expect(
    await page.evaluate(
      () =>
        (globalThis as unknown as { contexts: AudioContext[] }).contexts.length,
    ),
  ).toBe(0);
  await page.getByRole("slider", { name: "Intensity", exact: true }).fill("1");
  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: "Play impact" }).click();
  await page.getByRole("button", { name: "Start thruster" }).click();
  const state = page.locator("#thruster-state");
  await expect(state).toHaveText("Thruster: running");
  await expect(
    page.getByRole("button", { name: "Start thruster" }),
  ).toBeDisabled();
  const count = await page.evaluate(
    () => (globalThis as unknown as { sources: unknown[] }).sources.length,
  );
  for (const value of ["1", "0", "0.75", "0.2"])
    await page.getByRole("slider", { name: "Throttle" }).fill(value);
  expect(
    await page.evaluate(
      () => (globalThis as unknown as { sources: unknown[] }).sources.length,
    ),
  ).toBe(count);
  expect(count).toBe(9);
  await page
    .getByRole("button", { name: "Stop thruster", exact: true })
    .click();
  await expect(state).toHaveText("Thruster: stopped");
  await page.getByRole("button", { name: "Start thruster" }).click();
  await expect(state).toHaveText("Thruster: running");
  await page.getByRole("button", { name: "Stop all", exact: true }).click();
  await expect(state).toHaveText("Thruster: stopped");
  await expect(page.getByRole("alert")).toBeEmpty();
  await page.getByRole("button", { name: "Start thruster" }).click();
  await expect(state).toHaveText("Thruster: running");
  // Scripted host visibility event: native graphs, simulated page hide.
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(state).toHaveText("Thruster: stopped");
  await expect
    .poll(() =>
      page.evaluate(() =>
        (globalThis as unknown as { contexts: AudioContext[] }).contexts.map(
          (context) => context.state,
        ),
      ),
    )
    .toEqual(["suspended"]);
  await page.evaluate(() => {
    Reflect.deleteProperty(document, "hidden");
  });
  await page.getByRole("button", { name: "Start thruster" }).click();
  await expect(state).toHaveText("Thruster: running");
  await page.evaluate(() => {
    window.dispatchEvent(new Event("pagehide"));
  });
  await expect
    .poll(() =>
      page.evaluate(() =>
        (globalThis as unknown as { contexts: AudioContext[] }).contexts.map(
          (context) => context.state,
        ),
      ),
    )
    .toEqual(["closed"]);
});

test("homepage reactive thruster keeps one voice through live updates and hide", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Native = globalThis.AudioContext;
    const sources: AudioScheduledSourceNode[] = [];
    const contexts: AudioContext[] = [];
    globalThis.AudioContext = class extends Native {
      constructor() {
        super();
        contexts.push(this);
      }
      createOscillator() {
        const node = super.createOscillator();
        sources.push(node);
        return node;
      }
      createBufferSource() {
        const node = super.createBufferSource();
        sources.push(node);
        return node;
      }
    };
    Object.assign(globalThis, { sources, contexts });
  });
  await page.goto("http://127.0.0.1:3100");
  expect(
    await page.evaluate(
      () =>
        (globalThis as unknown as { contexts: AudioContext[] }).contexts.length,
    ),
  ).toBe(0);
  const state = page.getByTestId("landing-playback-state");
  const box = await dragThruster(page);
  await expect(state).toHaveText("Thruster: running");
  const count = await page.evaluate(
    () => (globalThis as unknown as { sources: unknown[] }).sources.length,
  );
  expect(count).toBe(3);
  for (const x of [40, box.width - 40, box.width / 2, box.width - 60])
    await page.mouse.move(box.x + x, box.y + 120, { steps: 6 });
  expect(
    await page.evaluate(
      () => (globalThis as unknown as { sources: unknown[] }).sources.length,
    ),
  ).toBe(count);
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
  await expect(
    page
      .getByRole("region", { name: "Reactive Thruster hero" })
      .getByRole("alert"),
  ).toHaveCount(0);
  await page.mouse.up();
  await expect(state).toHaveText("Thruster: stopped");
  await page.mouse.up();
  await dragThruster(page);
  await expect(state).toHaveText("Thruster: running");
  expect(
    await page.evaluate(
      () => (globalThis as unknown as { sources: unknown[] }).sources.length,
    ),
  ).toBe(6);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(state).toHaveText("Thruster: stopped");
  await expect
    .poll(() =>
      page.evaluate(() =>
        (globalThis as unknown as { contexts: AudioContext[] }).contexts.map(
          (context) => context.state,
        ),
      ),
    )
    .toEqual(["suspended"]);
  await page.evaluate(() => {
    Reflect.deleteProperty(document, "hidden");
  });
  await page.mouse.up();
  await dragThruster(page);
  await expect(state).toHaveText("Thruster: running");
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Docs" })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("http://127.0.0.1:3100/docs");
  await expect
    .poll(() =>
      page.evaluate(() =>
        (globalThis as unknown as { contexts: AudioContext[] }).contexts.map(
          (context) => context.state,
        ),
      ),
    )
    .toEqual(["closed"]);
});
