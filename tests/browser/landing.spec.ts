import { expect, test } from "@playwright/test";
import { instrument, probe, dragThruster } from "./experience-probe";

const home = "http://127.0.0.1:3100";

for (const [width, height] of [
  [320, 667],
  [375, 812],
  [390, 844],
  [768, 1024],
  [768, 900],
  [1280, 800],
  [1440, 900],
]) {
  test(`landing composition and navigation fit ${width}×${height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height });
    await page.goto(home);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator(".thruster-ribbons")).toHaveAttribute(
      "data-renderer",
      /webgl|canvas|unavailable/,
    );
    await expect(
      page.locator(".thruster-hero button, .thruster-hero input"),
    ).toHaveCount(0);
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const pad = (await page
      .getByRole("group", { name: "Drag to fly" })
      .boundingBox())!;
    const signal = (await page.locator(".thruster-signal").boundingBox())!;
    expect(pad.height).toBeGreaterThanOrEqual(208);
    expect(signal.y).toBeCloseTo(pad.y + pad.height, 0);
    expect(signal.y + signal.height).toBeLessThanOrEqual(height);
    const nav = page.getByRole("navigation", { name: "Main navigation" });
    for (const [name, href] of [
      ["AudioBits", "/"],
      ["Catalog", "/catalog"],
      ["Docs", "/docs"],
      ["GitHub", "https://github.com/joacod/audiobits"],
      ["npm", "https://www.npmjs.com/package/audiobits"],
    ]) {
      const link = nav.getByRole("link", { name, exact: true });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", href);
      const box = (await link.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      if (name === "GitHub" || name === "npm") {
        expect(box.width).toBeGreaterThanOrEqual(44);
        await expect(link.locator("svg")).toHaveAttribute(
          "aria-hidden",
          "true",
        );
      }
    }
    await expect(nav.getByRole("link")).toHaveCount(5);
    await expect(
      page.getByRole("link", { name: "Open thruster source" }),
    ).toHaveAttribute("href", "/catalog/reactive-thruster");
    await expect(
      page.locator(".landing-experience").filter({ hasText: "Energy Charge" }),
    ).toHaveAttribute("href", "/catalog/energy-charge");
    await expect(page.locator(".landing-experience")).toHaveCount(1);
    await expect(page.locator(".landing h2")).toHaveText([
      "Hear it. Own it.",
      "Let your AI agent build the sound.",
      "Explore more",
    ]);
    await expect(page.locator(".landing-command pre")).toHaveCount(2);
    for (const command of await page.locator(".landing-command-row").all()) {
      const bounds = (await command.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      expect(
        await command.evaluate((node) => node.scrollWidth <= node.clientWidth),
      ).toBe(true);
      const copy = command.getByRole("button");
      await copy.focus();
      expect(
        await copy.evaluate((node) => getComputedStyle(node).outlineStyle),
      ).toBe("solid");
      expect((await copy.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await page.screenshot({ path: testInfo.outputPath(`hero-${width}.png`) });
    await page.screenshot({
      path: testInfo.outputPath(`landing-${width}.png`),
      fullPage: true,
    });
    const previews = page.locator(".landing-sound-entry");
    const structures: string[] = [];
    for (const [kind, family, shape, count] of [
      ["impact", "pulse", "ellipse", 4],
      ["glass-notification", "harmonic", "path", 4],
      ["whoosh", "flow", "path", 6],
    ] as const) {
      const entry = previews
        .filter({ has: page.locator(`svg.preview-${family}`) })
        .first();
      await expect(entry).toHaveAttribute("href", `/catalog/${kind}`);
      const svg = entry.locator(`svg.preview-${family}`);
      await expect(svg).toHaveAttribute("aria-hidden", "true");
      await expect(svg.locator(shape)).toHaveCount(count);
      structures.push(await svg.innerHTML());
      await entry.click();
      await expect(page).toHaveURL(`${home}/catalog/${kind}`);
      await expect(page.locator(".catalog-bench")).toBeVisible();
      await page.goto(home);
    }
    expect(new Set(structures).size).toBe(3);
    await page
      .getByRole("link", { name: "Explore the full catalog", exact: true })
      .click();
    await expect(page).toHaveURL(`${home}/catalog`);
    await expect(page.locator("[data-catalog-entry]")).toHaveCount(10);
    await expect(page.locator("article.sound-card")).toHaveCount(0);
  });
}

test("landing install commands copy exactly and documentation destinations resolve", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(home);
  for (const [label, command] of [
    [
      "thruster install",
      "npx shadcn@latest add joacod/audiobits/reactive-thruster",
    ],
    ["Skill install", "npx skills add joacod/audiobits --skill audiobits"],
  ]) {
    const copy = page.getByRole("button", { name: `Copy ${label} command` });
    await expect(copy).toBeEnabled();
    await copy.focus();
    await page.keyboard.press("Enter");
    await expect(
      page
        .locator(".landing-command")
        .filter({ has: copy })
        .getByRole("status"),
    ).toHaveText("Copied.");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      command,
    );
  }
  for (const [name, href, heading] of [
    ["Install editable source", "/docs/catalog", "Catalog and editable source"],
    ["Build with the runtime", "/docs", "Introduction and quick start"],
    [
      "Build with AI agents",
      "/docs/agents",
      "Official Skill and agent workflows",
    ],
    ["optional local MCP tooling", "/docs/mcp", "Optional local MCP tooling"],
  ]) {
    const link = page.getByRole("link", { name, exact: true });
    await expect(link).toHaveAttribute("href", href);
    await link.click();
    await expect(page).toHaveURL(`${home}${href}`);
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
    await page.goto(home);
  }
  for (const [name, href] of [
    ["npm", "https://www.npmjs.com/package/audiobits"],
    ["GitHub", "https://github.com/joacod/audiobits"],
    ["Catalog", "/catalog"],
    ["Docs", "/docs"],
  ]) {
    await expect(
      page.locator(".landing-footer").getByRole("link", { name, exact: true }),
    ).toHaveAttribute("href", href);
  }
});

test("landing copy failure keeps the command available for manual copying", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.clipboard, "writeText", {
      value: async () => {
        throw new Error("Clipboard unavailable");
      },
    });
  });
  await page.setViewportSize({ width: 320, height: 667 });
  await page.goto(home);
  for (const command of await page.locator(".landing-command").all()) {
    const copy = command.getByRole("button");
    await expect(copy).toBeEnabled();
    await copy.click();
    await expect(command.getByRole("status")).toHaveText(
      "Copy unavailable. Select and copy the command above.",
    );
    await expect(command.locator("code")).toBeVisible();
    await expect(copy).toBeEnabled();
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("landing stays silent until dragging, measures real output and disposes on navigation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (cause) => errors.push(cause.message));
  await instrument(page, "normal", "/");
  expect((await probe(page)).contexts).toEqual([]);
  await dragThruster(page);
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Thruster: running",
  );
  for (const selector of [
    ".thruster-signal canvas",
    ".thruster-ribbons canvas",
  ]) {
    await expect
      .poll(async () =>
        Number(await page.locator(selector).getAttribute("data-peak")),
      )
      .toBeGreaterThan(0);
  }
  await page.mouse.up();
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Thruster: stopped",
  );
  await expect
    .poll(async () => {
      const p = await probe(page);
      return p.ended === p.sources;
    })
    .toBe(true);
  await expect(page.locator(".thruster-signal canvas")).toHaveAttribute(
    "data-peak",
    "0",
  );
  await dragThruster(page);
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Docs", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("http://127.0.0.1:3100/docs");
  await expect
    .poll(async () => (await probe(page)).contexts)
    .toEqual(["closed"]);
  await expect.poll(async () => (await probe(page)).connected).toBe(0);
  expect(errors).toEqual([]);
});

test("landing pointer acceleration, release, touch cancellation and interruptions clean up", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await instrument(page, "normal", "/");
  const pad = page.getByRole("group", { name: "Drag to fly" });
  const box = (await pad.boundingBox())!;
  await page.mouse.move(box.x + 30, box.y + 80);
  await page.mouse.down();
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Thruster: running",
  );
  await page.mouse.move(box.x + box.width - 30, box.y + 130, { steps: 8 });
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
  await pad.dispatchEvent("pointercancel", { pointerId: 99 });
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Thruster: running",
  );
  await page.mouse.up();
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Thruster: stopped",
  );
  await expect.poll(async () => (await probe(page)).ended).toBe(3);
  const touch = await page.context().newCDPSession(page);
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: box.x + 50, y: box.y + 80 }],
  });
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Thruster: running",
  );
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: box.x + box.width - 40, y: box.y + 140 }],
  });
  await expect(page.locator(".flight-craft")).not.toHaveAttribute(
    "style",
    /left: 50%/,
  );
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Thruster: stopped",
  );
  await touch.detach();
  await dragThruster(page);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Thruster: stopped",
  );
  await expect
    .poll(async () => {
      const p = await probe(page);
      return p.ended === p.sources;
    })
    .toBe(true);
  await page.mouse.up();
  await dragThruster(page);
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Thruster: running",
  );
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Thruster: stopped",
  );
  await expect
    .poll(async () => (await probe(page)).contexts)
    .toEqual(["suspended"]);
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  await expect
    .poll(async () => (await probe(page)).contexts)
    .toEqual(["closed"]);
  await expect.poll(async () => (await probe(page)).connected).toBe(0);
});

test("landing activation failure recovers with a fresh gesture", async ({
  page,
}) => {
  await instrument(page, "failed", "/");
  const pad = page.getByRole("group", { name: "Drag to fly" });
  await expect(pad.locator(".thruster-ribbons")).toHaveAttribute(
    "data-renderer",
    /webgl|canvas|unavailable/,
  );
  const box = (await pad.boundingBox())!;
  await page.mouse.move(box.x + 40, box.y + 80);
  await page.mouse.down();
  await expect(page.locator(".thruster-hero [role=alert]")).toContainText(
    "Drag again to retry",
  );
  expect((await probe(page)).sources).toBe(0);
  await page.mouse.up();
  await dragThruster(page);
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Thruster: running",
  );
  await expect(page.locator(".thruster-hero [role=alert]")).toHaveCount(0);
  await page.mouse.up();
});

test("a pending homepage start cannot outlive pointer release", async ({
  page,
}) => {
  await instrument(page, "held", "/");
  await dragThruster(page);
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Thruster: starting",
  );
  await page.mouse.up();
  await page.evaluate(() =>
    (
      globalThis as unknown as { thrusterProbe: { releaseActivation(): void } }
    ).thrusterProbe.releaseActivation(),
  );
  await expect
    .poll(async () => (await probe(page)).contexts)
    .toEqual(["running"]);
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Thruster: stopped",
  );
  expect((await probe(page)).sources).toBe(0);
});

test("reduced motion preserves gesture feedback, level feedback and navigation focus", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await instrument(page, "normal", "/");
  expect((await probe(page)).contexts).toEqual([]);
  await dragThruster(page);
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Thruster: running",
  );
  await expect(page.locator(".thruster-ribbons")).toHaveAttribute(
    "data-renderer",
    "canvas",
  );
  await expect(page.locator(".thruster-signal canvas")).toHaveAttribute(
    "data-peak",
    "0",
  );
  await expect
    .poll(() =>
      page
        .locator(".thruster-signal figure")
        .evaluate((node) =>
          Number((node as HTMLElement).style.getPropertyValue("--level")),
        ),
    )
    .toBeGreaterThan(0);
  await page.mouse.up();
  await expect(page.getByTestId("landing-playback-state")).toHaveText(
    "Thruster: stopped",
  );
  for (const name of ["GitHub", "npm"]) {
    const link = page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name, exact: true });
    await link.focus();
    expect(
      await link.evaluate((node) => getComputedStyle(node).outlineStyle),
    ).toBe("solid");
  }
});

test("external links use new tabs and internal navigation stays in this tab", async ({
  page,
  context,
}) => {
  for (const route of [
    "/",
    "/catalog",
    "/catalog/impact",
    "/catalog/reactive-thruster",
    "/catalog/energy-charge",
    "/docs",
    "/docs/catalog",
    "/docs/agents",
    "/docs/mcp",
  ]) {
    await page.goto(`${home}${route}`);
    if (route.includes("reactive-thruster") || route.includes("energy-charge"))
      await page
        .getByRole("tab", { name: "Complete interaction", exact: true })
        .click();
    for (const link of await page.locator('a[href^="https://"]').all()) {
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", /noopener/);
      await expect(link).toHaveAttribute("rel", /noreferrer/);
    }
    for (const link of await page.locator('a[href^="/"]').all())
      expect(await link.getAttribute("target")).not.toBe("_blank");
  }
  // Stub only the remote response; Chromium must still create a real new tab.
  await context.route("https://github.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<h1>External destination</h1>",
    }),
  );
  await page.goto(home);
  const popupPromise = page.waitForEvent("popup");
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "GitHub", exact: true })
    .click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL("https://github.com/joacod/audiobits");
  expect(await popup.evaluate(() => window.opener)).toBeNull();
  await expect(page).toHaveURL(`${home}/`);
  await popup.close();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Catalog", exact: true })
    .click();
  await expect(page).toHaveURL(`${home}/catalog`);
  expect(context.pages()).toHaveLength(1);
});

for (const route of ["/", "/catalog/confirmation"]) {
  test(`installation copying waits for hydration on ${route}`, async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    let release!: () => void;
    const hydration = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/_next/static/**/*.js", async (request) => {
      await hydration;
      await request.continue();
    });
    await page.goto(`${home}${route}`, { waitUntil: "commit" });
    const copy = page.getByRole("button", {
      name:
        route === "/"
          ? "Copy thruster install command"
          : "Copy Confirmation command",
      exact: true,
    });
    try {
      await expect(copy).toBeDisabled();
    } finally {
      release();
    }
    await expect(copy).toBeEnabled();
    await copy.focus();
    await page.keyboard.press("Enter");
    await expect(
      page
        .locator(".landing-command")
        .filter({ has: copy })
        .getByRole("status"),
    ).toHaveText("Copied.");
  });
}
