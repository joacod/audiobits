import { expect, test } from "@playwright/test";

const site = "http://127.0.0.1:3100";
const queries = [
  { query: "recipe", path: "/docs/recipes", title: "Recipes" },
  {
    query: "lifecycle",
    path: "/docs/lifecycle",
    title: "Playback and lifecycle",
  },
  { query: "MCP", path: "/docs/mcp", title: "Optional local MCP tooling" },
  { query: "bus", path: "/docs/buses", title: "Buses and routing" },
];

test("search indexes onboarding component prose and procedure anchors", async ({
  request,
}) => {
  for (const { query, type, url } of [
    {
      query: "ready-made",
      type: "text",
      url: "/docs#choose-a-starting-point",
    },
    {
      query: "Discover and inspect an item",
      type: "heading",
      url: "/docs/catalog#discover-and-inspect-an-item",
    },
    {
      query: "Choose your agent and scope",
      type: "heading",
      url: "/docs/agents#choose-your-agent-and-scope",
    },
    {
      query: "Resolve the local launch command",
      type: "heading",
      url: "/docs/mcp#resolve-the-local-launch-command",
    },
    {
      query: "Recipes and experiences become source",
      type: "text",
      url: "/docs/catalog#files-you-own",
    },
  ]) {
    const response = await request.get(`${site}/api/search`, {
      params: { query },
    });
    expect(response.status()).toBe(200);
    const results = await response.json();
    expect(results).toEqual(
      expect.arrayContaining([expect.objectContaining({ type, url })]),
    );
    for (const result of results) {
      expect(result.content).not.toMatch(
        /<\/?(?:Card|File|Folder|Step|Callout)\b/,
      );
    }
  }
});

for (const { query, path, title } of queries) {
  test(`search endpoint returns relevant documentation for ${query}`, async ({
    request,
  }) => {
    const response = await request.get(`${site}/api/search`, {
      params: { query },
    });
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/json");
    expect(await response.json()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "page", url: path }),
      ]),
    );
  });

  test(`visible search opens the correct page for ${query}`, async ({
    page,
  }) => {
    await page.goto(`${site}/docs`);
    await page
      .getByRole("button", { name: /^Search/ })
      .filter({ visible: true })
      .first()
      .click();
    const dialog = page.getByRole("dialog", { name: "Search", exact: true });
    await expect(dialog).toBeVisible();
    const input = dialog.getByRole("combobox", { name: "Search", exact: true });
    await expect(input).toBeFocused();
    await input.fill(query);
    // Page options include breadcrumbs in their accessible names.
    await dialog
      .getByRole("option")
      .filter({ has: page.getByText(title, { exact: true }) })
      .click();
    await expect(page).toHaveURL(`${site}${path}`);
    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
  });
}

test("search indexes MDX body content and headings with working anchors", async ({
  request,
  page,
}) => {
  const body = await request.get(`${site}/api/search`, {
    params: { query: "recursively" },
  });
  expect(body.status()).toBe(200);
  expect(await body.json()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        type: "text",
        url: "/docs/buses#ownership",
        content: expect.stringMatching(/recursively/),
      }),
    ]),
  );

  const headings = await request.get(`${site}/api/search`, {
    params: { query: "Stop and disposal" },
  });
  expect(headings.status()).toBe(200);
  expect(await headings.json()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        type: "heading",
        url: "/docs/lifecycle#stop-and-disposal",
      }),
    ]),
  );

  await page.goto(`${site}/docs`);
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: "Search", exact: true });
  await dialog.getByRole("combobox").fill("Stop and disposal");
  await dialog
    .getByRole("option", { name: "Stop and disposal", exact: true })
    .click();
  await expect(page).toHaveURL(`${site}/docs/lifecycle#stop-and-disposal`);
  await expect(dialog).not.toBeVisible();
  const heading = page.locator("#stop-and-disposal");
  await expect(
    heading.getByRole("link", { name: "Stop and disposal", exact: true }),
  ).toHaveAttribute("href", "#stop-and-disposal");
  await expect(heading).toBeInViewport();
});

for (const shortcut of ["Meta+k", "Control+k"]) {
  test(`${shortcut} opens the existing search dialog`, async ({ page }) => {
    await page.goto(`${site}/docs`);
    await page.keyboard.press(shortcut);
    const dialog = page.getByRole("dialog", { name: "Search", exact: true });
    await expect(dialog).toBeVisible();
    const input = dialog.getByRole("combobox", { name: "Search", exact: true });
    await expect(input).toBeFocused();
    await input.fill("lifecycle");
    await expect(
      dialog.getByRole("option").filter({
        has: page.getByText("Playback and lifecycle", { exact: true }),
      }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });
}

test("empty and unmatched queries return empty results and the dialog recovers", async ({
  request,
  page,
}) => {
  const unmatched = "zzzxqvnonexistentdocumentation";
  for (const params of [{}, { query: "" }, { query: unmatched }]) {
    const response = await request.get(`${site}/api/search`, { params });
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual([]);
  }

  await page.goto(`${site}/docs`);
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: "Search", exact: true });
  const input = dialog.getByRole("combobox", { name: "Search", exact: true });
  await expect(input).toHaveValue("");
  await expect(dialog.getByRole("option")).toHaveCount(0);
  await expect(dialog.getByRole("status")).toHaveCount(0);
  await input.fill(unmatched);
  await expect(dialog.getByRole("status")).toHaveText("No results found");
  await expect(dialog.getByRole("option")).toHaveCount(0);
  await input.fill("lifecycle");
  await expect(
    dialog.getByRole("option").filter({
      has: page.getByText("Playback and lifecycle", { exact: true }),
    }),
  ).toBeVisible();
  await input.fill("");
  await expect(dialog.getByRole("option")).toHaveCount(0);
  await expect(dialog.getByRole("status")).toHaveCount(0);
  await expect(input).toBeFocused();
});

for (const mobile of [false, true]) {
  test(`search remains global after section switching on ${mobile ? "mobile" : "desktop"}`, async ({
    page,
  }) => {
    await page.setViewportSize(
      mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
    );
    await page.goto(`${site}/docs`);
    if (mobile)
      await page
        .locator("#nd-subnav")
        .getByRole("button", { name: "Open Sidebar", exact: true })
        .click();
    const sidebar = page.locator(mobile ? "#nd-sidebar-mobile" : "#nd-sidebar");
    await sidebar
      .getByRole("button", { name: "Getting Started", exact: false })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("link", { name: "AI Agents", exact: false })
      .click();
    await expect(page).toHaveURL(`${site}/docs/agents`);
    if (mobile)
      await sidebar.getByRole("button", { name: "Close Sidebar" }).click();
    // The compact trigger is "Open Search"; the wide trigger starts with "Search".
    await page
      .getByRole("button", { name: /Search/ })
      .filter({ visible: true })
      .first()
      .click();
    const dialog = page.getByRole("dialog", { name: "Search", exact: true });
    await dialog.getByRole("combobox").fill("bus");
    await dialog
      .getByRole("option")
      .filter({ has: page.getByText("Buses and routing", { exact: true }) })
      .click();
    await expect(page).toHaveURL(`${site}/docs/buses`);
    await expect(dialog).not.toBeVisible();
    if (mobile)
      await page
        .locator("#nd-subnav")
        .getByRole("button", { name: "Open Sidebar", exact: true })
        .click();
    await expect(
      sidebar.getByRole("button", { name: "Runtime Reference", exact: false }),
    ).toBeVisible();
    await expect(sidebar.locator('a[data-active="true"]')).toHaveAttribute(
      "href",
      "/docs/buses",
    );
  });
}
