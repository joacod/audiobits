import { expect, test } from "@playwright/test";

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

test("confirmation copies the current seed and has no parameter controls", async ({
  page,
}) => {
  await instrument(page);
  await page.goto(`${home}/catalog/confirmation`);
  await expect(
    page.getByRole("heading", { level: 1, name: "Confirmation", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Bundled sound · Success feedback · one-shot"),
  ).toBeVisible();
  await expect(page.getByRole("slider")).toHaveCount(1);
  await expect(
    page.getByRole("slider", { name: "Effects volume", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Control position")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Stop confirmation" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("img", { name: "Measured harmonic output", exact: true }),
  ).toHaveAttribute("data-peak", "0");
  await expect(
    page.getByRole("tab", { name: "Raw Web Audio", exact: true }),
  ).toBeVisible();
  await page.getByRole("spinbutton", { name: "confirmation seed" }).fill("9");
  await page
    .getByRole("button", { name: "Copy confirmation code", exact: true })
    .click();
  const example = await copied(page);
  expect(example).toContain('import { confirmation } from "audiobits/recipes"');
  expect(example).toContain("seed: 9");
  expect(example).not.toContain("seed: 42");
  await page
    .getByRole("button", { name: "Play confirmation", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("Audio: running");
  await expect(page.locator(".catalog-transport [role=alert]")).toHaveCount(0);
  expect(await contexts(page)).toEqual(["running"]);
});

test("gentle rejection omits parameters and raw comparison", async ({
  page,
}) => {
  await page.goto(`${home}/catalog/gentle-rejection`);
  await expect(page.getByRole("group", { name: "Sound controls" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("tab", { name: "Raw Web Audio" })).toHaveCount(0);
  await expect(
    page.getByRole("tab", { name: "Code", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("button", { name: "Play gentle-rejection", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Recipe", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Copy gentle-rejection recipe",
      exact: true,
    }),
  ).toBeVisible();
});

test("impact keeps recipe editing, seeds, current code, and raw comparison", async ({
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
    'import { impact } from "audiobits/recipes"',
  );
  await expect(
    page.getByRole("link", { name: "Production lifecycle", exact: true }),
  ).toBeVisible();

  await page.getByRole("tab", { name: "Recipe", exact: true }).click();
  await expect(page.getByRole("textbox")).toHaveCount(0);
  const recipeCode = page
    .getByRole("tabpanel", { name: "Recipe", exact: true })
    .locator("pre");
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
  await page.getByRole("tab", { name: "Code", exact: true }).click();
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await page.getByRole("tab", { name: "Recipe", exact: true }).click();
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
  await expect(page.getByRole("status")).toHaveText("Audio: running");

  delete input.unsupported;
  input.layers[0].gainDb.range = [-30, -20];
  await editor.fill(JSON.stringify(input));
  await page
    .getByRole("button", { name: "Apply impact recipe", exact: true })
    .click();
  await expect(page.locator(".recipe-tools [role=alert]")).toHaveCount(0);
  await page.getByRole("tab", { name: "Raw Web Audio", exact: true }).click();
  await expect(page.locator("#impact")).toContainText(
    "Restore the bundled recipe to view its raw comparison",
  );
  await page.getByRole("tab", { name: "Code", exact: true }).click();
  await page
    .getByRole("button", { name: "Copy impact code", exact: true })
    .click();
  expect(await copied(page)).toContain("defineSound");
  expect(await copied(page)).toContain("-30");
  expect(await copied(page)).not.toContain(
    'import { impact } from "audiobits/recipes"',
  );

  await page.getByRole("tab", { name: "Recipe", exact: true }).click();
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
  await page.getByRole("tab", { name: "Raw Web Audio", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Copy raw impact example", exact: true }),
  ).toBeVisible();

  await page.getByRole("spinbutton", { name: "impact seed" }).fill("-1");
  await page.getByRole("tab", { name: "Code", exact: true }).click();
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
});

test("whoosh shows only the controls in the applied recipe", async ({
  page,
}) => {
  await instrument(page);
  await page.goto(`${home}/catalog/whoosh`);
  await expect(page.getByRole("tab", { name: "Raw Web Audio" })).toHaveCount(0);
  await page.getByRole("slider", { name: "Size", exact: true }).fill("0.9");
  await page
    .getByRole("button", { name: "Randomize whoosh", exact: true })
    .click();
  const seed = Number(
    await page.getByRole("spinbutton", { name: "whoosh seed" }).inputValue(),
  );
  expect(seed).toBeGreaterThanOrEqual(0);
  expect(seed).toBeLessThanOrEqual(0xffffffff);
  await page
    .getByRole("button", { name: "Copy whoosh code", exact: true })
    .click();
  const example = await copied(page);
  expect(example).toContain('import { whoosh } from "audiobits/recipes"');
  expect(example).toContain('"size":0.9');
  expect(example).toContain(`seed: ${seed}`);
  await page
    .getByRole("button", { name: "Reset variation", exact: true })
    .click();
  await expect(
    page.getByRole("spinbutton", { name: "whoosh seed" }),
  ).toHaveValue("42");

  await page.getByRole("tab", { name: "Recipe", exact: true }).click();
  await page.getByRole("button", { name: "Edit recipe", exact: true }).click();
  const editor = page.getByRole("textbox", { name: "whoosh recipe JSON" });
  const recipe = JSON.parse(await editor.inputValue());
  recipe.parameters.size = { min: -1, max: 2, default: 0.5, mode: "play" };
  recipe.parameters.detail = { min: 10, max: 20, default: 15, mode: "play" };
  await editor.fill(JSON.stringify(recipe));
  await page
    .getByRole("button", { name: "Apply whoosh recipe", exact: true })
    .click();
  const size = page.getByRole("slider", { name: "Size", exact: true });
  await expect(size).toHaveAttribute("min", "-1");
  await expect(size).toHaveAttribute("max", "2");
  await expect(
    page.getByRole("slider", { name: "Detail", exact: true }),
  ).toHaveValue("15");
  await page.getByRole("tab", { name: "Recipe", exact: true }).click();
  await page
    .getByRole("button", { name: "Restore whoosh recipe", exact: true })
    .click();
  await expect(size).toHaveAttribute("min", "0");
  await expect(
    page.getByRole("slider", { name: "Detail", exact: true }),
  ).toHaveCount(0);
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
  await expect(start).toBeDisabled();
  await expect
    .poll(async () => Number(await scope.getAttribute("data-peak")))
    .toBeGreaterThan(0);
  await slider.fill("1");
  await expect(state).toHaveText("Thruster: running");
  await expect(page.getByText("Throttle: 1.00")).toBeVisible();
  await page.getByRole("tab", { name: "Code", exact: true }).click();
  await page
    .getByRole("button", { name: "Copy thruster code", exact: true })
    .click();
  expect(await copied(page)).toContain('"throttle":1');
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
  const mute = page.getByRole("button", { name: "Mute", exact: true });
  await mute.click();
  await expect(mute).toHaveAttribute("aria-pressed", "true");
  await expect(state).toHaveText("Thruster: running");
  await page
    .getByRole("button", { name: "Stop thruster", exact: true })
    .click();
  await expect(state).toHaveText("Thruster: stopped");
  await expect(start).toBeEnabled();
  await start.click();
  await expect(state).toHaveText("Thruster: running");
  await page
    .getByRole("navigation", { name: "Related entries" })
    .getByRole("link", { name: "Next: Confirmation", exact: true })
    .click();
  await expect(page).toHaveURL(`${home}/catalog/confirmation`);
  await expect(page.getByRole("status")).toHaveText("Audio: idle");
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
  await expect(page.locator(".recipe-tools")).toContainText(
    "Clipboard unavailable",
  );
});

test("desktop and mobile workbenches keep playback with the inspector", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${home}/catalog/impact`);
  const play = page.getByRole("button", { name: "Play impact", exact: true });
  const code = page.getByRole("tab", { name: "Code", exact: true });
  await expect(play).toBeVisible();
  await expect(code).toBeVisible();
  const playBox = await play.boundingBox();
  const codeBox = await code.boundingBox();
  expect(playBox).not.toBeNull();
  expect(codeBox).not.toBeNull();
  expect(playBox!.y).toBeGreaterThanOrEqual(0);
  expect(playBox!.y + playBox!.height).toBeLessThanOrEqual(900);
  expect(codeBox!.y).toBeGreaterThanOrEqual(0);
  expect(codeBox!.y + codeBox!.height).toBeLessThanOrEqual(900);
  await expect(
    page
      .getByRole("navigation", { name: "Catalog" })
      .getByRole("link", { name: "Impact", exact: true }),
  ).toHaveAttribute("aria-current", "page");
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
  await page.screenshot({
    path: testInfo.outputPath("workbench-desktop.png"),
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${home}/catalog/thruster`);
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
  await page.getByRole("button", { name: "Mute", exact: true }).focus();
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("button", { name: "Mute", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Stop thruster", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("thruster-state")).toHaveText(
    "Thruster: stopped",
  );
  await page.getByRole("tab", { name: "Code", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("tab", { name: "Recipe", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const strip = page.locator(".catalog-transport");
  const stripBox = await strip.boundingBox();
  expect(stripBox).not.toBeNull();
  expect(stripBox!.y + stripBox!.height).toBeLessThanOrEqual(844);
  expect(stripBox!.y).toBeGreaterThan(600);
  await page.getByRole("button", { name: "Levels", exact: true }).click();
  await expect(
    page.getByRole("slider", { name: "Effects volume", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Recipe", exact: true }).click();
  await page.getByRole("button", { name: "Edit recipe", exact: true }).click();
  const apply = page.getByRole("button", {
    name: "Apply thruster recipe",
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
  const menu = page.getByRole("button", { name: "Catalog menu", exact: true });
  await menu.click();
  const dialog = page.getByRole("dialog", { name: "Catalog menu" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await page.screenshot({
    path: testInfo.outputPath("workbench-mobile.png"),
    fullPage: true,
  });
});

test("unknown catalog slugs stay 404 while older sound routes stay available", async ({
  request,
}) => {
  expect((await request.get(`${home}/catalog/impact`)).status()).toBe(200);
  expect((await request.get(`${home}/sounds/impact`)).status()).toBe(200);
  expect((await request.get(`${home}/catalog/not-a-sound`)).status()).toBe(404);
  expect((await request.get(`${home}/catalog/energy-charge`)).status()).toBe(
    200,
  );
  expect(
    (await request.get(`${home}/catalog/reactive-thruster`)).status(),
  ).toBe(200);
});
