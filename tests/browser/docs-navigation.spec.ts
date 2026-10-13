import { expect, test, type Locator, type Page } from "@playwright/test";

const site = "http://127.0.0.1:3100";
const sections = [
  {
    title: "Getting Started",
    pages: [{ path: "/docs", title: "Introduction and quick start" }],
  },
  {
    title: "Catalog & Editable Source",
    pages: [{ path: "/docs/catalog", title: "Catalog and editable source" }],
  },
  {
    title: "AI Agents",
    pages: [
      { path: "/docs/agents", title: "Official Skill and agent workflows" },
      { path: "/docs/mcp", title: "Optional local MCP tooling" },
    ],
  },
  {
    title: "Runtime Reference",
    pages: [
      { path: "/docs/recipes", title: "Recipes" },
      { path: "/docs/api", title: "API reference" },
      { path: "/docs/parameters", title: "Parameters" },
      { path: "/docs/lifecycle", title: "Playback and lifecycle" },
      { path: "/docs/buses", title: "Buses and routing" },
      { path: "/docs/native", title: "Native interop" },
    ],
  },
];

async function expectSection(
  sidebar: Locator,
  section: (typeof sections)[number],
  path: string,
) {
  await expect(
    sidebar.getByRole("button", { name: section.title, exact: false }),
  ).toBeVisible();
  // These are the generated page-tree links, excluding the brand and dropdown.
  await expect(sidebar.locator("a[data-active]")).toHaveText(
    section.pages.map((page) => page.title),
  );
  expect(
    await sidebar
      .locator("a[data-active]")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href"))),
  ).toEqual(section.pages.map((page) => page.path));
  await expect(sidebar.locator('a[data-active="true"]')).toHaveCount(1);
  await expect(sidebar.locator('a[data-active="true"]')).toHaveAttribute(
    "href",
    path,
  );
}

async function openSidebar(page: Page, mobile: boolean) {
  if (mobile) {
    await page
      .locator("#nd-subnav")
      .getByRole("button", { name: "Open Sidebar", exact: true })
      .click();
  }
  const sidebar = page.locator(mobile ? "#nd-sidebar-mobile" : "#nd-sidebar");
  await expect(sidebar).toBeVisible();
  return sidebar;
}

for (const mobile of [false, true]) {
  test.describe(
    mobile ? "mobile docs sections" : "desktop docs sections",
    () => {
      test.use({
        viewport: mobile
          ? { width: 390, height: 844 }
          : { width: 1280, height: 900 },
      });

      for (const section of sections) {
        test(`direct loads select ${section.title} and preserve page order`, async ({
          page,
          request,
        }) => {
          for (const [index, doc] of section.pages.entries()) {
            const response = await page.goto(`${site}${doc.path}`);
            expect(response?.status()).toBe(200);
            expect(response?.request().redirectedFrom()).toBeNull();
            await expect(page.getByRole("heading", { level: 1 })).toHaveText(
              doc.title,
            );
            const footer = page.locator("#nd-page > div:last-child");
            const neighbours = section.pages.filter(
              (_, position) => position === index - 1 || position === index + 1,
            );
            await expect(footer.getByRole("link")).toHaveCount(
              neighbours.length,
            );
            expect(
              await footer
                .getByRole("link")
                .evaluateAll((links) =>
                  links.map((link) => link.getAttribute("href")),
                ),
            ).toEqual(neighbours.map((neighbour) => neighbour.path));
            await expectSection(
              await openSidebar(page, mobile),
              section,
              doc.path,
            );

            const search = await request.get(`${site}/api/search`, {
              params: { query: doc.title },
            });
            expect(search.status()).toBe(200);
            expect(await search.json()).toEqual(
              expect.arrayContaining([
                expect.objectContaining({ type: "page", url: doc.path }),
              ]),
            );
          }
        });
      }

      test("native selector switches all four sections and returns to the homepage", async ({
        page,
      }) => {
        await page.goto(`${site}/docs`);
        const sidebar = await openSidebar(page, mobile);
        let current = sections[0];
        for (const section of [...sections.slice(1), sections[0]]) {
          const trigger = sidebar.getByRole("button", {
            name: current.title,
            exact: false,
          });
          await trigger.click();
          const dropdown = page.getByRole("dialog").filter({ visible: true });
          await expect(dropdown.getByRole("link")).toHaveCount(4);
          for (const option of sections) {
            await expect(
              dropdown.getByRole("link", { name: option.title, exact: false }),
            ).toHaveAttribute("href", option.pages[0].path);
          }
          await dropdown
            .getByRole("link", { name: section.title, exact: false })
            .click();
          await expect(page).toHaveURL(`${site}${section.pages[0].path}`);
          await expect(dropdown).not.toBeVisible();
          await expectSection(sidebar, section, section.pages[0].path);
          current = section;
        }

        // Same-section navigation keeps the selector active on a non-landing page.
        await sidebar
          .getByRole("button", { name: current.title, exact: false })
          .click();
        await page
          .getByRole("dialog")
          .getByRole("link", { name: "AI Agents", exact: false })
          .click();
        await sidebar.locator('a[data-active][href="/docs/mcp"]').click();
        await expect(page).toHaveURL(`${site}/docs/mcp`);
        const agentsSidebar = await openSidebar(page, mobile);
        await expectSection(agentsSidebar, sections[2], "/docs/mcp");
        if (mobile)
          await agentsSidebar
            .getByRole("button", { name: "Close Sidebar" })
            .click();
        await page
          .locator('#nd-page > div:last-child a[href="/docs/agents"]')
          .click();
        await expect(page).toHaveURL(`${site}/docs/agents`);
        await expectSection(
          await openSidebar(page, mobile),
          sections[2],
          "/docs/agents",
        );
      });

      test("article links cross sections and preserve the quick-start anchor", async ({
        page,
      }) => {
        await page.goto(`${site}/docs/agents`);
        await page.locator('.prose a[href="/docs/catalog"]').click();
        await expect(page).toHaveURL(`${site}/docs/catalog`);
        const sidebar = await openSidebar(page, mobile);
        await expectSection(sidebar, sections[1], "/docs/catalog");
        if (mobile)
          await sidebar.getByRole("button", { name: "Close Sidebar" }).click();
        await page
          .locator('.prose a[href="/docs#install-the-runtime"]')
          .click();
        await expect(page).toHaveURL(`${site}/docs#install-the-runtime`);
        await expect(page.locator("#install-the-runtime")).toBeInViewport();
        await expectSection(
          await openSidebar(page, mobile),
          sections[0],
          "/docs",
        );
      });
    },
  );
}
