import { expect, test } from "@playwright/test";
import { resolve } from "node:path";
import { requireOfflineCheckpoints } from "./offline-capabilities";
import type { Page } from "@playwright/test";

interface Probe {
  contexts: AudioContext[];
  sources: AudioScheduledSourceNode[];
  ended: number;
  connected: Set<AudioNode>;
  releaseActivation(): void;
}
async function instrument(
  page: Page,
  activation: "normal" | "held" | "failed" = "normal",
) {
  await page.addInitScript((mode) => {
    const Native = AudioContext;
    const probe = {
      contexts: [] as AudioContext[],
      sources: [] as AudioScheduledSourceNode[],
      ended: 0,
      connected: new Set<AudioNode>(),
      releaseActivation: () => {},
    };
    let fail = mode === "failed";
    globalThis.AudioContext = class extends Native {
      constructor() {
        super();
        probe.contexts.push(this);
        for (const name of [
          "createGain",
          "createOscillator",
          "createBufferSource",
          "createBiquadFilter",
          "createStereoPanner",
          "createAnalyser",
        ] as const) {
          const create = this[name].bind(this);
          Object.defineProperty(this, name, {
            value: () => {
              const node = create();
              const connect = node.connect.bind(node);
              const disconnect = node.disconnect.bind(node);
              Object.defineProperty(node, "connect", {
                value: (...args: Parameters<AudioNode["connect"]>) => {
                  probe.connected.add(node);
                  return connect(...args);
                },
              });
              Object.defineProperty(node, "disconnect", {
                value: () => {
                  probe.connected.delete(node);
                  disconnect();
                },
              });
              if (node instanceof AudioScheduledSourceNode) {
                probe.sources.push(node);
                node.addEventListener("ended", () => {
                  probe.ended++;
                });
              }
              return node;
            },
          });
        }
      }
      resume() {
        if (fail) {
          fail = false;
          return Promise.reject(new Error("Activation denied"));
        }
        if (mode === "held")
          return new Promise<void>((yes, no) => {
            probe.releaseActivation = () => {
              void super.resume().then(yes, no);
            };
          });
        return super.resume();
      }
    };
    Object.assign(globalThis, { thrusterProbe: probe });
  }, activation);
  await page.goto("http://127.0.0.1:4173");
}
const probe = (page: Page) =>
  page.evaluate(() => {
    const p = (globalThis as unknown as { thrusterProbe: Probe }).thrusterProbe;
    return {
      contexts: p.contexts.map((c) => c.state),
      sources: p.sources.length,
      ended: p.ended,
      connected: p.connected.size,
    };
  });

test("native pointer velocity, stationary idle, live controls, impact coexistence, release and teardown", async ({
  page,
}) => {
  await instrument(page);
  expect((await probe(page)).contexts).toEqual([]);
  const pad = page.getByRole("region", { name: "Pointer thruster" });
  const box = (await pad.boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.down();
  await expect(page.locator("#thruster-state")).toHaveText("Thruster: running");
  expect((await probe(page)).sources).toBe(3);
  await page.mouse.move(box.x + box.width - 20, box.y + 60, { steps: 6 });
  await expect
    .poll(async () =>
      Number(await page.locator("#motion-throttle").textContent()),
    )
    .toBeGreaterThan(0.05);
  await expect
    .poll(async () =>
      Number(await page.locator("#motion-throttle").textContent()),
    )
    .toBeLessThan(0.01);
  // A second pointer must not interrupt the captured interaction.
  await pad.dispatchEvent("pointercancel", { pointerId: 99 });
  await expect(page.locator("#thruster-state")).toHaveText("Thruster: running");
  await page.mouse.up();
  await expect(page.locator("#thruster-state")).toHaveText("Thruster: stopped");
  await expect.poll(async () => (await probe(page)).ended).toBe(3);
  await page.getByRole("button", { name: "Start thruster" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#thruster-state")).toHaveText("Thruster: running");
  const before = (await probe(page)).sources;
  for (const value of ["1", "0", "0.75", "0.2"])
    await page
      .getByRole("slider", { name: "Throttle", exact: true })
      .fill(value);
  expect((await probe(page)).sources).toBe(before);
  await page.getByRole("button", { name: "Play impact" }).click();
  expect((await probe(page)).sources).toBe(before + 2);
  await expect(page.locator("#thruster-state")).toHaveText("Thruster: running");
  await expect
    .poll(async () =>
      Number((await page.locator("#level").textContent())!.split(": ")[1]),
    )
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "Stop all", exact: true }).click();
  await expect
    .poll(async () => {
      const p = await probe(page);
      return p.ended === p.sources;
    })
    .toBe(true);
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  await expect
    .poll(async () => (await probe(page)).contexts)
    .toEqual(["closed"]);
  expect((await probe(page)).connected).toBe(0);
  await expect(page.getByRole("alert")).toBeEmpty();
});

test("held native activation cannot replay cancelled pointer input, but a fresh start succeeds", async ({
  page,
}) => {
  await instrument(page, "held");
  await page.getByRole("button", { name: "Start thruster" }).click();
  await expect(page.locator("#thruster-state")).toHaveText(
    "Thruster: starting",
  );
  await page
    .getByRole("button", { name: "Stop thruster", exact: true })
    .click();
  await page.evaluate(() =>
    (
      globalThis as unknown as { thrusterProbe: Probe }
    ).thrusterProbe.releaseActivation(),
  );
  await expect(page.locator("#audio-state")).toHaveText("Audio: running");
  expect((await probe(page)).sources).toBe(0);
  await page.getByRole("button", { name: "Start thruster" }).click();
  await expect(page.locator("#thruster-state")).toHaveText("Thruster: running");
  for (let i = 0; i < 8; i++) {
    await page
      .getByRole("button", { name: "Stop thruster", exact: true })
      .click();
    await page.getByRole("button", { name: "Start thruster" }).click();
    await expect(page.locator("#thruster-state")).toHaveText(
      "Thruster: running",
    );
    const p = await probe(page);
    expect(p.sources - p.ended).toBeLessThanOrEqual(9); // 2 owned + 1 retiring voice, 3 sources each.
  }
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator("#thruster-state")).toHaveText("Thruster: stopped");
  await expect
    .poll(async () => (await probe(page)).contexts)
    .toEqual(["suspended"]);
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  await expect
    .poll(async () => (await probe(page)).contexts)
    .toEqual(["closed"]);
  expect((await probe(page)).connected).toBe(0);
});

test("activation failure is visible and retryable", async ({ page }) => {
  await instrument(page, "failed");
  await page.getByRole("button", { name: "Start thruster" }).click();
  await expect(page.locator("#thruster-state")).toHaveText("Thruster: stopped");
  await expect(page.getByRole("alert")).toContainText("activation failed");
  expect((await probe(page)).sources).toBe(0);
  await page.getByRole("button", { name: "Start thruster" }).click();
  await expect(page.locator("#thruster-state")).toHaveText("Thruster: running");
  await expect(page.getByRole("alert")).toBeEmpty();
});

test("reactive recipe Chromium signal extrema, seeded noise, rapid control ramps and release", async ({
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
      peak: number;
      energy: number;
      tail: number;
      onset: number;
      delta: number;
      finished: number;
      checksum: number;
      brightness: number;
      releaseEnergy: number;
      afterRelease: number;
    };
    const helper = globalThis as unknown as {
      dynamicSignal(
        rate: number,
        kind: "reactive-thruster",
        value: number,
        update?: boolean,
        cancel?: boolean,
        count?: number,
        stopAt?: number,
      ): Promise<Signal>;
    };
    const results = [];
    for (const rate of [44100, 48000]) {
      const low = await helper.dynamicSignal(rate, "reactive-thruster", 0);
      const high = await helper.dynamicSignal(rate, "reactive-thruster", 1);
      const replay = await helper.dynamicSignal(rate, "reactive-thruster", 1);
      // Native oscillator/filter rounding differs by a few float ULPs across renders.
      // Exact seeded buffers are checked in units; native signal energy uses tolerance.
      if (Math.abs(replay.energy - high.energy) / high.energy > 1e-6)
        throw new Error("Seeded render energy changed");
      const cancelled = await helper.dynamicSignal(
        rate,
        "reactive-thruster",
        0.2,
        false,
        true,
      );
      if (cancelled.energy !== 0 || cancelled.finished !== 1)
        throw new Error("Cancelled voice retained signal/resources");
      results.push(
        low,
        high,
        await helper.dynamicSignal(rate, "reactive-thruster", 0.2, true),
        await helper.dynamicSignal(
          rate,
          "reactive-thruster",
          1,
          false,
          false,
          1,
          0.09,
        ),
      );
    }
    return results;
  });
  for (const s of results) {
    expect(s.energy).toBeGreaterThan(0);
    expect(s.peak).toBeGreaterThan(0.001);
    expect(s.peak).toBeLessThan(0.2); // Single voice, -12 dB master equivalent.
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
