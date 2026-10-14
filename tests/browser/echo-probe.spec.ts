import { expect, test } from "@playwright/test";
import { resolve } from "node:path";
import { instrument, probe } from "./experience-probe";

const harness = resolve(
  "node_modules/.cache/audiobits-audio-tests/audio-harness.iife.js",
);
const stageName = { name: "Echo Probe stage", exact: true };

test("acoustic bench separates surface, strength, direction and finite decay in native Chromium", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:3100");
  await page.addScriptTag({ path: harness });
  const result = await page.evaluate(async () => {
    const h = globalThis as unknown as {
      probeSignal(
        kind: string,
        surface?: number,
        pan?: number,
        gainDb?: number,
        seed?: number,
        count?: number,
        rate?: number,
      ): Promise<{
        peak: number;
        energy: number;
        left: number;
        right: number;
        brightness: number;
        tail: number;
        onset: number;
      }>;
    };
    return {
      pulse: await h.probeSignal("emission"),
      replay: await h.probeSignal("emission"),
      variation: await h.probeSignal("emission", 0.5, 0, 0, 99),
      dark: await h.probeSignal("reflection", 0),
      bright: await h.probeSignal("reflection", 1),
      weak: await h.probeSignal("reflection", 0.7, 0, -24),
      strong: await h.probeSignal("reflection", 0.7),
      left: await h.probeSignal("reflection", 0.7, -0.9),
      right: await h.probeSignal("reflection", 0.7, 0.9),
      diffuse: await h.probeSignal("diffusion"),
      eight: await h.probeSignal("emission", 0.5, 0, 0, 42, 8),
      lowRate: await h.probeSignal("reflection", 1, 0, 0, 42, 1, 44100),
    };
  });
  // Native oscillator/filter rounding can vary between offline contexts.
  // The compiler's exact seeded determinism is checked separately in unit tests.
  for (const key of ["peak", "energy", "brightness"] as const)
    expect(result.pulse[key]).toBeCloseTo(result.replay[key], 7);
  expect(result.variation.energy).not.toBe(result.pulse.energy);
  for (const value of Object.values(result)) {
    expect(value.energy).toBeGreaterThan(0);
    expect(value.tail).toBe(0);
    expect(value.onset).toBeGreaterThanOrEqual(0.02);
    expect(value.onset).toBeLessThan(0.021);
    expect(value.peak).toBeLessThan(0.5);
  }
  expect(result.bright.brightness).toBeGreaterThan(result.dark.brightness * 10);
  expect(result.strong.energy).toBeGreaterThan(result.weak.energy * 200);
  expect(result.left.left).toBeGreaterThan(result.left.right * 100);
  expect(result.right.right).toBeGreaterThan(result.right.left * 100);
  expect(result.left.energy).toBeCloseTo(result.right.energy, 5);
});

test("1300 scheduled voices cancel without retained ownership or touching shared sound", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:3100");
  await page.addScriptTag({ path: harness });
  await page.evaluate(() => {
    const h = globalThis as unknown as {
      probeResources(): Promise<unknown>;
      resources: Promise<unknown>;
    };
    const button = document.createElement("button");
    button.textContent = "Run resource bench";
    button.onclick = () => {
      h.resources = h.probeResources();
    };
    document.body.append(button);
  });
  await page.getByRole("button", { name: "Run resource bench" }).click();
  const result = await page.evaluate(
    () => (globalThis as unknown as { resources: Promise<unknown> }).resources,
  );
  expect(result).toEqual({
    maximum: 14,
    emissions: 100,
    counts: { active: 0, retiring: 0 },
    state: "disposed",
  });
});

test("tap, repeated emission, measured output, Escape, interruption and navigation clean up", async ({
  page,
}) => {
  await instrument(page, "normal", "echo-probe");
  const stage = page.getByRole("group", stageName);
  await expect(stage).toHaveAttribute("data-ready", "true");
  expect((await probe(page)).contexts).toEqual([]);
  await stage.click({ position: { x: 100, y: 160 } });
  await expect(stage).toHaveAttribute("data-state", "running");
  await expect
    .poll(async () =>
      Number(await stage.locator("canvas").getAttribute("data-peak")),
    )
    .toBeGreaterThan(0);
  await stage.press("Escape");
  await expect(stage).toHaveAttribute("data-state", "stopped");
  await expect(stage.locator("canvas")).toHaveAttribute("data-peak", "0");
  await expect
    .poll(async () => {
      const p = await probe(page);
      return p.sources - p.ended;
    })
    .toBe(0);
  const restingConnections = (await probe(page)).connected;
  for (let index = 0; index < 3; index++) {
    await stage.press("Enter");
    await expect(stage).toHaveAttribute("data-state", "running");
    await expect
      .poll(async () => {
        const p = await probe(page);
        return p.sources - p.ended;
      })
      .toBe(0);
    await expect(stage).toHaveAttribute("data-state", "stopped");
  }
  await stage.press("Enter");
  await expect(stage).toHaveAttribute("data-state", "running");
  await page.evaluate(async () => {
    const h = globalThis as unknown as {
      thrusterProbe: { contexts: AudioContext[] };
    };
    await h.thrusterProbe.contexts[0].suspend();
  });
  await expect(stage).toHaveAttribute("data-state", "stopped");
  // Suspended native sources deliver ended events only once rendering resumes.
  // Managed graphs must already be disconnected, with no future return audible.
  expect((await probe(page)).contexts).toEqual(["suspended"]);
  expect((await probe(page)).connected).toBe(restingConnections);
  await stage.press("Enter");
  await expect(stage).toHaveAttribute("data-state", "running");
  await expect
    .poll(async () => {
      const p = await probe(page);
      return p.sources - p.ended;
    })
    .toBe(0);
  await page
    .getByRole("navigation", { name: "Breadcrumb" })
    .getByRole("link")
    .click();
  await expect
    .poll(async () => (await probe(page)).contexts)
    .toEqual(["closed"]);
  expect((await probe(page)).connected).toBe(0);
});

for (const mode of ["held", "failed"] as const)
  test(`activation ${mode} supports cancellation and a fresh gesture`, async ({
    page,
  }) => {
    await instrument(page, mode, "echo-probe");
    const stage = page.getByRole("group", stageName);
    await expect(stage).toHaveAttribute("data-ready", "true");
    await stage.press("Enter");
    if (mode === "held") {
      await expect(stage).toHaveAttribute("data-state", "starting");
      await stage.press("Escape");
      await page.evaluate(() =>
        (
          globalThis as unknown as {
            thrusterProbe: { releaseActivation(): void };
          }
        ).thrusterProbe.releaseActivation(),
      );
      await expect(stage).toHaveAttribute("data-state", "stopped");
      expect((await probe(page)).sources).toBe(0);
    } else {
      await expect(page.locator(".echo-probe-help [role=alert]")).toContainText(
        "Tap again to retry",
      );
      await expect(stage).toHaveAttribute("data-state", "stopped");
    }
    await stage.press("Enter");
    await expect(stage).toHaveAttribute("data-state", "running");
    await expect(page.locator(".echo-probe-help [role=alert]")).toHaveCount(0);
    await stage.press("Escape");
    await expect
      .poll(async () => {
        const p = await probe(page);
        return p.sources - p.ended;
      })
      .toBe(0);
  });

for (const width of [1440, 390])
  test(`stage fits ${width}px with touch, reduced motion and installed-source usage`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await instrument(page, "normal", "echo-probe");
    const stage = page.getByRole("group", stageName);
    await expect(stage).toHaveAttribute("data-ready", "true");
    await stage.dispatchEvent("pointerdown", {
      pointerType: "touch",
      isPrimary: true,
      button: 0,
      clientX: 150,
      clientY: 300,
    });
    await expect(stage).toHaveAttribute("data-state", "running");
    await stage.dispatchEvent("pointercancel");
    await expect(stage).toHaveAttribute("data-state", "stopped");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("button", { name: "Copy echo-probe code", exact: true }),
    ).toBeEnabled();
    await page
      .getByRole("button", { name: "Copy echo-probe code", exact: true })
      .click();
    expect(
      await page.evaluate(
        () => (globalThis as unknown as { copiedSource: string }).copiedSource,
      ),
    ).toContain("./sounds/experiences/echo-probe/controller");
  });
