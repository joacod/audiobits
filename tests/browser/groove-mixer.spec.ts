import { expect, test } from "@playwright/test";
import { instrument, probe } from "./experience-probe";

// Continuous mixing and copying accepted bus settings are not covered by the
// one-shot workbench or the existing hold-based experience journeys.
test("groove mixes, copies current settings, stops and disposes", async ({
  page,
}) => {
  await instrument(page, "normal", "groove-mixer");
  await expect(
    page.getByRole("button", { name: "Play groove", exact: true }),
  ).toBeVisible();
  expect((await probe(page)).contexts).toEqual([]);
  await page.getByRole("button", { name: "Play groove", exact: true }).click();
  const output = page.locator(".groove-output canvas");
  await output.scrollIntoViewIfNeeded();
  await expect
    .poll(async () => Number(await output.getAttribute("data-peak")))
    .toBeGreaterThan(0);
  await page.getByRole("slider", { name: "Bass" }).fill("0.73");
  await page.getByRole("button", { name: "Mute bass", exact: true }).click();
  await page.getByRole("button", { name: "Copy groove-mixer code" }).click();
  const source = await page.evaluate(
    () => (globalThis as unknown as { copiedSource: string }).copiedSource,
  );
  expect(source).toContain(
    'groove.setMix("bass", {"level":0.73,"muted":true});',
  );
  await page.getByRole("button", { name: "Unmute bass", exact: true }).click();
  await expect(page.getByRole("slider", { name: "Bass" })).toHaveValue("0.73");
  await page.getByRole("button", { name: "Mute master", exact: true }).click();
  await expect
    .poll(async () => Number(await output.getAttribute("data-peak")))
    .toBeLessThan(0.0001);
  await page
    .getByRole("button", { name: "Unmute master", exact: true })
    .click();
  await expect
    .poll(async () => Number(await output.getAttribute("data-peak")))
    .toBeGreaterThan(0.001);
  await page.getByRole("button", { name: "Stop groove", exact: true }).click();
  await expect.poll(async () => (await probe(page)).ownedSources).toBe(0);
  await page.getByRole("button", { name: "Play groove", exact: true }).click();
  await output.scrollIntoViewIfNeeded();
  await expect
    .poll(async () => Number(await output.getAttribute("data-peak")))
    .toBeGreaterThan(0.001);
  await page
    .getByRole("navigation", { name: "Breadcrumb" })
    .getByRole("link", { name: "Catalog" })
    .click();
  await expect
    .poll(async () => (await probe(page)).contexts)
    .toEqual(["closed"]);
});

test("Stop invalidates pending groove activation", async ({ page }) => {
  await instrument(page, "held", "groove-mixer");
  await page.getByRole("button", { name: "Play groove", exact: true }).click();
  await page.getByRole("button", { name: "Stop groove", exact: true }).click();
  await page.evaluate(() =>
    (
      globalThis as unknown as { thrusterProbe: { releaseActivation(): void } }
    ).thrusterProbe.releaseActivation(),
  );
  await expect(
    page.getByRole("button", { name: "Play groove", exact: true }),
  ).toBeVisible();
  expect((await probe(page)).sources).toBe(0);
});
