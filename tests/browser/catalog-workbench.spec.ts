import { expect, test } from "@playwright/test";
import { catalogEntries } from "../../apps/www/lib/catalog";
import { registryItem } from "../../apps/www/lib/registry";

const home = "http://127.0.0.1:3100";

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
    Object.assign(globalThis, {
      workbenchContexts: contexts,
      copiedExample: "",
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          Object.assign(globalThis, { copiedExample: value });
        },
      },
    });
  });
}

function copied(page: import("@playwright/test").Page) {
  return page.evaluate(
    () => (globalThis as unknown as { copiedExample: string }).copiedExample,
  );
}

function contexts(page: import("@playwright/test").Page) {
  return page.evaluate(() =>
    (
      globalThis as unknown as { workbenchContexts: AudioContext[] }
    ).workbenchContexts.map((context) => context.state),
  );
}

test("impact copies current parameters and applied edits, validates JSON, and restores defaults @required", async ({
  page,
}) => {
  await instrument(page);
  await page.goto(`${home}/catalog/impact`);
  expect(await contexts(page)).toEqual([]);
  await page
    .getByRole("slider", { name: "Intensity", exact: true })
    .fill("0.83");
  await expect(
    page.getByText("Control position · Intensity 83%"),
  ).toBeVisible();
  await expect(page.getByText("Applies on the next Play")).toBeVisible();
  await page.getByRole("spinbutton", { name: "impact seed" }).fill("7");
  await page
    .getByRole("button", { name: "Copy impact code", exact: true })
    .click();
  expect(await copied(page)).toContain('"intensity":0.83');
  expect(await copied(page)).toContain("seed: 7");
  expect(await copied(page)).toContain(
    'import { impact } from "./sounds/recipes/impact/recipe"',
  );
  await expect(
    page.getByRole("link", { name: "Production lifecycle", exact: true }),
  ).toBeVisible();

  await page.locator(".recipe-tools summary").click();
  await expect(page.getByRole("textbox")).toHaveCount(0);
  const recipeCode = page.locator(".recipe-tools pre");
  await expect(recipeCode).toBeVisible();
  expect(
    await recipeCode.evaluate((node) => node.scrollHeight > node.clientHeight),
  ).toBe(true);
  await page.getByRole("button", { name: "Edit recipe", exact: true }).click();
  const editor = page.getByRole("textbox", { name: "impact recipe JSON" });
  const bundled = await editor.inputValue();
  await editor.fill("{");
  await page
    .getByRole("button", { name: "Apply impact recipe", exact: true })
    .click();
  await expect(page.locator(".recipe-tools [role=alert]")).toContainText(
    "Not applied",
  );
  await page.locator(".recipe-tools summary").click();
  await expect(page.getByRole("textbox")).not.toBeVisible();
  await page.locator(".recipe-tools summary").click();
  await expect(editor).toHaveValue("{");
  await page.getByRole("button", { name: "View recipe", exact: true }).click();
  await page.getByRole("button", { name: "Edit recipe", exact: true }).click();
  await expect(editor).toHaveValue("{");

  const input = JSON.parse(bundled);
  input.unsupported = "alert('never executed')";
  await editor.fill(JSON.stringify(input));
  await page
    .getByRole("button", { name: "Apply impact recipe", exact: true })
    .click();
  await expect(page.locator(".recipe-tools [role=alert]")).toContainText(
    '$["unsupported"]',
  );
  await page.getByRole("button", { name: "Play impact", exact: true }).click();
  await expect(
    page.locator(".catalog-transport").getByRole("status"),
  ).toHaveText("Audio: running");

  delete input.unsupported;
  input.layers[0].gainDb.range = [-30, -20];
  await editor.fill(JSON.stringify(input));
  await page
    .getByRole("button", { name: "Apply impact recipe", exact: true })
    .click();
  await expect(page.locator(".recipe-tools [role=alert]")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Copy impact recipe", exact: true })
    .click();
  await expect(
    page
      .getByRole("button", { name: "Copy impact recipe", exact: true })
      .getByText("✓ Copied", { exact: true }),
  ).toBeVisible();
  expect(JSON.parse(await copied(page)).layers[0].gainDb.range).toEqual([
    -30, -20,
  ]);
  await page
    .getByRole("button", { name: "Copy impact code", exact: true })
    .click();
  expect(await copied(page)).toContain("defineSound");
  expect(await copied(page)).toContain("-30");
  expect(await copied(page)).not.toContain(
    'import { impact } from "./sounds/recipes/impact/recipe"',
  );

  await editor.fill(" ".repeat(32769));
  await page
    .getByRole("button", { name: "Apply impact recipe", exact: true })
    .click();
  await expect(page.locator(".recipe-tools [role=alert]")).toContainText(
    "32 KiB",
  );
  await page
    .getByRole("button", { name: "Restore impact recipe", exact: true })
    .click();
  await expect(
    page.getByRole("spinbutton", { name: "impact seed" }),
  ).toHaveValue("42");
  await expect(
    page.getByRole("slider", { name: "Intensity", exact: true }),
  ).toHaveValue("0.5");
  await expect(page.getByRole("tab")).toHaveCount(0);

  await page.getByRole("spinbutton", { name: "impact seed" }).fill("-1");
  await expect(
    page.getByRole("button", { name: "Copy impact code", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Play impact", exact: true }).click();
  await expect(page.locator(".catalog-transport [role=alert]")).toContainText(
    "valid seed",
  );
  await expect(page.locator(".catalog-parameters [role=alert]")).toContainText(
    "unsigned 32-bit integer",
  );
  expect(await contexts(page)).toHaveLength(1);
});

test("thruster stays sustained, follows live throttle, and navigation disposes audio", async ({
  page,
}) => {
  await instrument(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${home}/catalog/thruster`);
  const start = page.getByRole("button", {
    name: "Start thruster",
    exact: true,
  });
  const state = page.getByTestId("thruster-state");
  const slider = page.getByRole("slider", { name: "Throttle", exact: true });
  const scope = page.getByRole("img", {
    name: "Measured flow output",
    exact: true,
  });
  await expect(scope).toHaveAttribute("data-peak", "0");
  await expect(
    page.getByText("Changes this voice while it plays"),
  ).toBeVisible();
  await start.click();
  await expect(state).toHaveText("Thruster: running");
  await expect(
    page.getByRole("button", { name: "Stop thruster", exact: true }),
  ).toBeEnabled();
  await expect
    .poll(async () => Number(await scope.getAttribute("data-peak")))
    .toBeGreaterThan(0);
  await slider.fill("1");
  await expect(state).toHaveText("Thruster: running");
  await expect(page.getByText("Throttle: 1.00")).toBeVisible();
  await page
    .getByRole("button", { name: "Copy thruster code", exact: true })
    .click();
  expect(await copied(page)).toContain('"throttle":1');
  expect(await copied(page)).toContain('voice?.set({ "throttle": value })');
  expect(await copied(page)).toContain("export function release()");
  expect(await copied(page)).toContain("voice?.stop()");
  await scope.evaluate((canvas) => {
    const top = canvas.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, top + window.innerHeight);
  });
  await expect(scope).toHaveAttribute("data-peak", "0");
  await expect(state).toHaveText("Thruster: running");
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect
    .poll(async () => Number(await scope.getAttribute("data-peak")))
    .toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(scope).toHaveAttribute("data-peak", "0");
  await expect(state).toHaveText("Thruster: running");
  await page
    .getByRole("button", { name: "Stop thruster", exact: true })
    .click();
  await expect(state).toHaveText("Thruster: stopped");
  await expect(start).toBeEnabled();
  await start.click();
  await expect(state).toHaveText("Thruster: running");
  await page
    .getByRole("navigation", { name: "Previous and next" })
    .getByRole("link", { name: "Next Tactile click", exact: true })
    .click();
  await expect(page).toHaveURL(`${home}/catalog/tactile-click`);
  await expect(
    page.locator(".catalog-transport").getByRole("status"),
  ).toHaveText("Audio: idle");
  await expect.poll(() => contexts(page)).toEqual(["closed"]);
  await page
    .getByRole("link", { name: "Catalog", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(`${home}/catalog`);
});

test("clipboard failure stays visible and does not claim success", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("denied");
        },
      },
    });
  });
  await page.goto(`${home}/catalog/confirmation`);
  await page
    .getByRole("button", { name: "Copy confirmation code", exact: true })
    .click();
  await expect(page.locator(".catalog-usage")).toContainText(
    "Clipboard unavailable",
  );
});

test("recipe, experience and shared-source entry copy exact command and usage bytes with feedback @required", async ({
  page,
  request,
}) => {
  await instrument(page);
  // Exhaustive static commands and links are covered by production-output
  // checks. Browser evidence covers clipboard bytes, focus and feedback.
  for (const entry of catalogEntries.filter((entry) =>
    ["confirmation", "lightsaber", "echo-vision"].includes(entry.slug),
  )) {
    await page.goto(`${home}${entry.href}`);
    const adoption = page.getByRole("region", { name: "Add to project" });
    const sourceItem =
      entry.category === "experience" ? entry.source.item : entry.slug;
    const command = `npx shadcn@latest add joacod/audiobits/${sourceItem}`;
    await expect(adoption.locator(".landing-command pre")).toHaveText(command);
    await expect(adoption).toContainText("audiobits runtime dependency");
    await expect(adoption).toContainText("Installs the catalog defaults");
    const copy = adoption.getByRole("button", {
      name: `Copy ${registryItem(sourceItem).title} command`,
      exact: true,
    });
    await expect(copy).toBeEnabled();
    await copy.focus();
    await page.keyboard.press("Enter");
    await expect(
      adoption.locator(".landing-command").getByRole("status"),
    ).toHaveText("Copied.");
    await expect(copy.getByText("✓ Copied", { exact: true })).toBeVisible();
    expect(await copied(page)).toBe(command);
    await expect(copy).toBeFocused();
    const usage = adoption.locator(".catalog-usage");
    await expect(
      usage.getByRole("heading", { name: "Use this sound" }),
    ).toBeVisible();
    await usage
      .getByRole("button", { name: `Copy ${entry.slug} code`, exact: true })
      .click();
    await expect(usage.getByRole("status")).toHaveText("Copied.");
    await expect(
      usage.getByRole("button").getByText("✓ Copied", { exact: true }),
    ).toBeVisible();
    await expect(usage.locator("pre span[style]").first()).toBeAttached();
    expect(await copied(page)).toBe(await usage.locator("pre").innerText());
    expect(await copied(page)).toContain('from "audiobits"');
    expect(await copied(page)).toContain(
      `./sounds/${entry.category === "bundled" ? "recipes" : "experiences"}/${sourceItem}/`,
    );
    expect(await copied(page)).toContain("await audio.start()");
    expect(await copied(page)).toContain("await audio.dispose()");
    await expect(page.getByRole("tab")).toHaveCount(0);
    await expect(page.getByRole("spinbutton")).toHaveCount(
      entry.category === "bundled" &&
        !["confirmation", "gentle-rejection"].includes(entry.slug)
        ? 1
        : 0,
    );
    if (entry.category === "experience") {
      await expect(
        page.getByRole("button", { name: /Copy .*recipe/ }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("link", { name: "View complete public source" }),
      ).toHaveAttribute(
        "href",
        entry.slug === "echo-vision"
          ? "https://github.com/joacod/audiobits/blob/main/apps/www/app/echo-vision-stage.ts"
          : `https://github.com/joacod/audiobits/tree/main/catalog/experiences/${sourceItem}`,
      );
    }
    expect(await contexts(page)).toEqual([]);
    await expect(
      page
        .locator(".catalog-main")
        .getByText("npm install audiobits", { exact: true }),
    ).toHaveCount(0);
    await expect(
      adoption.getByRole("link", { name: "Installation guide" }),
    ).toHaveAttribute("href", "/docs/catalog#install-source");
  }
  const docs = await request.get(`${home}/docs/catalog`);
  expect(docs.status()).toBe(200);
  const html = await docs.text();
  expect(html).toContain('id="install-source"');
  expect(html).toContain('id="integrate-into-your-application"');
});

test("install command clipboard denial preserves a selectable command", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("denied");
        },
      },
    });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${home}/catalog/reactive-thruster`);
  const adoption = page.getByRole("region", { name: "Add to project" });
  await adoption
    .getByRole("button", {
      name: "Copy Reactive thruster command",
      exact: true,
    })
    .click();
  await expect(
    adoption.locator(".landing-command").getByRole("status"),
  ).toHaveText("Copy unavailable. Select and copy the command above.");
  await expect(adoption.locator(".landing-command pre")).toHaveText(
    "npx shadcn@latest add joacod/audiobits/reactive-thruster",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

for (const [width, height] of [[390, 844]]) {
  test(`catalog surfaces fit ${width}×${height} without obstructing source`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    for (const slug of [
      "confirmation",
      "impact",
      "thruster",
      "reactive-thruster",
      "energy-charge",
    ]) {
      await page.goto(`${home}/catalog/${slug}`);
      await page.evaluate(() => document.fonts.ready);
      await expect(
        page.getByRole("button", { name: /^Copy .* command$/ }),
      ).toBeEnabled();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const source = page.locator(".catalog-inspector");
      const adoption = page.locator(".catalog-adoption");
      const adoptionBox = (await adoption.boundingBox())!;
      expect(
        (await source.boundingBox())!.y - adoptionBox.y - adoptionBox.height,
      ).toBeGreaterThanOrEqual(16);
      const copy = adoption.getByRole("button", { name: /^Copy .* code$/ });
      await copy.scrollIntoViewIfNeeded();
      expect(
        await copy.evaluate((button) => {
          const rect = button.getBoundingClientRect();
          return button.contains(
            document.elementFromPoint(
              rect.x + rect.width / 2,
              rect.y + rect.height / 2,
            ),
          );
        }),
      ).toBe(true);
    }
    await page.goto(`${home}/catalog`);
    await expect(page.locator(".audio-monitor")).toHaveCount(0);
    await expect(page.locator(".catalog-card")).toHaveCount(
      catalogEntries.length,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

test("usage is selectable and Copy waits for hydration", async ({ page }) => {
  await instrument(page);
  let releaseScripts!: () => void;
  const scriptsHeld = new Promise<void>((resolve) => {
    releaseScripts = resolve;
  });
  await page.route("**/_next/static/**/*.js", async (route) => {
    await scriptsHeld;
    await route.continue();
  });
  await page.goto(`${home}/catalog/confirmation`, { waitUntil: "commit" });
  const usage = page.locator(".catalog-usage");
  const copy = usage.getByRole("button", {
    name: "Copy confirmation code",
    exact: true,
  });
  await expect(usage.locator("pre")).toContainText("sound.play()");
  await expect(copy).toBeDisabled();
  releaseScripts();
  await expect(copy).toBeEnabled();
  await copy.click();
  await expect(usage.getByRole("status")).toHaveText("Copied.");
  expect(await copied(page)).toBe(await usage.locator("pre").innerText());
  expect(await contexts(page)).toEqual([]);
});
