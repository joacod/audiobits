import { expect, test } from "@playwright/test";
import { instrument, probe, dragThruster } from "./experience-probe";

const home = "http://127.0.0.1:3100";

for (const route of ["/catalog/energy-charge"]) {
  test(`charge keyboard repeats preserve the hold without page scrolling on ${route}`, async ({
    page,
  }) => {
    await page.goto(`${home}${route}`);
    const hold = page.getByRole("button", {
      name: "Hold to charge",
      exact: true,
    });
    await expect(hold).toBeEnabled();
    await hold.focus();
    await page.keyboard.down("Space");
    await expect(hold).toHaveAttribute("data-state", "running");
    // A held key repeats keydown before keyup. Every repeat must suppress the
    // browser's scroll action, without restarting the charge.
    expect(
      await hold.evaluate((button) =>
        button.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: " ",
            repeat: true,
            bubbles: true,
            cancelable: true,
          }),
        ),
      ),
    ).toBe(false);
    await expect(hold).toHaveAttribute("data-state", "running");
    await page.keyboard.up("Space");
    await expect(hold).toHaveAttribute("data-state", "stopped");
  });
}

test("homepage pointer movement keeps one voice until capture is lost", async ({
  page,
}) => {
  await instrument(page, "normal", "/");
  await dragThruster(page);
  const state = page.getByTestId("landing-playback-state");
  await expect(state).toHaveText("Thruster: running");
  expect((await probe(page)).sources).toBe(3);
  expect((await probe(page)).contexts).toEqual(["running"]);
  await page.locator(".flight-pad").evaluate((pad) => {
    // Chromium's mouse pointer ID is 1. Exercise actual capture loss.
    pad.releasePointerCapture(1);
  });
  await expect(state).toHaveText("Thruster: stopped");
  await expect.poll(async () => (await probe(page)).ended).toBe(3);
  await page.mouse.up();
});

async function trackGraphics(
  page: import("@playwright/test").Page,
  failShader = false,
  context: "webgl" | "webgl2" = "webgl",
) {
  await page.addInitScript(
    ({ fail, kind }) => {
      const resources = new Set<object>();
      const gl =
        kind === "webgl2"
          ? WebGL2RenderingContext.prototype
          : WebGLRenderingContext.prototype;
      for (const [create, remove] of [
        ["createShader", "deleteShader"],
        ["createProgram", "deleteProgram"],
        ["createBuffer", "deleteBuffer"],
      ] as const) {
        const make = gl[create];
        const drop = gl[remove];
        Object.defineProperty(gl, create, {
          value: function (this: WebGLRenderingContext, ...args: unknown[]) {
            const resource = Reflect.apply(make, this, args);
            if (resource) resources.add(resource);
            return resource;
          },
        });
        Object.defineProperty(gl, remove, {
          value: function (this: WebGLRenderingContext, resource: object) {
            resources.delete(resource);
            return Reflect.apply(drop, this, [resource]);
          },
        });
      }
      if (fail) {
        const read = gl.getShaderParameter;
        gl.getShaderParameter = function (shader, parameter) {
          return parameter === this.COMPILE_STATUS
            ? false
            : read.call(this, shader, parameter);
        };
      }
      Object.assign(globalThis, { graphicsResources: resources });
    },
    { fail: failShader, kind: context },
  );
}

const resourceCount = (page: import("@playwright/test").Page) =>
  page.evaluate(
    () =>
      (globalThis as unknown as { graphicsResources: Set<object> })
        .graphicsResources.size,
  );

test("charge graphics release resources on fallback and navigation", async ({
  page,
}) => {
  await trackGraphics(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${home}/catalog/energy-charge`);
  const rings = page.locator(".charge-rings");
  await expect(rings).toHaveAttribute("data-renderer", "webgl");
  for (let pass = 0; pass < 2; pass++) {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(rings).toHaveAttribute("data-renderer", "css");
    expect(await resourceCount(page)).toBe(0);
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(rings).toHaveAttribute("data-renderer", "webgl");
    // Linked shaders can be deleted; only the program and buffer stay owned.
    expect(await resourceCount(page)).toBe(2);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(rings).toHaveAttribute("data-renderer", "css");
  expect(await resourceCount(page)).toBe(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(rings).toHaveAttribute("data-renderer", "webgl");
  await page.getByRole("link", { name: "Docs", exact: true }).click();
  await expect(page).toHaveURL(`${home}/docs`);
  await expect.poll(() => resourceCount(page)).toBe(0);
});

test("charge shader failure preserves holding without leaking resources", async ({
  page,
}) => {
  await trackGraphics(page, true);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${home}/catalog/energy-charge`);
  const start = page.getByRole("button", {
    name: "Hold to charge",
    exact: true,
  });
  await expect(start).toBeEnabled();
  await expect(page.locator(".charge-rings")).toHaveAttribute(
    "data-renderer",
    "css",
  );
  await start.focus();
  await page.keyboard.down("Space");
  await expect(page.locator(".energy-state")).toHaveText("Charge: running");
  await expect(start).toHaveAttribute("data-full", "true");
  await page.keyboard.up("Space");
  await expect(page.locator(".energy-state")).toHaveText("Charge: stopped");
  expect(await resourceCount(page)).toBe(0);
});

test("thruster shader failure preserves dragging and releases allocations", async ({
  page,
}) => {
  await trackGraphics(page, true, "webgl2");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${home}/catalog/reactive-thruster`);
  await expect(page.locator(".thruster-ribbons")).toHaveAttribute(
    "data-renderer",
    "unavailable",
  );
  await dragThruster(page);
  await expect(page.locator(".flight-state")).toHaveText("Thruster: running");
  await page.mouse.up();
  await expect(page.locator(".flight-state")).toHaveText("Thruster: stopped");
  expect(await resourceCount(page)).toBe(0);
});
