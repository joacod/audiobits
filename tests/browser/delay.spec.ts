import { expect, test } from "@playwright/test";
import { resolve } from "node:path";
import { requireOfflineCheckpoints } from "./offline-capabilities";

declare global {
  var delayChecks: typeof import("./delay-harness").delayChecks;
}

test.beforeEach(async ({ page }) => {
  await page.goto("http://127.0.0.1:4173");
  await page.addScriptTag({
    path: resolve(
      "node_modules/.cache/audiobits-audio-tests/audio-harness.iife.js",
    ),
  });
});
for (const rate of [44100, 48000])
  test(`delay timing, mixing, feedback and layer isolation at ${rate} Hz @smoke`, async ({
    page,
  }) => {
    const result = await page.evaluate(
      (sampleRate) => globalThis.delayChecks.signal(sampleRate),
      rate,
    );
    expect(result).toHaveLength(9);
    console.log(JSON.stringify({ rate, result }));
  });
test("delay release, explicit cutting, cancellation and Stop during a tail @smoke", async ({
  page,
}) => {
  await requireOfflineCheckpoints(page);
  console.log(
    JSON.stringify(await page.evaluate(() => globalThis.delayChecks.release())),
  );
});
test("delay/filter ordering matches an independent native reference @smoke", async ({
  page,
}) => {
  console.log(
    JSON.stringify(
      await page.evaluate(() => globalThis.delayChecks.ordering()),
    ),
  );
});
test("delay tails own bounded resources through natural completion, stealing, suspension and disposal @smoke", async ({
  page,
  browser,
}) => {
  await page.evaluate(() => {
    const button = document.createElement("button");
    button.textContent = "Delay lifecycle";
    button.id = "delay-lifecycle";
    button.onclick = () => {
      void globalThis.delayChecks
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
  const button = page.locator("#delay-lifecycle");
  await button.click();
  await expect(button).toContainText('"finalNodes":0');
  console.log(`Chromium ${browser.version()}: ${await button.textContent()}`);
});

test("delay bounds, low sample rate timing and eight-voice output headroom", async ({
  page,
}) => {
  console.log(
    JSON.stringify(
      await page.evaluate(() => globalThis.delayChecks.boundaries()),
    ),
  );
});
