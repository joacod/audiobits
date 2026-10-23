import { expect, test } from "@playwright/test";

const site = "http://127.0.0.1:3100";

test("mobile docs menu switches sections, follows article links and preserves anchors @required", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${site}/docs`);
  const open = page
    .locator("#nd-subnav")
    .getByRole("button", { name: "Open Sidebar", exact: true });
  const sidebar = page.locator("#nd-sidebar-mobile");
  await open.click();
  await expect(sidebar).toBeVisible();
  await sidebar
    .getByRole("button", { name: "Getting Started", exact: false })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "AI Agents", exact: false })
    .click();
  await expect(page).toHaveURL(`${site}/docs/agents`);
  await expect(sidebar.locator('a[data-active="true"]')).toHaveAttribute(
    "href",
    "/docs/agents",
  );
  await sidebar.locator('a[data-active][href="/docs/mcp"]').click();
  await expect(page).toHaveURL(`${site}/docs/mcp`);
  await open.click();
  await expect(sidebar.locator('a[data-active="true"]')).toHaveAttribute(
    "href",
    "/docs/mcp",
  );
  await sidebar.getByRole("button", { name: "Close Sidebar" }).click();
  await expect(sidebar).not.toBeVisible();
  await page
    .locator('#nd-page > div:last-child a[href="/docs/agents"]')
    .click();
  await expect(page).toHaveURL(`${site}/docs/agents`);
  await page.locator('.prose a[href="/docs/catalog"]').click();
  await expect(page).toHaveURL(`${site}/docs/catalog`);
  await page.locator('.prose a[href="/docs#install-the-runtime"]').click();
  await expect(page).toHaveURL(`${site}/docs#install-the-runtime`);
  await expect(page.locator("#install-the-runtime")).toBeInViewport();
});
