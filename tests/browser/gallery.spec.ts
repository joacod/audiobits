import { soundKinds, sounds, type SoundKind } from "../../apps/www/lib/gallery";
import { requireOfflineCheckpoints } from "./offline-capabilities";
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
    Object.assign(globalThis, { galleryContexts: contexts });
  });
}

test("catalog dry signals replay seeded noise, live smoothing and releases", async ({
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
  const results = await page.evaluate(
    async (items) => {
      const helper = globalThis as unknown as {
        catalogSignal(
          rate: number,
          kind: SoundKind,
          control: number,
          seed: number,
          action?: "natural" | "early" | "live" | "cancel",
        ): Promise<{
          difference: number;
          energy: number;
          latePeak: number;
          action: string;
        }>;
      };
      const results = [];
      for (const rate of [44100, 48000])
        for (const { kind, sustained } of items) {
          for (const control of [0, 0.5, 1])
            for (const seed of [0, 42, 0xffffffff])
              results.push(
                await helper.catalogSignal(rate, kind, control, seed),
              );
          for (const action of ["early", "cancel"] as const)
            results.push(
              await helper.catalogSignal(rate, kind, 0.5, 42, action),
            );
          if (sustained)
            results.push(
              await helper.catalogSignal(rate, kind, 0.2, 7, "live"),
            );
        }
      return results;
    },
    soundKinds.map((kind) => ({
      kind,
      sustained: sounds[kind].kind === "sustained",
    })),
  );
  for (const result of results) {
    if (result.action === "cancel") expect(result.energy).toBe(0);
    else expect(result.energy).toBeGreaterThan(0);
    expect(result.difference).toBeLessThan(0.000001);
    expect(result.latePeak).toBe(0);
  }
  console.log(
    `Catalog signal ${browser.browserType().name()} ${browser.version()}: ${results.length} scenarios; max difference ${Math.max(...results.map((r) => r.difference))}`,
  );
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
