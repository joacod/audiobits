import { dragThruster, instrument, probe } from "./experience-probe";
import { expect, test, type Page, type Response } from "@playwright/test";
import { catalogEntries, catalogGroups } from "../../apps/www/lib/catalog";

const home = "http://127.0.0.1:3100";
const catalog = `${home}/catalog`;

async function expectClosed(page: Page) {
  await expect
    .poll(async () => {
      const result = await probe(page);
      return {
        connected: result.connected,
        contexts: result.contexts.filter((state) => state !== "closed"),
      };
    })
    .toEqual({ connected: 0, contexts: [] });
}

test("catalog card playback contrast and index navigation remain readable", async ({
  page,
}) => {
  await instrument(page, "normal", "/catalog");
  await expect(page.locator("h1")).toHaveText("Catalog");
  await expect(
    page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Catalog", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".catalog-section > h2")).toHaveText(
    catalogGroups.map((group) => group.title),
  );
  // Registry order, labels and links are checked against every production card.
  for (const entry of catalogEntries.filter(
    (entry) => entry.category === "bundled",
  )) {
    const card = page.locator(`[data-catalog-entry="${entry.slug}"]`);
    if (entry.category === "bundled") {
      // Inspect the playback state synchronously, before a short one-shot ends.
      const colors = await card.evaluate((node) => {
        const mark = node.querySelector(".catalog-mark")!;
        const cover = node.querySelector(".catalog-card-preview")!;
        const status = node.getAttribute("data-status");
        node.setAttribute("data-status", "playing");
        const result = {
          icon: getComputedStyle(mark).color,
          contrast: getComputedStyle(cover).color,
        };
        if (status === null) node.removeAttribute("data-status");
        else node.setAttribute("data-status", status);
        return result;
      });
      expect(colors.icon).toBe(colors.contrast);
    }
  }
  await expect(
    page.getByRole("navigation", { name: "Catalog", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.locator(
      '[aria-current="location"], .audio-monitor, canvas, textarea, input',
    ),
  ).toHaveCount(0);
  await expect(page.locator("[data-audio-session]")).toHaveCount(1);
  await page.locator("#power-up").scrollIntoViewIfNeeded();
  await expect(page.locator('[aria-current="location"]')).toHaveCount(0);
  expect((await probe(page)).contexts).toEqual([]);
});

test("representative card hit areas navigate with non-wrapping Previous/Next boundaries", async ({
  page,
}) => {
  // All route order/link contracts run against production HTML. Keep real hit
  // areas, navigation and both pagination boundaries in Chromium.
  const representatives = [
    catalogEntries[0],
    catalogEntries.find((entry) => entry.slug === "confirmation")!,
    catalogEntries.at(-1)!,
  ];
  for (const entry of representatives) {
    const index = catalogEntries.indexOf(entry);
    await page.goto(catalog);
    const card = page.locator(`[data-catalog-entry="${entry.slug}"]`);
    // Use real pointer coordinates: the stretched link covers the preview.
    const preview = card.locator(".catalog-card-preview");
    await preview.scrollIntoViewIfNeeded();
    const box = (await preview.boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page).toHaveURL(`${home}${entry.href}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      entry.title,
    );
    const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(breadcrumb.getByRole("listitem")).toHaveCount(2);
    await expect(breadcrumb.getByRole("link")).toHaveAttribute(
      "href",
      "/catalog",
    );
    await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText(
      entry.title,
    );
    const pagination = page.getByRole("navigation", {
      name: "Previous and next",
    });
    const previous = catalogEntries[index - 1];
    const next = catalogEntries[index + 1];
    if (previous)
      await expect(
        pagination.getByRole("link", {
          name: `Previous ${previous.title}`,
          exact: true,
        }),
      ).toHaveAttribute("href", previous.href);
    else await expect(pagination.locator('[rel="prev"]')).toHaveCount(0);
    if (next)
      await expect(
        pagination.getByRole("link", {
          name: `Next ${next.title}`,
          exact: true,
        }),
      ).toHaveAttribute("href", next.href);
    else await expect(pagination.locator('[rel="next"]')).toHaveCount(0);
    await expect(
      page.locator('a[href^="/catalog#"], .catalog-related, .catalog-docs'),
    ).toHaveCount(0);
    if (next) {
      await pagination.locator('[rel="next"]').click();
      await expect(page).toHaveURL(`${home}${next.href}`);
      await page
        .getByRole("navigation", { name: "Previous and next" })
        .locator('[rel="prev"]')
        .click();
      await expect(page).toHaveURL(`${home}${entry.href}`);
    }
    await page
      .getByRole("navigation", { name: "Breadcrumb" })
      .getByRole("link")
      .click();
    await expect(page).toHaveURL(catalog);
  }
});

test("card Play and Start/Stop use one engine, replace other previews, and dispose on navigation @smoke", async ({
  page,
}) => {
  await instrument(page, "normal", "/catalog");
  for (const entry of catalogEntries) {
    if (entry.category !== "bundled") continue;
    const sustained = entry.playback === "sustained";
    const before = (await probe(page)).sources;
    await page
      .getByRole("button", {
        name: `${sustained ? "Start" : "Play"} ${entry.title.toLowerCase()}`,
        exact: true,
      })
      .click();
    await expect
      .poll(async () => (await probe(page)).sources)
      .toBeGreaterThan(before);
    await expect(page.getByTestId(`${entry.slug}-state`)).toHaveText(
      `${entry.title}: ${sustained ? "running" : "ready"}`,
    );
    expect((await probe(page)).contexts).toEqual(["running"]);
    if (sustained) {
      await page
        .getByRole("button", {
          name: `Stop ${entry.title.toLowerCase()}`,
          exact: true,
        })
        .click();
      await expect(page.getByTestId(`${entry.slug}-state`)).toHaveText(
        `${entry.title}: stopped`,
      );
    }
  }
  await page
    .getByRole("button", { name: "Start thruster", exact: true })
    .click();
  await page.getByRole("button", { name: "Play impact", exact: true }).click();
  await expect(page.getByTestId("thruster-state")).toHaveText(
    "Thruster: stopped",
  );
  await page
    .getByRole("button", { name: "Start thruster", exact: true })
    .click();
  await page.locator("#confirmation").getByRole("link").click();
  await expect(page).toHaveURL(`${home}/catalog/confirmation`);
  await expectClosed(page);
});

test("card Stop cancels pending activation before sources start @smoke", async ({
  page,
}) => {
  await instrument(page, "held", "/catalog");
  await page
    .getByRole("button", { name: "Start thruster", exact: true })
    .click();
  await expect(page.getByTestId("thruster-state")).toHaveText(
    "Thruster: starting",
  );
  await page
    .getByRole("button", { name: "Stop thruster", exact: true })
    .click();
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
  await expect(page.getByTestId("thruster-state")).toHaveText(
    "Thruster: stopped",
  );
  expect((await probe(page)).sources).toBe(0);
});

test("card activation errors stay local and retry works @smoke", async ({
  page,
}) => {
  await instrument(page, "failed", "/catalog");
  const card = page.locator("#thruster");
  await card
    .getByRole("button", { name: "Start thruster", exact: true })
    .click();
  await expect(card.getByRole("alert")).toContainText(
    "Audio activation failed. Retry Play with a user gesture.",
  );
  await card
    .getByRole("button", { name: "Start thruster", exact: true })
    .click();
  await expect(card.getByRole("alert")).toHaveCount(0);
  await expect(page.getByTestId("thruster-state")).toHaveText(
    "Thruster: running",
  );
});

test("hiding the index interrupts its current preview", async ({ page }) => {
  await instrument(page, "normal", "/catalog");
  await page
    .getByRole("button", { name: "Start thruster", exact: true })
    .click();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByTestId("thruster-state")).toHaveText(
    "Thruster: stopped",
  );
  await expect
    .poll(async () => (await probe(page)).contexts)
    .toEqual(["suspended"]);
  const sources = (await probe(page)).sources;
  await page.getByRole("button", { name: "Play impact", exact: true }).click();
  expect((await probe(page)).sources).toBe(sources);
  expect((await probe(page)).contexts).toEqual(["suspended"]);
  await page.locator("#impact").getByRole("link").click();
  await expectClosed(page);
});

test("experience cards stay silent and full interactions clean up on return", async ({
  page,
}) => {
  await instrument(page, "normal", "/catalog");
  for (const entry of catalogEntries) {
    if (entry.category !== "experience") continue;
    const card = page.locator(`[data-catalog-entry="${entry.slug}"]`);
    await expect(card.locator("canvas, button")).toHaveCount(0);
    const before = await probe(page);
    await card.getByRole("link").click();
    await expect(page).toHaveURL(`${home}${entry.href}`);
    // Held experiences prepare their context during navigation, without sound.
    // Echo Probe is a one-shot whose completed tap can activate its own context.
    await expect
      .poll(async () =>
        (await probe(page)).contexts.filter((state) => state !== "closed"),
      )
      .toEqual(entry.slug === "echo-probe" ? [] : ["running"]);
    const prepared = await probe(page);
    expect(prepared.sources).toBe(before.sources);
    expect(prepared.ownedSources).toBe(0);
    if (entry.slug === "energy-charge") {
      const hold = page.getByRole("button", {
        name: "Hold to charge",
        exact: true,
      });
      await expect(hold).toBeEnabled();
      const box = (await hold.boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
    } else if (entry.slug === "lightsaber") {
      const stage = page.getByRole("group", {
        name: "Lightsaber stage",
        exact: true,
      });
      await expect(stage).toHaveAttribute("data-state", "stopped");
      await stage.scrollIntoViewIfNeeded();
      const box = (await stage.boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.8);
      await page.mouse.down();
    } else if (entry.slug === "echo-vision") {
      const stage = page.getByRole("group", {
        name: "Echo Vision stage",
        exact: true,
      });
      await expect(stage).toHaveAttribute("data-ready", "true");
      await stage.click();
      await expect(stage).toHaveAttribute("data-state", "listening");
    } else if (entry.slug === "echo-probe") {
      const stage = page.getByRole("group", {
        name: "Echo Probe stage",
        exact: true,
      });
      await expect(stage).toHaveAttribute("data-ready", "true");
      await stage.click();
    } else if (entry.slug === "the-rift") {
      const stage = page.getByRole("group", {
        name: "The Rift stage",
        exact: true,
      });
      await expect(stage).toHaveAttribute("data-ready", "true");
      await stage.scrollIntoViewIfNeeded();
      const box = (await stage.boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.25);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.7, {
        steps: 6,
      });
    } else if (entry.slug === "riff-reactor") {
      const stage = page.getByRole("group", {
        name: "Riff Reactor stage",
        exact: true,
      });
      await expect(stage).toHaveAttribute("data-ready", "true");
      await stage.scrollIntoViewIfNeeded();
      const box = (await stage.boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await expect(stage).toHaveAttribute("data-phase", "playing");
    } else await dragThruster(page);
    await expect
      .poll(
        async () =>
          (await probe(page)).contexts.filter((state) => state === "running")
            .length,
      )
      .toBe(1);
    await page.mouse.up();
    await page
      .getByRole("navigation", { name: "Breadcrumb" })
      .getByRole("link")
      .click();
    await expect(page).toHaveURL(catalog);
    await expectClosed(page);
  }
});

for (const width of [1440, 390]) {
  test(`sidebar selection, Back and Forward at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${home}/catalog/impact`);
    if (width < 761)
      await page
        .getByRole("button", { name: "Catalog menu", exact: true })
        .click();
    await expect(
      page
        .getByRole("navigation", { name: "Catalog", exact: true })
        .locator('[aria-current="page"]'),
    ).toHaveText("Impact");
    if (width < 761) await page.keyboard.press("Escape");
    const destinations = [
      catalogEntries[0],
      catalogEntries.find((entry) => entry.slug === "echo-vision")!,
      catalogEntries.at(-1)!,
    ];
    for (const entry of destinations) {
      if (width < 761)
        await page
          .getByRole("button", { name: "Catalog menu", exact: true })
          .click();
      const nav = page.getByRole("navigation", {
        name: "Catalog",
        exact: true,
      });
      await nav.getByRole("link", { name: entry.title, exact: true }).click();
      await expect(page).toHaveURL(`${home}${entry.href}`);
      if (width < 761) {
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await page
          .getByRole("button", { name: "Catalog menu", exact: true })
          .click();
      }
      await expect(nav.locator('[aria-current="page"]')).toHaveText(
        entry.title,
      );
      await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
      if (width < 761) await page.keyboard.press("Escape");
    }
    const last = destinations.at(-1)!;
    const previous = destinations.at(-2)!;
    await page.goBack();
    if (width < 761)
      await page
        .getByRole("button", { name: "Catalog menu", exact: true })
        .click();
    await expect(
      page
        .getByRole("navigation", { name: "Catalog", exact: true })
        .locator('[aria-current="page"]'),
    ).toHaveText(previous.title);
    if (width < 761) await page.keyboard.press("Escape");
    await page.goForward();
    if (width < 761)
      await page
        .getByRole("button", { name: "Catalog menu", exact: true })
        .click();
    await expect(
      page
        .getByRole("navigation", { name: "Catalog", exact: true })
        .locator('[aria-current="page"]'),
    ).toHaveText(last.title);
    if (width < 761) await page.keyboard.press("Escape");
  });
}

test("detail mobile menu traps focus, closes, and restores the trigger", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${home}/catalog/impact`);
  const menu = page.getByRole("button", { name: "Catalog menu", exact: true });
  await menu.click();
  const dialog = page.getByRole("dialog", { name: "Catalog menu" });
  const first = dialog.getByRole("link", {
    name: catalogEntries[0].title,
    exact: true,
  });
  const last = dialog.getByRole("link", {
    name: catalogEntries.at(-1)!.title,
    exact: true,
  });
  await expect(first).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    dialog.getByRole("button", { name: "Close", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(last).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    dialog.getByRole("button", { name: "Close", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await expect(dialog).toHaveCount(0);
  await menu.click();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(menu).toBeFocused();
});

for (const [width, height] of [
  [1440, 900],
  [768, 1024],
  [390, 844],
  [320, 740],
]) {
  test(`cards fit and remain reachable at ${width}×${height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(catalog);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    // Experience and sound covers have their own proportions. Each group
    // stays aligned, allowing fractional grid-track rounding between columns.
    for (const group of catalogGroups) {
      const previews = await page
        .locator(`[data-category="${group.category}"] .catalog-card-preview`)
        .evaluateAll((nodes) =>
          nodes.map((node) => node.getBoundingClientRect().height),
        );
      expect(Math.min(...previews)).toBeGreaterThanOrEqual(160);
      expect(Math.max(...previews) - Math.min(...previews)).toBeLessThanOrEqual(
        1,
      );
    }
    for (const entry of catalogEntries) {
      const card = page.locator(`[data-catalog-entry="${entry.slug}"]`);
      const link = card.getByRole("link");
      await link.focus();
      await expect(link).toBeFocused();
      const button = card.getByRole("button");
      if (entry.category === "bundled") {
        await button.scrollIntoViewIfNeeded();
        const box = (await button.boundingBox())!;
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(
          await button.evaluate((node) => {
            const r = node.getBoundingClientRect();
            return node.contains(
              document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
            );
          }),
        ).toBe(true);
      }
    }
    expect(
      await page.evaluate(
        () =>
          document
            .getAnimations()
            .filter((animation) => animation.playState === "running").length,
      ),
    ).toBe(0);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: testInfo.outputPath(`catalog-${width}.png`),
      fullPage: true,
    });
  });
}

test("main navigation opens the canonical catalog", async ({ page }) => {
  await page.goto(home);
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Catalog", exact: true })
    .click();
  await expect(page).toHaveURL(catalog);
});

test("simple catalog entry avoids immersive renderer requests while immersive entries load theirs", async ({
  browser,
}) => {
  // Actual production requests matter here: a Server Component can emit the same
  // eager scripts despite dynamic imports. Static route metadata cannot prove it.
  for (const slug of ["confirmation", "echo-vision", "lightsaber"]) {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      const scripts: Response[] = [];
      const record = (response: Response) => {
        if (response.request().resourceType() === "script")
          scripts.push(response);
      };
      page.on("response", record);
      await page.goto(`${home}/catalog/${slug}`);
      await page.waitForLoadState("networkidle");
      // Immersive routes replace the loading placeholder with a named stage.
      // Assert the loaded UI so fast hydration cannot make this check miss it.
      const stage =
        slug === "confirmation"
          ? page.locator(".catalog-stage")
          : page.getByRole("group", {
              name:
                slug === "echo-vision"
                  ? "Echo Vision stage"
                  : "Lightsaber stage",
              exact: true,
            });
      await expect(stage).toBeVisible();
      page.off("response", record);
      const code = (
        await Promise.all(scripts.map((response) => response.text()))
      ).join("\n");
      expect(code.includes("WebGLRenderer"), slug).toBe(
        slug !== "confirmation",
      );
      expect(code, slug).not.toContain("Riff Reactor stage");
    } finally {
      await context.close();
    }
  }
});
