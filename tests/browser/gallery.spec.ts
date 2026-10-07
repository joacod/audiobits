import { expect, test } from "@playwright/test";
import { resolve } from "node:path";

async function instrument(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    const contexts: AudioContext[] = [];
    const Native = AudioContext;
    globalThis.AudioContext = class extends Native {
      constructor() {
        super();
        contexts.push(this);
      }
    };
    Object.assign(globalThis, { galleryContexts: contexts, copiedExample: "" });
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (value: string) => {
          Object.assign(globalThis, { copiedExample: value });
        },
      },
    });
  });
}

test("recipe disclosures defer contents and preserve drafts across close and reopen", async ({
  page,
}) => {
  await instrument(page);
  await page.goto("http://127.0.0.1:3100/sounds");
  await expect(page.locator(".recipe-tools textarea")).toHaveCount(0);
  await expect(page.locator(".recipe-tools pre")).toHaveCount(0);
  const summary = page.locator("#impact summary");
  const editor = page.getByRole("textbox", { name: "impact recipe JSON" });
  await summary.click();
  await expect(editor).toBeVisible();
  await editor.fill("{");
  await page
    .getByRole("button", { name: "Apply impact recipe", exact: true })
    .click();
  await expect(page.locator("#impact [role=alert]")).toContainText(
    "Not applied",
  );
  await summary.click();
  await expect(page.locator(".recipe-tools textarea")).toHaveCount(0);
  await summary.click();
  await expect(editor).toHaveValue("{");
  await expect(page.locator("#impact [role=alert]")).toContainText(
    "Not applied",
  );
  await summary.click();
  await page.getByRole("button", { name: "Reset impact", exact: true }).click();
  await summary.click();
  await expect(editor).not.toHaveValue("{");
  await expect(page.locator("#impact [role=alert]")).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        (globalThis as unknown as { galleryContexts: unknown[] })
          .galleryContexts.length,
    ),
  ).toBe(0);
});

test("gallery editing preserves last valid sound; copied values, seeds and restoration follow controls", async ({
  page,
}) => {
  await instrument(page);
  await page.goto("http://127.0.0.1:3100/sounds");
  expect(
    await page.evaluate(
      () =>
        (globalThis as unknown as { galleryContexts: unknown[] })
          .galleryContexts.length,
    ),
  ).toBe(0);
  await page
    .getByRole("slider", { name: "Intensity", exact: true })
    .fill("0.83");
  await page.getByRole("spinbutton", { name: "impact seed" }).fill("7");
  await page
    .getByRole("button", { name: "Copy impact example", exact: true })
    .click();
  const copied = await page.evaluate(
    () => (globalThis as unknown as { copiedExample: string }).copiedExample,
  );
  expect(copied).toContain('"intensity":0.83');
  expect(copied).toContain("seed: 7");
  expect(copied).toContain("audio.dispose()");
  await page.locator("#impact summary").click();
  const editor = page.getByRole("textbox", { name: "impact recipe JSON" });
  const bundled = await editor.inputValue();
  const input = JSON.parse(bundled);
  input.unsupported = "alert('never executed')";
  await editor.fill(JSON.stringify(input));
  await page
    .getByRole("button", { name: "Apply impact recipe", exact: true })
    .click();
  await expect(page.locator("#impact [role=alert]")).toContainText(
    '$["unsupported"]',
  );
  await page.getByRole("button", { name: "Play impact", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Audio: running");
  delete input.unsupported;
  input.layers[0].gainDb.range = [-30, -20];
  await editor.fill(JSON.stringify(input));
  await page
    .getByRole("button", { name: "Apply impact recipe", exact: true })
    .click();
  await expect(page.locator("#impact [role=alert]")).toHaveCount(0);
  await expect(page.locator("#impact")).toContainText(
    "Restore the bundled recipe to view its raw comparison",
  );
  await page
    .getByRole("button", { name: "Copy impact example", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => (globalThis as unknown as { copiedExample: string }).copiedExample,
    ),
  ).toContain("-30");
  await editor.fill("{");
  await page
    .getByRole("button", { name: "Apply impact recipe", exact: true })
    .click();
  await expect(page.locator("#impact [role=alert]")).toContainText(
    "Not applied",
  );
  await editor.fill(" ".repeat(32769));
  await page
    .getByRole("button", { name: "Apply impact recipe", exact: true })
    .click();
  await expect(page.locator("#impact [role=alert]")).toContainText("32 KiB");
  await page
    .getByRole("button", { name: "Restore impact recipe", exact: true })
    .click();
  await expect(
    page.getByRole("spinbutton", { name: "impact seed" }),
  ).toHaveValue("42");
  await expect(
    page.getByRole("button", { name: "Copy raw impact example", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset impact", exact: true }).click();
  await expect(
    page.getByRole("slider", { name: "Intensity", exact: true }),
  ).toHaveValue("0.5");
  await page.getByRole("spinbutton", { name: "impact seed" }).fill("-1");
  await expect(
    page.getByRole("button", { name: "Copy impact example", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Play impact", exact: true }).click();
  await expect(page.locator(".gallery-mixer > [role=alert]")).toContainText(
    "valid seed",
  );
  expect(
    await page.evaluate(
      () =>
        (globalThis as unknown as { galleryContexts: unknown[] })
          .galleryContexts.length,
    ),
  ).toBe(1);
});

test("keyboard workflow, narrow layout, reduced motion, and route teardown", async ({
  page,
}) => {
  await instrument(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("http://127.0.0.1:3100/sounds/thruster");
  const start = page.getByRole("button", {
    name: "Start thruster",
    exact: true,
  });
  await start.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("thruster-state")).toHaveText(
    "Thruster: running",
  );
  const slider = page.getByRole("slider", { name: "Throttle" });
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await expect(slider).toHaveValue("0.21");
  await page.getByRole("button", { name: "Mute", exact: true }).focus();
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("button", { name: "Mute", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Stop thruster", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("thruster-state")).toHaveText(
    "Thruster: stopped",
  );
  await page
    .getByRole("button", { name: "Reset thruster", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(slider).toHaveValue("0.2");
  await page
    .getByRole("button", { name: "Copy thruster example", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  expect(
    await page.evaluate(
      () => (globalThis as unknown as { copiedExample: string }).copiedExample,
    ),
  ).toContain('"throttle":0.2');
  await page.locator("summary").focus();
  await page.keyboard.press("Enter");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await start.click();
  await page
    .getByRole("link", { name: "Development docs", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          globalThis as unknown as { galleryContexts: AudioContext[] }
        ).galleryContexts.map((c) => c.state),
      ),
    )
    .toEqual(["closed"]);
});

test("documentation routes and links render the shipped development API", async ({
  page,
}) => {
  for (const [slug, title] of [
    ["", "Quick start"],
    ["recipes", "Recipes"],
    ["lifecycle", "Playback and lifecycle"],
    ["parameters", "Parameters"],
    ["buses", "Buses and effects"],
    ["native", "Native interop"],
    ["api", "API reference"],
  ]) {
    await page.goto(`http://127.0.0.1:3100/docs/${slug}`);
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await expect(
      page
        .locator("main")
        .getByText(/unreleased/i)
        .first(),
    ).toBeVisible();
    const targets = await page
      .locator("a[href^='/docs']")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href")!));
    for (const target of new Set(targets))
      expect(
        (await page.request.get(`http://127.0.0.1:3100${target}`)).status(),
      ).toBe(200);
  }
  for (const slug of ["confirmation", "impact", "thruster"])
    expect(
      (await page.request.get(`http://127.0.0.1:3100/sounds/${slug}`)).status(),
    ).toBe(200);
  expect(
    (await page.request.get("http://127.0.0.1:3100/sounds/missing")).status(),
  ).toBe(404);
});

test("raw comparisons match managed dry signals, seeded noise, live smoothing and releases", async ({
  page,
  browser,
}) => {
  await page.goto("http://127.0.0.1:4173");
  await page.addScriptTag({
    path: resolve(
      "node_modules/.cache/audiobits-audio-tests/audio-harness.iife.js",
    ),
  });
  const results = await page.evaluate(async () => {
    const helper = globalThis as unknown as {
      comparisonSignal(
        rate: number,
        kind: "confirmation" | "impact" | "thruster",
        control: number,
        seed: number,
        action?: "natural" | "early" | "live" | "cancel",
      ): Promise<{ difference: number; energy: number; latePeak: number }>;
    };
    const results = [];
    for (const rate of [44100, 48000])
      for (const kind of ["confirmation", "impact", "thruster"] as const) {
        for (const control of [0, 0.5, 1])
          for (const seed of [0, 42, 0xffffffff])
            results.push(
              await helper.comparisonSignal(rate, kind, control, seed),
            );
        for (const action of ["early", "cancel"] as const)
          results.push(
            await helper.comparisonSignal(rate, kind, 0.5, 42, action),
          );
        if (kind === "thruster")
          results.push(
            await helper.comparisonSignal(rate, kind, 0.2, 7, "live"),
          );
      }
    return results;
  });
  for (const result of results) {
    expect(result.difference).toBeLessThan(0.000001);
    expect(result.latePeak).toBe(0);
  }
  console.log(
    `Raw comparison ${browser.browserType().name()} ${browser.version()}: ${results.length} scenarios; max difference ${Math.max(...results.map((r) => r.difference))}`,
  );
});

test("displayed host examples activate from a gesture, stop, and dispose their own contexts", async ({
  page,
}) => {
  await instrument(page);
  await page.goto("http://127.0.0.1:4173");
  await page.addScriptTag({
    path: resolve(
      "node_modules/.cache/audiobits-audio-tests/displayed-examples.iife.js",
    ),
  });
  await page.evaluate(() => {
    const examples = (
      globalThis as unknown as {
        displayedExamples: Record<
          string,
          { play(): Promise<void>; stop(): void; dispose(): Promise<void> }
        >;
      }
    ).displayedExamples;
    for (const [name, example] of Object.entries(examples)) {
      const button = document.createElement("button");
      button.textContent = name;
      button.onclick = () => {
        void example
          .play()
          .then(() => {
            button.dataset.played = "true";
          })
          .catch((error) => {
            button.textContent = `FAIL: ${String(error)}`;
          });
      };
      document.body.append(button);
    }
  });
  for (const name of [
    "confirmationLibrary",
    "confirmationRaw",
    "impactLibrary",
    "impactRaw",
    "thrusterLibrary",
    "thrusterRaw",
  ]) {
    const button = page.getByRole("button", { name, exact: true });
    await button.click();
    await expect(button).toHaveAttribute("data-played", "true");
    await page.evaluate(async (name) => {
      const example = (
        globalThis as unknown as {
          displayedExamples: Record<
            string,
            { stop(): void; dispose(): Promise<void> }
          >;
        }
      ).displayedExamples[name];
      example.stop();
      await example.dispose();
    }, name);
  }
  expect(
    await page.evaluate(() =>
      (
        globalThis as unknown as { galleryContexts: AudioContext[] }
      ).galleryContexts.map((context) => context.state),
    ),
  ).toEqual(Array(6).fill("closed"));
});

test("navigation between sound slugs disposes the previous gallery session", async ({
  page,
}) => {
  await instrument(page);
  await page.goto("http://127.0.0.1:3100/sounds/thruster");
  await page
    .getByRole("button", { name: "Start thruster", exact: true })
    .click();
  await expect(page.getByTestId("thruster-state")).toHaveText(
    "Thruster: running",
  );
  await page.getByRole("link", { name: "All sounds", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          globalThis as unknown as { galleryContexts: AudioContext[] }
        ).galleryContexts.map((context) => context.state),
      ),
    )
    .toEqual(["closed"]);
  await page.getByRole("link", { name: "Impact", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Impact", exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Audio: idle");
});

test("failed gallery activation identifies Retry Play and recovers with a fresh action", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Native = AudioContext;
    let fail = true;
    globalThis.AudioContext = class extends Native {
      resume() {
        if (fail) {
          fail = false;
          return Promise.reject(new Error("Simulated blocked activation"));
        }
        return super.resume();
      }
    };
  });
  await page.goto("http://127.0.0.1:3100/sounds/confirmation");
  const play = page.getByRole("button", {
    name: "Play confirmation",
    exact: true,
  });
  await play.click();
  await expect(page.locator(".gallery-mixer [role=alert]")).toContainText(
    "Retry Play",
  );
  await play.click();
  await expect(page.getByRole("status")).toHaveText("Audio: running");
  await expect(page.locator(".gallery-mixer [role=alert]")).toHaveCount(0);
});

test("all eight demos use parameter metadata and edited controls without allocating audio on load", async ({
  page,
}) => {
  await instrument(page);
  await page.goto("http://127.0.0.1:3100/sounds");
  await expect(page.locator("article.sound-card")).toHaveCount(8);
  await page
    .getByRole("slider", { name: "Brightness", exact: true })
    .fill("0.9");
  await page
    .getByRole("button", {
      name: "Copy glass-notification example",
      exact: true,
    })
    .click();
  expect(
    await page.evaluate(
      () => (globalThis as unknown as { copiedExample: string }).copiedExample,
    ),
  ).toContain('"brightness":0.9');
  expect(
    await page.evaluate(
      () =>
        (globalThis as unknown as { galleryContexts: unknown[] })
          .galleryContexts.length,
    ),
  ).toBe(0);
  await page.locator("#whoosh summary").click();
  const editor = page.getByRole("textbox", { name: "whoosh recipe JSON" });
  const recipe = JSON.parse(await editor.inputValue());
  recipe.parameters.size = { min: -1, max: 2, default: 0.5, mode: "play" };
  recipe.parameters.detail = { min: 10, max: 20, default: 15, mode: "play" };
  await editor.fill(JSON.stringify(recipe));
  await page
    .getByRole("button", { name: "Apply whoosh recipe", exact: true })
    .click();
  const size = page.getByRole("slider", { name: "Size", exact: true });
  await expect(size).toHaveAttribute("min", "-1");
  await expect(size).toHaveAttribute("max", "2");
  await expect(
    page.getByRole("slider", { name: "Detail", exact: true }),
  ).toHaveValue("15");
  await size.fill("1.7");
  await page.getByRole("button", { name: "Play whoosh", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Audio: running");
  await page
    .getByRole("button", { name: "Copy whoosh example", exact: true })
    .click();
  const copied = await page.evaluate(
    () => (globalThis as unknown as { copiedExample: string }).copiedExample,
  );
  expect(copied).toContain('"size":1.7');
  expect(copied).toContain('"detail":15');
  for (const kind of [
    "tactile-click",
    "gentle-rejection",
    "glass-notification",
    "power-up",
  ]) {
    await page
      .getByRole("button", { name: `Play ${kind}`, exact: true })
      .click();
  }
  await expect(page.locator(".gallery-mixer > [role=alert]")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Restore whoosh recipe", exact: true })
    .click();
  await expect(size).toHaveAttribute("min", "0");
  await expect(
    page.getByRole("slider", { name: "Detail", exact: true }),
  ).toHaveCount(0);
});

test("showcase uses native output, bounded seeded variation and simple current code", async ({
  page,
}) => {
  await instrument(page);
  await page.goto("http://127.0.0.1:3100/sounds/thruster");
  const scope = page.getByRole("img", {
    name: "Live output waveform; animation pauses for reduced motion",
  });
  await expect(scope).toHaveAttribute("data-peak", "0");
  await expect(
    page.getByText("Changes this voice while it plays"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Start thruster", exact: true })
    .click();
  await page.getByRole("slider", { name: "Throttle", exact: true }).fill("1");
  await expect
    .poll(async () => Number(await scope.getAttribute("data-peak")))
    .toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(scope).toHaveAttribute("data-peak", "0");
  await page.getByRole("button", { name: "Stop all", exact: true }).click();
  await expect(scope).toHaveAttribute("data-peak", "0");
  await page.goto("http://127.0.0.1:3100/sounds/whoosh");
  await page.getByRole("slider", { name: "Size", exact: true }).fill("0.9");
  await expect(page.getByText("Applies on the next Play")).toBeVisible();
  await page
    .getByRole("button", { name: "Randomize whoosh", exact: true })
    .click();
  const seed = Number(
    await page
      .getByRole("spinbutton", { name: "whoosh seed", exact: true })
      .inputValue(),
  );
  expect(seed).toBeGreaterThanOrEqual(0);
  expect(seed).toBeLessThanOrEqual(0xffffffff);
  await page.locator("#whoosh summary").click();
  await page
    .getByRole("button", { name: "Copy simple whoosh code", exact: true })
    .click();
  let copied = await page.evaluate(
    () => (globalThis as unknown as { copiedExample: string }).copiedExample,
  );
  expect(copied).toContain('import { whoosh } from "audiobits/recipes"');
  expect(copied).toContain('"size":0.9');
  expect(copied).toContain(`seed: ${seed}`);
  await page
    .getByRole("button", { name: "Copy whoosh recipe", exact: true })
    .click();
  copied = await page.evaluate(
    () => (globalThis as unknown as { copiedExample: string }).copiedExample,
  );
  expect(JSON.parse(copied).schemaVersion).toBe(1);
});
