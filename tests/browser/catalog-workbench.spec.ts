import { expect, test } from "@playwright/test";
import { catalogEntries } from "../../apps/www/lib/catalog";

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

test("confirmation has no inaudible controls and copies playable usage", async ({
  page,
}) => {
  await instrument(page);
  await page.goto(`${home}/catalog/confirmation`);
  await expect(
    page.getByRole("heading", { level: 1, name: "Confirmation", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("slider")).toHaveCount(0);
  await expect(
    page.getByRole("group", { name: "Playback" }).getByRole("button"),
  ).toHaveText(["Play confirmation"]);
  await expect(page.getByText("Control position")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Stop confirmation" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("img", { name: "Measured harmonic output", exact: true }),
  ).toHaveAttribute("data-peak", "0");
  await expect(page.getByRole("tab")).toHaveCount(0);
  await expect(page.getByRole("spinbutton")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Randomize/ })).toHaveCount(0);
  await page
    .getByRole("button", { name: "Copy confirmation code", exact: true })
    .click();
  const example = await copied(page);
  expect(example).toContain(
    'import { confirmation } from "./sounds/recipes/confirmation/recipe"',
  );
  expect(example).toContain("sound.play()");
  expect(example).not.toContain("seed:");
  await page
    .getByRole("button", { name: "Play confirmation", exact: true })
    .click();
  await expect(
    page.locator(".catalog-transport").getByRole("status"),
  ).toHaveText("Audio: running");
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
  await expect(page.getByRole("tab")).toHaveCount(0);
  await expect(page.getByRole("spinbutton")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Play gentle rejection", exact: true }),
  ).toBeVisible();
  await page.locator(".recipe-tools summary").click();
  await expect(
    page.getByRole("button", {
      name: "Copy gentle-rejection recipe",
      exact: true,
    }),
  ).toBeVisible();
});

test("impact copies current parameters and applied edits, validates JSON, and restores defaults @smoke", async ({
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
  expect(example).toContain(
    'import { whoosh } from "./sounds/recipes/whoosh/recipe"',
  );
  expect(example).toContain('"size":0.9');
  expect(example).toContain(`seed: ${seed}`);
  await page.locator(".recipe-tools summary").click();
  await page
    .getByRole("button", { name: "Copy whoosh recipe", exact: true })
    .click();
  expect(JSON.parse(await copied(page)).schemaVersion).toBe(1);
  await page
    .getByRole("button", { name: "Reset variation", exact: true })
    .click();
  await expect(
    page.getByRole("spinbutton", { name: "whoosh seed" }),
  ).toHaveValue("42");

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

  // Removing audible variation must remove its UI and clear an invalid seed.
  await page.getByRole("spinbutton", { name: "whoosh seed" }).fill("-1");
  recipe.layers = [
    {
      id: "tone",
      source: { type: "oscillator", waveform: "sine", frequency: 220 },
      gainDb: -24,
      envelope: { attack: 0.004, decay: 0.08, sustain: 0, release: 0.02 },
    },
  ];
  await editor.fill(JSON.stringify(recipe));
  await page.getByRole("button", { name: "Apply whoosh recipe" }).click();
  await expect(page.locator(".recipe-tools [role=alert]")).toHaveCount(0);
  await expect(page.getByRole("spinbutton")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Copy whoosh code", exact: true })
    .click();
  expect(await copied(page)).not.toContain("seed:");
  expect(await copied(page)).toContain('"detail":15');
  await page
    .getByRole("button", { name: "Copy whoosh recipe", exact: true })
    .click();
  expect(JSON.parse(await copied(page))).toEqual(recipe);
  await page.getByRole("button", { name: "Play whoosh", exact: true }).click();
  await expect(page.locator(".catalog-transport [role=alert]")).toHaveCount(0);
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
    .getByRole("link", { name: "Next: Tactile click →", exact: true })
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

test("desktop and mobile workbenches put interaction before adoption and source", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${home}/catalog/impact`);
  const play = page.getByRole("button", { name: "Play impact", exact: true });
  const code = page.getByRole("button", {
    name: "Copy impact code",
    exact: true,
  });
  await expect(play).toBeVisible();
  await expect(code).toBeVisible();
  const playBox = await play.boundingBox();
  const codeBox = await code.boundingBox();
  expect(playBox).not.toBeNull();
  expect(codeBox).not.toBeNull();
  expect(playBox!.y).toBeGreaterThanOrEqual(0);
  expect(playBox!.y + playBox!.height).toBeLessThanOrEqual(900);
  const installBox = (await page.locator(".catalog-adoption").boundingBox())!;
  const customizeBox = (await page.locator(".catalog-playback").boundingBox())!;
  const stageBox = (await page.locator(".catalog-stage").boundingBox())!;
  expect(installBox.y).toBeGreaterThanOrEqual(
    customizeBox.y + customizeBox.height,
  );
  expect(installBox.y).toBeGreaterThanOrEqual(stageBox.y + stageBox.height);
  expect(codeBox!.y).toBeGreaterThan(installBox.y);
  expect(codeBox!.y).toBeLessThan(installBox.y + installBox.height);
  await page
    .getByRole("button", { name: "Copy Impact command", exact: true })
    .focus();
  await expect(
    page.getByRole("button", { name: "Copy Impact command", exact: true }),
  ).toBeFocused();
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
  await page.evaluate(() => window.scrollTo(0, 0));
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
  await page
    .getByRole("button", { name: "Stop thruster", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("thruster-state")).toHaveText(
    "Thruster: stopped",
  );
  await page.locator(".recipe-tools summary").focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Edit recipe", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    await page
      .locator(".catalog-transport")
      .evaluate((node) => getComputedStyle(node).position),
  ).toBe("static");
  await expect(
    page.getByRole("button", { name: "Levels", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Mute", exact: true }),
  ).toHaveCount(0);

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
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: testInfo.outputPath("workbench-mobile.png"),
    fullPage: true,
  });
});

test("current catalog entries work and unknown slugs stay 404", async ({
  request,
}) => {
  expect(
    (await request.get(`${home}/catalog/impact`, { maxRedirects: 0 })).status(),
  ).toBe(200);
  expect(
    (
      await request.get(`${home}/catalog/not-a-sound`, { maxRedirects: 0 })
    ).status(),
  ).toBe(404);
  expect((await request.get(`${home}/catalog/energy-charge`)).status()).toBe(
    200,
  );
  expect(
    (await request.get(`${home}/catalog/reactive-thruster`)).status(),
  ).toBe(200);
});

test("every catalog item copies its registry command and links to installation docs", async ({
  page,
  request,
}) => {
  await instrument(page);
  for (const entry of catalogEntries) {
    await page.goto(`${home}${entry.href}`);
    const adoption = page.getByRole("region", { name: "Add to project" });
    const command = `npx shadcn@latest add joacod/audiobits/${entry.slug}`;
    await expect(adoption.locator(".landing-command pre")).toHaveText(command);
    await expect(adoption).toContainText("audiobits runtime dependency");
    await expect(adoption).toContainText("Installs the catalog defaults");
    const copy = adoption.getByRole("button", {
      name: `Copy ${entry.title} command`,
      exact: true,
    });
    await expect(copy).toBeEnabled();
    await copy.focus();
    await page.keyboard.press("Enter");
    await expect(
      adoption.locator(".landing-command").getByRole("status"),
    ).toHaveText("Copied.");
    expect(await copied(page)).toBe(command);
    const usage = adoption.locator(".catalog-usage");
    await expect(
      usage.getByRole("heading", { name: "Use this sound" }),
    ).toBeVisible();
    await usage
      .getByRole("button", { name: `Copy ${entry.slug} code`, exact: true })
      .click();
    await expect(usage.getByRole("status")).toHaveText("Copied.");
    expect(await copied(page)).toBe(await usage.locator("pre").innerText());
    expect(await copied(page)).toContain('from "audiobits"');
    expect(await copied(page)).toContain(
      `./sounds/${entry.category === "bundled" ? "recipes" : "experiences"}/${entry.slug}/`,
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
        `https://github.com/joacod/audiobits/tree/main/catalog/experiences/${entry.slug}`,
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

for (const [width, height] of [
  [1440, 900],
  [768, 1024],
  [390, 844],
]) {
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

test("usage is selectable and Copy waits for hydration @smoke", async ({
  page,
}) => {
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
