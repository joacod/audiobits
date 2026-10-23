import { expect, test } from "@playwright/test";

const site = "http://127.0.0.1:3100";

test("search indexes MDX body content and headings with working anchors @required", async ({
  request,
  page,
}) => {
  const body = await request.get(`${site}/api/search`, {
    params: { query: "ready-made" },
  });
  expect(body.status()).toBe(200);
  expect(await body.json()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        type: "text",
        url: "/docs#choose-a-starting-point",
        content: expect.stringMatching(/ready-made/),
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
