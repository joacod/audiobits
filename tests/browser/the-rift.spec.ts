import { expect, test, type Locator, type Page } from "@playwright/test";
import { instrument, probe } from "./experience-probe";

const stageName = { name: "The Rift stage", exact: true };

async function owned(page: Page) {
  const p = await probe(page);
  return p.sources - p.ended;
}
const peak = async (stage: Locator) =>
  Number(await stage.locator("canvas").getAttribute("data-peak"));

test("tear, persist without input, shape, interrupted seal, collapse, keyboard and navigation clean up @smoke", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await instrument(page, "normal", "the-rift");
  const stage = page.getByRole("group", stageName);
  await expect(stage).toHaveAttribute("data-ready", "true");
  await expect(stage).toHaveAttribute("data-phase", "idle");
  expect((await probe(page)).contexts).toEqual([]);
  await stage.scrollIntoViewIfNeeded();
  const box = (await stage.boundingBox())!;
  const at = (x: number, y: number) =>
    [box.x + box.width * x, box.y + box.height * y] as const;

  // Opening: press and drag tears a vertical fracture; release keeps it open.
  await page.mouse.move(...at(0.5, 0.2));
  await page.mouse.down();
  await page.mouse.move(...at(0.5, 0.75), { steps: 10 });
  await expect(stage).toHaveAttribute("data-phase", "opening");
  await page.mouse.up();
  await expect(stage).toHaveAttribute("data-phase", "active");
  // The field sounds on its own after release.
  await expect.poll(() => peak(stage)).toBeGreaterThan(0);
  const sounding = await owned(page);
  expect(sounding).toBeGreaterThan(0);

  // Pulling away from the tear widens it and leaves it active.
  await page.mouse.move(...at(0.56, 0.47));
  await page.mouse.down();
  await page.mouse.move(...at(0.75, 0.47), { steps: 6 });
  await page.mouse.up();
  await expect(stage).toHaveAttribute("data-phase", "active");

  // Crossing the tear arms the seal; an interrupted gesture never collapses.
  await page.mouse.move(...at(0.6, 0.47));
  await page.mouse.down();
  await page.mouse.move(...at(0.4, 0.47), { steps: 6 });
  await expect(stage).toHaveAttribute("data-sealing", "true");
  await stage.dispatchEvent("pointercancel", { pointerId: 1, isPrimary: true });
  await expect(stage).toHaveAttribute("data-sealing", "false");
  await page.mouse.up();
  await expect(stage).toHaveAttribute("data-phase", "active");

  // A completed seal collapses, implodes and returns to a silent idle.
  await page.mouse.move(...at(0.6, 0.47));
  await page.mouse.down();
  await page.mouse.move(...at(0.4, 0.47), { steps: 6 });
  await expect(stage).toHaveAttribute("data-sealing", "true");
  await page.mouse.up();
  await expect(stage).toHaveAttribute("data-phase", "collapsing");
  await expect(stage).toHaveAttribute("data-phase", "idle", { timeout: 8000 });
  await expect.poll(() => owned(page)).toBe(0);

  // Keyboard: Enter opens, Escape collapses, and it is immediately replayable.
  await stage.press("Enter");
  await expect(stage).toHaveAttribute("data-phase", "active");
  await stage.press("Escape");
  await expect(stage).toHaveAttribute("data-phase", "collapsing");
  await expect(stage).toHaveAttribute("data-phase", "idle", { timeout: 8000 });
  await stage.press("Enter");
  await expect(stage).toHaveAttribute("data-phase", "active");

  // Leaving the route disposes the open fracture and its engine.
  await page
    .getByRole("navigation", { name: "Breadcrumb" })
    .getByRole("link")
    .click();
  await expect
    .poll(async () => {
      const result = await probe(page);
      return {
        connected: result.connected,
        contexts: result.contexts.filter((state) => state !== "closed"),
      };
    })
    .toEqual({ connected: 0, contexts: [] });
});
