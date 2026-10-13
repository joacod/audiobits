import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { instrument, probe } from "./experience-probe";
import { requireOfflineCheckpoints } from "./offline-capabilities";

const stage = (page: import("@playwright/test").Page) =>
  page.getByRole("group", { name: "Plasma blade stage", exact: true });

test("ignition, held pointer swings and swept target hits, release retraction and teardown", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (cause) => errors.push(cause.message));
  await instrument(page, "normal", "plasma-blade");
  await expect(
    page.getByRole("button", { name: "Ignite", exact: true }),
  ).toBeEnabled();
  expect((await probe(page)).contexts).toEqual([]);
  const pad = stage(page);
  await pad.scrollIntoViewIfNeeded();
  const box = (await pad.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.8);
  await page.mouse.down();
  await expect(pad).toHaveAttribute("data-state", "running");
  await expect(pad).toHaveAttribute("data-extension", "1.000");
  await expect
    .poll(async () => Number(await pad.getAttribute("data-peak")))
    .toBeGreaterThan(0);
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.7, {
    steps: 8,
  });
  await expect
    .poll(async () => Number(await pad.getAttribute("data-motion")))
    .toBeGreaterThan(0.1);
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.7, {
    steps: 8,
  });
  await expect
    .poll(async () => Number(await pad.getAttribute("data-hits")))
    .toBeGreaterThan(0);
  await page.mouse.up();
  await expect(pad).toHaveAttribute("data-state", "stopped");
  await expect(pad).toHaveAttribute("data-extension", "0.000");
  await expect
    .poll(async () => {
      const p = await probe(page);
      return p.sources === p.ended;
    })
    .toBe(true);
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.6);
  await expect(pad).toHaveAttribute("data-state", "stopped");
  await expect(pad).toHaveAttribute("data-extension", "0.000");
  await page.getByRole("button", { name: "Ignite", exact: true }).click();
  await expect(pad).toHaveAttribute("data-state", "running");
  await page.getByRole("button", { name: "Mute", exact: true }).click();
  await expect
    .poll(async () => Number(await pad.getAttribute("data-peak")))
    .toBe(0);
  await page.getByRole("button", { name: "Unmute", exact: true }).click();
  await expect
    .poll(async () => Number(await pad.getAttribute("data-peak")))
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "Retract", exact: true }).click();
  await expect(pad).toHaveAttribute("data-state", "stopped");
  await expect(pad).toHaveAttribute("data-extension", "0.000");
  for (let i = 0; i < 5; i++) {
    await page.getByRole("button", { name: "Ignite", exact: true }).click();
    await expect(pad).toHaveAttribute("data-state", "running");
    expect(
      (await probe(page)).sources - (await probe(page)).ended,
    ).toBeLessThanOrEqual(26);
    await page.getByRole("button", { name: "Stop all", exact: true }).click();
  }
  await expect
    .poll(async () => {
      const p = await probe(page);
      return p.sources === p.ended;
    })
    .toBe(true);
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Catalog", exact: true })
    .click();
  await expect
    .poll(async () => (await probe(page)).contexts)
    .toEqual(["closed"]);
  expect((await probe(page)).connected).toBe(0);
  expect(errors).toEqual([]);
});

for (const mode of ["held", "failed"] as const)
  test(`${mode} activation remains cancelled or exposes retry`, async ({
    page,
  }) => {
    await instrument(page, mode, "plasma-blade");
    const pad = stage(page);
    await expect(
      page.getByRole("button", { name: "Ignite", exact: true }),
    ).toBeEnabled();
    if (mode === "held") {
      await pad.scrollIntoViewIfNeeded();
      const box = (await pad.boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.8);
      await page.mouse.down();
      await expect(pad).toHaveAttribute("data-state", "starting");
      await page.mouse.up();
      await expect(pad).toHaveAttribute("data-state", "stopped");
      await page.evaluate(() =>
        (
          globalThis as unknown as {
            thrusterProbe: { releaseActivation(): void };
          }
        ).thrusterProbe.releaseActivation(),
      );
      await expect
        .poll(async () => (await probe(page)).contexts)
        .toEqual(["running"]);
      await expect(pad).toHaveAttribute("data-state", "stopped");
      await expect(pad).toHaveAttribute("data-extension", "0.000");
    } else {
      await page.getByRole("button", { name: "Ignite", exact: true }).click();
      await expect(page.locator(".plasma-controls [role=alert]")).toContainText(
        "Tap Ignite to retry",
      );
    }
    expect((await probe(page)).sources).toBe(0);
    await page.getByRole("button", { name: "Ignite", exact: true }).click();
    await expect(pad).toHaveAttribute("data-state", "running");
    await expect(page.locator(".plasma-controls [role=alert]")).toHaveCount(0);
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        value: true,
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(pad).toHaveAttribute("data-state", "stopped");
    await expect
      .poll(async () => (await probe(page)).contexts)
      .toEqual(["suspended"]);
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        value: false,
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(pad).toHaveAttribute("data-state", "stopped");
    await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
    await expect
      .poll(async () => (await probe(page)).contexts)
      .toEqual(["closed"]);
    expect((await probe(page)).connected).toBe(0);
  });

test("keyboard alternatives, touch release and cancellation, reduced motion, source fidelity and mobile layout", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await instrument(page, "normal", "plasma-blade");
  await expect(
    page.getByRole("button", { name: "Ignite", exact: true }),
  ).toBeEnabled();
  const pad = stage(page);
  await pad.focus();
  await page.keyboard.press("Enter");
  await expect(pad).toHaveAttribute("data-state", "running");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Space");
  await expect
    .poll(async () => Number(await pad.getAttribute("data-hits")))
    .toBeGreaterThan(0);
  await expect(pad).toHaveAttribute("data-reduced-motion", "true");
  await page.keyboard.press("Escape");
  await expect(pad).toHaveAttribute("data-state", "stopped");
  await page.getByRole("tab", { name: "Complete interaction" }).click();
  const interaction = page.getByRole("tabpanel", {
    name: "Complete interaction",
  });
  for (const name of [
    "recipe.ts",
    "motion.ts",
    "controller.ts",
    "host.ts",
    "stage.ts",
    "index.html",
  ]) {
    await interaction
      .getByRole("button", { name: `Copy ${name}`, exact: true })
      .click();
    expect(
      await page.evaluate(
        () => (globalThis as unknown as { copiedSource: string }).copiedSource,
      ),
    ).toBe(readFileSync(`catalog/experiences/plasma-blade/${name}`, "utf8"));
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await pad.scrollIntoViewIfNeeded();
  const box = (await pad.boundingBox())!;
  const touch = await page.context().newCDPSession(page);
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height * 0.8 }],
  });
  await expect(pad).toHaveAttribute("data-state", "running");
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: box.x + box.width * 0.2, y: box.y + box.height * 0.7 }],
  });
  await expect
    .poll(async () => Number(await pad.getAttribute("data-motion")))
    .toBeGreaterThan(0);
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(pad).toHaveAttribute("data-state", "stopped");
  await expect(pad).toHaveAttribute("data-extension", "0.000");
  await expect
    .poll(async () => {
      const p = await probe(page);
      return p.sources === p.ended;
    })
    .toBe(true);
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height * 0.8 }],
  });
  await expect(pad).toHaveAttribute("data-state", "running");
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
  await expect(pad).toHaveAttribute("data-state", "stopped");
  await expect
    .poll(async () => {
      const p = await probe(page);
      return p.sources === p.ended;
    })
    .toBe(true);
});

test("Chromium native signal: five timbres, control extrema, rapid ramps and eight-voice headroom", async ({
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
    const h = globalThis as unknown as {
      plasmaSignal(
        name: string,
        value: number,
        count?: number,
        update?: boolean,
        rate?: number,
        sweep?: number,
      ): Promise<{
        peak: number;
        energy: number;
        delta: number;
        tail: number;
        onset: number;
        finished: number;
        brightness: number;
        humFrequency: number;
      }>;
    };
    const singles = [];
    for (const rate of [44100, 48000])
      for (const name of [
        "plasmaBlade",
        "bladeIgnition",
        "bladeSwing",
        "bladeClash",
        "bladeRetraction",
      ])
        for (const value of [0, 0.5, 1])
          singles.push(await h.plasmaSignal(name, value, 1, false, rate));
    return {
      singles,
      moving: await h.plasmaSignal("plasmaBlade", 0.2, 1, true),
      directions: await Promise.all(
        [-1, 0, 1].map((sweep) =>
          h.plasmaSignal("plasmaBlade", 0.8, 1, false, 48000, sweep),
        ),
      ),
      stacks: await Promise.all(
        [
          "plasmaBlade",
          "bladeIgnition",
          "bladeSwing",
          "bladeClash",
          "bladeRetraction",
        ].map((name) => h.plasmaSignal(name, 1, 8)),
      ),
    };
  });
  for (const s of results.singles) {
    expect(s.peak).toBeLessThan(0.5);
    expect(s.energy).toBeGreaterThan(0);
    expect(s.onset).toBe(0);
    expect(s.tail).toBe(0);
    expect(s.finished).toBe(1);
  }
  expect(results.moving.delta).toBeLessThan(0.04);
  expect(results.moving.tail).toBe(0);
  const [returning, idlePitch, forward] = results.directions;
  expect(returning.humFrequency).toBeLessThan(idlePitch.humFrequency - 10);
  expect(forward.humFrequency).toBeGreaterThan(idlePitch.humFrequency + 10);
  for (const stack of results.stacks) {
    expect(stack.peak).toBeLessThan(1);
    expect(stack.finished).toBe(8);
  }
  for (const offset of [0, 15]) {
    expect(results.singles[offset + 2].energy).toBeGreaterThan(
      results.singles[offset].energy * 1.5,
    );
    expect(results.singles[offset + 2].brightness).toBeGreaterThan(
      results.singles[offset].brightness,
    );
  }
});
