import { dragThruster } from "./experience-probe";
import { requireOfflineCheckpoints } from "./offline-capabilities";
import { expect, test } from "@playwright/test";
import manifest from "../../packages/audiobits/package.json" with { type: "json" };
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

test("keyboard workflow, narrow layout, reduced motion, and route teardown", async ({
  page,
}) => {
  await instrument(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("http://127.0.0.1:3100/catalog/thruster");
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
  await page
    .getByRole("button", { name: "Stop thruster", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("thruster-state")).toHaveText(
    "Thruster: stopped",
  );
  await page.locator(".recipe-tools summary").click();
  await page
    .getByRole("button", { name: "Restore thruster recipe", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(slider).toHaveValue("0.2");
  await page
    .getByRole("button", { name: "Copy thruster code", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  expect(
    await page.evaluate(
      () => (globalThis as unknown as { copiedExample: string }).copiedExample,
    ),
  ).toContain('"throttle":0.2');
  await page.locator(".recipe-tools summary").focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Edit recipe" }),
  ).not.toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Edit recipe" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await start.click();
  await page.getByRole("link", { name: "Docs", exact: true }).click();
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

test("documentation routes and links render the shipped package API", async ({
  page,
}) => {
  for (const [slug, title] of [
    ["", "Introduction and quick start"],
    ["recipes", "Recipes"],
    ["lifecycle", "Playback and lifecycle"],
    ["parameters", "Parameters"],
    ["buses", "Buses and routing"],
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
        .getByText(`AudioBits API · ${manifest.version} · Available on npm.`, {
          exact: true,
        })
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
      (
        await page.request.get(`http://127.0.0.1:3100/catalog/${slug}`)
      ).status(),
    ).toBe(200);
  expect(
    (await page.request.get("http://127.0.0.1:3100/catalog/missing")).status(),
  ).toBe(404);
});

test("raw comparisons match managed dry signals, seeded noise, live smoothing and releases", async ({
  page,
  browser,
}) => {
  await page.goto("http://127.0.0.1:4173");
  await requireOfflineCheckpoints(page);
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
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          globalThis as unknown as { galleryContexts: AudioContext[] }
        ).galleryContexts.map((context) => context.state),
      ),
    )
    .toEqual(Array(6).fill("closed"));
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
  await page.goto("http://127.0.0.1:3100/catalog/confirmation");
  const play = page.getByRole("button", {
    name: "Play confirmation",
    exact: true,
  });
  await play.click();
  await expect(page.locator(".catalog-transport [role=alert]")).toContainText(
    "Retry Play",
  );
  await play.click();
  await expect(
    page
      .getByRole("group", { name: "Playback", exact: true })
      .getByRole("status"),
  ).toHaveText("Audio: running");
  await expect(page.locator(".catalog-transport [role=alert]")).toHaveCount(0);
});

test("workbench controls stay disabled until hydration owns them", async ({
  page,
}) => {
  await instrument(page);
  let hydrate!: () => void;
  const hydration = new Promise<void>((resolve) => {
    hydrate = resolve;
  });
  await page.route("**/_next/static/**/*.js", async (route) => {
    await hydration;
    await route.continue();
  });
  const brightness = page.getByRole("slider", {
    name: "Brightness",
    exact: true,
  });
  try {
    await page.goto("http://127.0.0.1:3100/catalog/glass-notification", {
      waitUntil: "commit",
    });
    await expect(brightness).toBeDisabled();
    await expect(
      page.getByRole("slider", { name: "Effects volume" }),
    ).toHaveCount(0);
  } finally {
    hydrate();
  }
  await brightness.fill("0.9");
  await expect(page.locator(".catalog-parameters label").first()).toContainText(
    "Brightness: 0.90",
  );
  expect(
    await page.evaluate(
      () =>
        (globalThis as unknown as { galleryContexts: unknown[] })
          .galleryContexts.length,
    ),
  ).toBe(0);
  await page.goto("http://127.0.0.1:3100/catalog");
  expect(
    await page.evaluate(
      () =>
        (globalThis as unknown as { galleryContexts: unknown[] })
          .galleryContexts.length,
    ),
  ).toBe(0);
  for (const kind of [
    "tactile click",
    "gentle rejection",
    "glass notification",
    "power-up",
  ]) {
    await page
      .getByRole("button", { name: `Play ${kind}`, exact: true })
      .click();
  }
  await expect(page.locator(".gallery-mixer > [role=alert]")).toHaveCount(0);
});

test("homepage thruster uses one engine, reports output and disposes on navigation", async ({
  page,
}) => {
  await instrument(page);
  await page.setViewportSize({ width: 375, height: 844 });
  await page.goto("http://127.0.0.1:3100");
  const bounds = await page.locator(".flight-pad").boundingBox();
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(844);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(
      () =>
        (globalThis as unknown as { galleryContexts: AudioContext[] })
          .galleryContexts.length,
    ),
  ).toBe(0);
  await expect(page.locator(".recipe-tools")).toHaveCount(0);
  const previews = page.locator(".landing-sound-entry");
  await expect(previews).toHaveCount(3);
  for (const kind of ["impact", "glass-notification", "whoosh"]) {
    await expect(
      page.locator(`.landing-sound-entry[href="/catalog/${kind}"]`),
    ).toHaveCount(1);
  }
  await dragThruster(page);
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Thruster: running",
  );
  await expect
    .poll(() =>
      page
        .locator(".thruster-signal canvas")
        .getAttribute("data-peak")
        .then(Number),
    )
    .toBeGreaterThan(0);
  await page.mouse.up();
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Thruster: stopped",
  );
  await expect(page.locator(".thruster-signal canvas")).toHaveAttribute(
    "data-peak",
    "0",
  );
  expect(
    await page.evaluate(
      () =>
        (globalThis as unknown as { galleryContexts: AudioContext[] })
          .galleryContexts.length,
    ),
  ).toBe(1);
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Docs" })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Introduction and quick start",
      exact: true,
    }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (globalThis as unknown as { galleryContexts: AudioContext[] })
            .galleryContexts[0].state,
      ),
    )
    .toBe("closed");
});

for (const width of [375, 430]) {
  test(`workbench inspector and playback fit ${width}px without covering controls`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("http://127.0.0.1:3100/catalog/impact");
    await expect(
      page.getByRole("button", { name: "Copy impact code" }),
    ).toBeVisible();
    await expect(page.getByRole("tab")).toHaveCount(0);
    await page.locator(".recipe-tools summary").click();
    for (const panel of [".catalog-usage", ".recipe-tools"]) {
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(
        await page
          .locator(panel)
          .evaluate(
            (element) => element.getBoundingClientRect().right <= innerWidth,
          ),
      ).toBe(true);
    }
    expect(
      await page
        .locator(".catalog-transport")
        .evaluate((node) => getComputedStyle(node).position),
    ).toBe("static");
    await page
      .getByRole("button", { name: "Edit recipe", exact: true })
      .click();
    const apply = page.getByRole("button", {
      name: "Apply impact recipe",
      exact: true,
    });
    await apply.scrollIntoViewIfNeeded();
    expect(
      await apply.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return element.contains(
          document.elementFromPoint(
            rect.x + rect.width / 2,
            rect.y + rect.height / 2,
          ),
        );
      }),
    ).toBe(true);
  });
}
