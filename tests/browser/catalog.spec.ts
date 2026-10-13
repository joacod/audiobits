import {
  dragThruster,
  instrument as instrumentExperience,
  probe,
} from "./experience-probe";
import { expect, test } from "@playwright/test";
import { catalogEntries, catalogGroups } from "../../apps/www/lib/catalog";

const home = "http://127.0.0.1:3100";
const catalog = `${home}/catalog`;

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
    Object.assign(globalThis, { catalogContexts: contexts });
  });
}

function contexts(page: import("@playwright/test").Page) {
  return page.evaluate(() =>
    (
      globalThis as unknown as { catalogContexts: AudioContext[] }
    ).catalogContexts.map((context) => context.state),
  );
}

test("catalog lists both groups once and links to the current pages", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(catalog);
  await expect(page.locator("h1")).toHaveText("Catalog");
  await expect(
    page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", {
        name: "Catalog",
        exact: true,
      }),
  ).toHaveAttribute("aria-current", "page");
  const index = page.getByRole("navigation", { name: "Catalog" });
  await expect(index.getByRole("heading")).toHaveText(
    catalogGroups.map((group) => group.title),
  );
  await expect(index.getByRole("link")).toHaveText(
    catalogEntries.map((entry) => entry.title),
  );
  await expect(
    index.getByRole("link", { name: "Energy charge", exact: true }),
  ).toHaveAttribute("aria-current", "location");
  const ids = await page
    .locator("[data-catalog-entry]")
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-catalog-entry")),
    );
  expect(ids).toEqual(catalogEntries.map((entry) => entry.slug));
  for (const entry of catalogEntries) {
    expect(await page.locator(`a[href="${entry.href}"]`).count()).toBe(2);
  }
  await expect(page.locator("article.sound-card, textarea")).toHaveCount(0);
  await expect(page.getByRole("spinbutton")).toHaveCount(0);
  await expect(page.locator(".catalog-experience button")).toHaveCount(0);
  await expect(page.locator(".catalog-experience canvas")).toHaveCount(0);
  await expect(page.locator("[data-audio-session]")).toHaveCount(1);
  await index.getByRole("link", { name: "Energy charge", exact: true }).click();
  await expect(page).toHaveURL(`${home}/catalog/energy-charge`);
  await expect(
    page.getByRole("heading", { level: 1, name: "Energy charge", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Catalog" })
      .getByRole("link", { name: "Energy charge", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.goto(catalog);
  await page
    .getByRole("link", { name: "Open impact workbench", exact: true })
    .click();
  await expect(page).toHaveURL(`${home}/catalog/impact`);
  await expect(
    page.getByRole("heading", { level: 1, name: "Impact", exact: true }),
  ).toBeVisible();
});

test("catalog playback stays on one session until Stop all and cleanup", async ({
  page,
}) => {
  await instrument(page);
  await page.goto(catalog);
  expect(await contexts(page)).toEqual([]);
  const monitor = page.getByRole("complementary", { name: "Audio monitor" });
  await expect(monitor.getByRole("status")).toHaveText("Audio: idle");
  for (const entry of catalogEntries) {
    if (entry.category !== "bundled") continue;
    if (entry.playback === "sustained") {
      await expect(
        page.getByRole("button", {
          name: `Start ${entry.title.toLowerCase()}`,
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", {
          name: `Stop ${entry.title.toLowerCase()}`,
          exact: true,
        }),
      ).toHaveCount(0);
    } else {
      await expect(
        page.getByRole("button", {
          name: `Play ${entry.title.toLowerCase()}`,
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", {
          name: `Stop ${entry.title.toLowerCase()}`,
          exact: true,
        }),
      ).toHaveCount(0);
    }
  }
  await page
    .getByRole("button", { name: "Play confirmation", exact: true })
    .click();
  await expect(monitor.getByRole("status")).toHaveText("Audio: running");
  expect(await contexts(page)).toEqual(["running"]);
  await page
    .getByRole("button", { name: "Start thruster", exact: true })
    .click();
  await expect(page.getByTestId("thruster-state")).toHaveText(
    "Thruster: running",
  );
  await expect(page.locator("#thruster")).toHaveAttribute(
    "data-status",
    "running",
  );
  await page.getByRole("button", { name: "Play impact", exact: true }).click();
  await expect(page.getByTestId("thruster-state")).toHaveText(
    "Thruster: running",
  );
  await expect(page.getByTestId("impact-state")).toContainText("Impact:");
  expect(await contexts(page)).toEqual(["running"]);
  await page.getByText("Playback settings", { exact: true }).click();
  const mute = page.getByRole("button", { name: "Mute", exact: true });
  await mute.click();
  await expect(mute).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("thruster-state")).toHaveText(
    "Thruster: running",
  );
  await page.getByRole("button", { name: "Stop all", exact: true }).click();
  await expect(page.getByTestId("thruster-state")).toHaveText(
    "Thruster: stopped",
  );
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "AudioBits", exact: true })
    .click();
  await expect.poll(() => contexts(page)).toEqual(["closed"]);
});

test("catalog experience previews stay silent and link to complete interactions", async ({
  page,
}) => {
  await instrument(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(catalog);
  expect(await contexts(page)).toEqual([]);
  await expect(page.locator(".catalog-experience canvas")).toHaveCount(0);
  await expect(page.locator(".catalog-experience button")).toHaveCount(0);
  for (const entry of catalogEntries) {
    if (entry.category !== "experience") continue;
    const preview = page.locator(`[data-catalog-entry="${entry.slug}"]`);
    await preview.getByRole("link").click();
    await expect(page).toHaveURL(`${home}${entry.href}`);
    expect(
      (await contexts(page)).filter((state) => state !== "closed"),
    ).toEqual([]);
    if (entry.slug === "energy-charge") {
      const hold = page.getByRole("button", {
        name: "Hold to charge",
        exact: true,
      });
      await expect(hold).toBeEnabled();
      const box = (await hold.boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
    } else if (entry.slug === "lightsaber")
      await page.getByRole("button", { name: "Ignite", exact: true }).click();
    else await dragThruster(page);
    await expect
      .poll(
        async () =>
          (await contexts(page)).filter((state) => state === "running").length,
      )
      .toBe(1);
    await page.mouse.up();
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Catalog", exact: true })
      .click();
    await expect(page).toHaveURL(catalog);
    await expect
      .poll(async () =>
        (await contexts(page)).every((state) => state === "closed"),
      )
      .toBe(true);
  }
});

test("catalog navigation, focus, and layout hold on desktop and mobile", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(catalog);
  await expect(
    page.getByRole("button", { name: "Catalog menu", exact: true }),
  ).toBeHidden();
  const index = page.getByRole("navigation", { name: "Catalog" });
  await index.getByRole("link", { name: "Energy charge", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(
    index.getByRole("link", { name: "Reactive thruster", exact: true }),
  ).toBeFocused();
  await page.locator("#thruster").evaluate((entry) => {
    entry.scrollIntoView({ block: "start" });
  });
  await expect(
    index.getByRole("link", { name: "Thruster", exact: true }),
  ).toHaveAttribute("aria-current", "location");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter((animation) => animation.playState === "running").length,
    ),
  ).toBe(0);
  await expect(
    page.getByRole("img", {
      name: "Live output waveform; animation pauses for reduced motion",
    }),
  ).toHaveAttribute("data-peak", "0");
  await page.screenshot({
    path: testInfo.outputPath("catalog-desktop.png"),
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(catalog);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    await page
      .locator(".audio-monitor")
      .evaluate((node) => getComputedStyle(node).position),
  ).toBe("static");
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );
  const docs = page
    .locator(".catalog-footer")
    .getByRole("link", { name: "Catalog and installation guide", exact: true });
  expect(
    await docs.evaluate((link) => {
      const rect = link.getBoundingClientRect();
      const dock = document
        .querySelector(".audio-monitor")
        ?.getBoundingClientRect();
      if (!dock) return false;
      const hit = document.elementFromPoint(
        rect.x + Math.min(rect.width / 2, 24),
        rect.y + rect.height / 2,
      );
      return link.contains(hit);
    }),
  ).toBe(true);
  await expect(index).toBeHidden();
  const menu = page.getByRole("button", { name: "Catalog menu", exact: true });
  await menu.click();
  const dialog = page.getByRole("dialog", { name: "Catalog menu" });
  await expect(dialog).toBeVisible();
  const first = dialog.getByRole("link", {
    name: "Energy charge",
    exact: true,
  });
  const close = dialog.getByRole("button", { name: "Close", exact: true });
  await expect(first).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(first).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await expect(dialog).toHaveCount(0);
  await menu.click();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(menu).toBeFocused();
  await page.getByText("Playback settings", { exact: true }).click();
  await expect(
    page.getByRole("slider", { name: "Effects volume", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("catalog-mobile.png"),
    fullPage: true,
  });
});

test("main navigation opens the canonical catalog", async ({ page }) => {
  await page.goto(home);
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Catalog", exact: true })
    .click();
  await expect(page).toHaveURL(catalog);
  await expect(
    page.getByRole("link", { name: "Catalog", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});

test("catalog Stop all cancels pending activation before any signal starts", async ({
  page,
}) => {
  await instrumentExperience(page, "held", "/catalog");
  await page
    .getByRole("button", { name: "Start thruster", exact: true })
    .click();
  await expect(page.getByTestId("thruster-state")).toHaveText(
    "Thruster: starting",
  );
  await page.getByText("Playback settings", { exact: true }).click();
  await page.getByRole("button", { name: "Stop all", exact: true }).click();
  await page.evaluate(() =>
    (
      globalThis as unknown as { thrusterProbe: { releaseActivation(): void } }
    ).thrusterProbe.releaseActivation(),
  );
  await expect
    .poll(async () => (await probe(page)).contexts)
    .toEqual(["running"]);
  await expect(page.getByTestId("thruster-state")).toHaveText(
    "Thruster: stopped",
  );
  expect((await probe(page)).sources).toBe(0);
});
