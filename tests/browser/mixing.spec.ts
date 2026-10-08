import { requireOfflineCheckpoints } from "./offline-capabilities";
import { expect, test } from "@playwright/test";
import { resolve } from "node:path";

test("native offline bus gain and mute fade to silence", async ({
  page,
  browser,
}) => {
  // Reproduce delayed main-thread delivery while native offline audio renders.
  // The fixture must still perform the cut at its audio-clock checkpoint.
  await page.addInitScript(() => {
    const render = OfflineAudioContext.prototype.startRendering;
    OfflineAudioContext.prototype.startRendering = function () {
      const rendering = render.call(this);
      const until = performance.now() + 50;
      while (performance.now() < until) {
        /* Busy host thread. */
      }
      return rendering;
    };
  });
  await page.goto("http://127.0.0.1:4173");
  await requireOfflineCheckpoints(page);
  await page.addScriptTag({
    path: resolve(
      "node_modules/.cache/audiobits-audio-tests/audio-harness.iife.js",
    ),
  });
  const results = await page.evaluate(async () => {
    const helpers = globalThis as unknown as {
      mixingSignal(
        rate: number,
        cut: boolean,
      ): Promise<{
        rate: number;
        tailEnergy: number;
        latePeak: number;
        peak: number;
        cutAt: number | null;
        fadeEnergy: number;
      }>;
    };
    const result = [];
    for (const rate of [44100, 48000]) {
      result.push(await helpers.mixingSignal(rate, false));
      result.push(await helpers.mixingSignal(rate, true));
    }
    return result;
  });
  for (let i = 0; i < results.length; i++) {
    expect(results[i].peak).toBeGreaterThan(0.01);
    expect(results[i].peak).toBeLessThan(1);
    expect(results[i].latePeak).toBe(0);
    if (i % 2) {
      // Native offline suspension quantizes the requested checkpoint to a
      // render quantum; assert the actual cut stayed within one 128-frame block.
      expect(Math.abs(results[i].cutAt! - 0.4)).toBeLessThanOrEqual(
        128 / results[i].rate,
      );
      expect(results[i].fadeEnergy).toBeGreaterThan(0);
      expect(results[i].tailEnergy).toBe(0);
    } else {
      expect(results[i].cutAt).toBeNull();
      expect(results[i].tailEnergy).toBeGreaterThan(0.001);
    }
  }
  console.log(
    `Mixing signal ${browser.browserType().name()} ${browser.version()}: ${JSON.stringify(results)}`,
  );
});
test("native combined routing stress returns to bus and engine baselines", async ({
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
    button.textContent = "Mix lifecycle";
    button.onclick = () => {
      void (globalThis as unknown as { mixingLifecycle(): Promise<unknown> })
        .mixingLifecycle()
        .then((value) => {
          button.textContent = JSON.stringify(value);
        })
        .catch((error: Error) => {
          button.textContent = `FAIL: ${error.message}`;
        });
    };
    document.body.append(button);
  });
  await page.getByRole("button", { name: "Mix lifecycle" }).click();
  await expect(
    page.getByRole("button", { name: /"finalNodes":0/ }),
  ).toBeVisible();
  console.log(
    `Mixing resources: ${await page.getByRole("button", { name: /"finalNodes":0/ }).textContent()}`,
  );
});

for (const target of ["site", "vanilla"] as const) {
  test(`${target} hide invalidates a delayed native resume and requires a fresh gesture`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const Native = globalThis.AudioContext;
      let sources = 0;
      let release!: () => void;
      const contexts: AudioContext[] = [];
      globalThis.AudioContext = class extends Native {
        constructor() {
          super();
          contexts.push(this);
          const resume = this.resume.bind(this);
          let first = true;
          this.resume = () => {
            if (!first) return resume();
            first = false;
            return new Promise<void>((resolve, reject) => {
              release = () => {
                void resume().then(resolve, reject);
              };
            });
          };
        }
        createOscillator() {
          sources++;
          return super.createOscillator();
        }
      };
      Object.assign(globalThis, {
        delayedAudio: {
          contexts,
          release: () => release(),
          sources: () => sources,
        },
      });
    });
    await page.goto(
      target === "site"
        ? "http://127.0.0.1:3100/sounds/confirmation"
        : "http://127.0.0.1:4173",
    );
    await page.getByRole("button", { name: "Play confirmation" }).click();
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        value: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
      (
        globalThis as unknown as { delayedAudio: { release(): void } }
      ).delayedAudio.release();
    });
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (
              globalThis as unknown as {
                delayedAudio: { contexts: AudioContext[] };
              }
            ).delayedAudio.contexts[0].state,
        ),
      )
      .toBe("suspended");
    expect(
      await page.evaluate(() =>
        (
          globalThis as unknown as { delayedAudio: { sources(): number } }
        ).delayedAudio.sources(),
      ),
    ).toBe(0);
    await page.evaluate(() => {
      Reflect.deleteProperty(document, "hidden");
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(
      await page.evaluate(() =>
        (
          globalThis as unknown as { delayedAudio: { sources(): number } }
        ).delayedAudio.sources(),
      ),
    ).toBe(0);
    await page.getByRole("button", { name: "Play confirmation" }).click();
    await expect
      .poll(() =>
        page.evaluate(() =>
          (
            globalThis as unknown as { delayedAudio: { sources(): number } }
          ).delayedAudio.sources(),
        ),
      )
      .toBe(2);
  });
  test(`${target} gain, mute and cut Stop all use public routing`, async ({
    page,
  }) => {
    await page.goto(
      target === "site"
        ? "http://127.0.0.1:3100/sounds/impact"
        : "http://127.0.0.1:4173",
    );
    await page.getByRole("button", { name: "Play impact" }).click();
    await page.getByRole("slider", { name: /Effects volume/ }).fill("-6");
    await page.getByRole("button", { name: "Mute", exact: true }).click();
    await page.getByRole("button", { name: "Mute", exact: true }).click();
    await page.getByRole("button", { name: "Stop all" }).click();
    if (target === "vanilla")
      await expect(page.locator("#level")).toContainText("Output peak:");
    if (target === "site")
      await expect(
        page
          .getByRole("region", { name: "Procedural sound gallery" })
          .getByRole("alert"),
      ).toHaveCount(0);
    else await expect(page.getByRole("alert")).toBeEmpty();
  });
}
