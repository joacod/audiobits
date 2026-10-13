import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

import { instrument, probe, dragThruster } from "./experience-probe";

test("idle showcase stays silent and only gestures start the thruster", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (cause) => errors.push(cause.message));
  await instrument(page);
  await expect(page.locator(".flight-controls").getByRole("button")).toHaveText(
    ["Play impact"],
  );
  await expect(page.getByRole("slider")).toHaveCount(0);
  expect((await probe(page)).contexts).toEqual([]);
  await dragThruster(page);
  await expect(page.locator(".flight-state")).toHaveText("Thruster: running");
  await page.mouse.up();
  await expect(page.locator(".flight-state")).toHaveText("Thruster: stopped");
  expect(errors).toEqual([]);
});

test("showcase pointer, impact, release and navigation own their lifecycle", async ({
  page,
}) => {
  await instrument(page);
  expect((await probe(page)).contexts).toEqual([]);
  await dragThruster(page);
  await expect(page.locator(".flight-state")).toHaveText("Thruster: running");
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
  await expect(page.locator(".flight-craft")).not.toHaveAttribute(
    "style",
    /left: 50%/,
  );
  await expect
    .poll(async () =>
      Number(
        await page
          .locator(".thruster-ribbons canvas")
          .getAttribute("data-peak"),
      ),
    )
    .toBeGreaterThan(0);
  await expect
    .poll(async () =>
      Number(
        await page.locator(".output-scope canvas").getAttribute("data-peak"),
      ),
    )
    .toBeGreaterThan(0);
  await page.mouse.up();
  await expect(page.locator(".flight-state")).toHaveText("Thruster: stopped");
  await expect.poll(async () => (await probe(page)).ended).toBe(3);
  await page.getByRole("button", { name: "Play impact" }).click();
  expect((await probe(page)).sources).toBe(5);
  await expect
    .poll(async () => {
      const p = await probe(page);
      return p.ended === p.sources;
    })
    .toBe(true);
  for (let i = 0; i < 4; i++) {
    await dragThruster(page);
    await expect(page.locator(".flight-state")).toHaveText("Thruster: running");
    const p = await probe(page);
    expect(p.sources - p.ended).toBeLessThanOrEqual(9);
    await page.mouse.up();
  }
  await dragThruster(page);
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Catalog", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("http://127.0.0.1:3100/catalog");
  await expect
    .poll(async () => (await probe(page)).contexts)
    .toEqual(["closed"]);
  await expect.poll(async () => (await probe(page)).connected).toBe(0);
  await page.getByRole("link", { name: "Impact", exact: true }).click();
  await page.getByRole("button", { name: "Play impact", exact: true }).click();
  await expect
    .poll(async () => (await probe(page)).contexts)
    .toEqual(["closed", "running"]);
});

test("activation failure recovers with a fresh gesture", async ({ page }) => {
  await instrument(page, "failed");
  const pad = page.locator(".flight-pad");
  await expect(pad.locator(".thruster-ribbons")).toHaveAttribute(
    "data-renderer",
    /webgl|canvas|unavailable/,
  );
  const box = (await pad.boundingBox())!;
  await page.mouse.move(box.x + 40, box.y + 80);
  await page.mouse.down();
  await expect(page.locator(".flight-controls [role=alert]")).toContainText(
    "Drag again to retry",
  );
  expect((await probe(page)).sources).toBe(0);
  await page.mouse.up();
  await dragThruster(page);
  await expect(page.locator(".flight-state")).toHaveText("Thruster: running");
  await expect(page.locator(".flight-controls [role=alert]")).toHaveCount(0);
});

test("cancelled activation and visibility cleanup require a fresh gesture", async ({
  page,
}) => {
  await instrument(page, "held");
  await page.mouse.up();
  await dragThruster(page);
  await expect(page.locator(".flight-state")).toHaveText("Thruster: starting");
  await page.mouse.up();
  await page.evaluate(() =>
    (
      globalThis as unknown as { thrusterProbe: Probe }
    ).thrusterProbe.releaseActivation(),
  );
  await expect
    .poll(async () => (await probe(page)).contexts)
    .toEqual(["running"]);
  expect((await probe(page)).sources).toBe(0);
  await page.mouse.up();
  await dragThruster(page);
  await expect(page.locator(".flight-state")).toHaveText("Thruster: running");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator(".flight-state")).toHaveText("Thruster: stopped");
  await expect
    .poll(async () => (await probe(page)).contexts)
    .toEqual(["suspended"]);
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  await expect
    .poll(async () => (await probe(page)).contexts)
    .toEqual(["closed"]);
});

test("copy actions return every complete canonical source file and report clipboard denial", async ({
  page,
}) => {
  await instrument(page);
  const interaction = page.getByRole("tabpanel", {
    name: "Complete interaction",
  });
  const soundPanel = page.getByRole("tabpanel", {
    name: "Sound only",
    exact: true,
  });
  const copyBox = (await soundPanel
    .getByRole("button", { name: "Copy recipe.ts", exact: true })
    .boundingBox())!;
  const codeBox = (await soundPanel.locator("pre").boundingBox())!;
  expect(codeBox.y - copyBox.y - copyBox.height).toBeGreaterThanOrEqual(12);
  await page.getByRole("tab", { name: "Complete interaction" }).click();
  await expect(interaction).toBeVisible();
  const files = [
    "recipe.ts",
    "pointer.ts",
    "host.ts",
    "index.html",
    "../../recipes/impact/recipe.ts",
  ];
  await expect(interaction.getByRole("button", { name: /^Copy / })).toHaveCount(
    files.length,
  );
  for (const name of files) {
    await interaction
      .getByRole("button", { name: `Copy ${name}`, exact: true })
      .click();
    const copied = await page.evaluate(
      () => (globalThis as unknown as { copiedSource: string }).copiedSource,
    );
    expect(copied).toBe(
      readFileSync(`catalog/experiences/reactive-thruster/${name}`, "utf8"),
    );
  }
  await page.evaluate(() => {
    navigator.clipboard.writeText = async () => {
      throw new Error("denied");
    };
  });
  await interaction
    .getByRole("button", { name: "Copy host.ts", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Copy unavailable" }),
  ).toBeVisible();
});

test("discovery links, narrow touch input and reduced motion remain usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await instrument(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.getByRole("button", { name: "Stop all" })).toHaveCount(0);
  const pad = page.locator(".flight-pad");
  const box = (await pad.boundingBox())!;
  const touch = await page.context().newCDPSession(page);
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: box.x + 70, y: box.y + 80 }],
  });
  await expect(page.locator(".flight-state")).toHaveText("Thruster: running");
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: box.x + 170, y: box.y + 150 }],
  });
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(page.locator(".flight-state")).toHaveText("Thruster: stopped");
  await expect(page.locator(".thruster-ribbons canvas")).toHaveAttribute(
    "data-peak",
    "0",
  );
  await expect(page.locator(".thruster-ribbons")).toHaveAttribute(
    "data-renderer",
    "canvas",
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => {
    document.documentElement.style.removeProperty("font-size");
  });
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Catalog", exact: true })
    .click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/catalog");
  await expect(
    page.getByRole("link", { name: "Open reactive thruster", exact: true }),
  ).toBeVisible();
  await page.goto("http://127.0.0.1:3100");
  await expect(
    page.getByRole("link", { name: "Open thruster source", exact: true }),
  ).toHaveAttribute("href", "/catalog/reactive-thruster");
});
