import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { build } from "esbuild";
import { instrument, probe } from "./experience-probe";
import { requireOfflineCheckpoints } from "./offline-capabilities";

const stage = (page: import("@playwright/test").Page) =>
  page.getByRole("group", { name: "Lightsaber stage", exact: true });

test("held pointer ignition, swept target hits, release retraction and teardown", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (cause) => errors.push(cause.message));
  await instrument(page, "normal", "lightsaber");
  await expect(
    page.getByRole("button", { name: "Ignite", exact: true }),
  ).toBeEnabled();
  expect((await probe(page)).contexts).toEqual([]);
  const pad = stage(page);
  await expect(pad).toHaveAttribute("data-renderer", "three");
  await pad.scrollIntoViewIfNeeded();
  const box = (await pad.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.8);
  await page.mouse.down();
  await expect(pad).toHaveAttribute("data-state", "running");
  await expect(pad).toHaveAttribute("data-extension", "1.000");
  await expect
    .poll(async () => Number(await pad.getAttribute("data-peak")))
    .toBeGreaterThan(0);
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.7, {
    steps: 8,
  });
  await expect
    .poll(async () => Number(await pad.getAttribute("data-motion")))
    .toBeGreaterThan(0.1);
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.7, {
    steps: 8,
  });
  await expect
    .poll(async () => Number(await pad.getAttribute("data-hits")))
    .toBeGreaterThan(0);
  await page.mouse.up();
  await expect(pad).toHaveAttribute("data-state", "stopped");
  await expect(pad).toHaveAttribute("data-extension", "0.000");
  await expect
    .poll(async () => {
      const p = await probe(page);
      return p.sources === p.ended;
    })
    .toBe(true);
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.6);
  await expect(pad).toHaveAttribute("data-state", "stopped");
  await expect(pad).toHaveAttribute("data-extension", "0.000");
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Catalog", exact: true })
    .click();
  await expect
    .poll(async () => (await probe(page)).contexts)
    .toEqual(["closed"]);
  expect((await probe(page)).connected).toBe(0);
  expect(errors).toEqual([]);
});

test("button ignition, mute, unmute and retraction", async ({ page }) => {
  await instrument(page, "normal", "lightsaber");
  const pad = stage(page);
  await page.getByRole("button", { name: "Ignite", exact: true }).click();
  await expect(pad).toHaveAttribute("data-state", "running");
  await expect
    .poll(async () => Number(await pad.getAttribute("data-peak")))
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "Mute", exact: true }).click();
  await expect
    .poll(async () => Number(await pad.getAttribute("data-peak")))
    .toBe(0);
  await page.getByRole("button", { name: "Unmute", exact: true }).click();
  await expect
    .poll(async () => Number(await pad.getAttribute("data-peak")))
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "Retract", exact: true }).click();
  await expect(pad).toHaveAttribute("data-state", "stopped");
  await expect(pad).toHaveAttribute("data-extension", "0.000");
  await expect
    .poll(async () => {
      const p = await probe(page);
      return p.sources === p.ended;
    })
    .toBe(true);
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  await expect
    .poll(async () => (await probe(page)).contexts)
    .toEqual(["closed"]);
  expect((await probe(page)).connected).toBe(0);
});

test("repeated ignition and Stop bound voices and dispose on navigation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (cause) => errors.push(cause.message));
  await instrument(page, "normal", "lightsaber");
  const pad = stage(page);
  for (let i = 0; i < 5; i++) {
    await page.getByRole("button", { name: "Ignite", exact: true }).click();
    await expect(pad).toHaveAttribute("data-state", "running");
    expect(
      (await probe(page)).sources - (await probe(page)).ended,
    ).toBeLessThanOrEqual(26);
    await page.getByRole("button", { name: "Stop all", exact: true }).click();
  }
  await expect
    .poll(async () => {
      const p = await probe(page);
      return p.sources === p.ended;
    })
    .toBe(true);
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Catalog", exact: true })
    .click();
  await expect
    .poll(async () => (await probe(page)).contexts)
    .toEqual(["closed"]);
  expect((await probe(page)).connected).toBe(0);
  expect(errors).toEqual([]);
});

for (const mode of ["held", "failed"] as const)
  test(`${mode} activation remains cancelled or exposes retry`, async ({
    page,
  }) => {
    if (mode === "held") await trackBladeGraphics(page);
    await instrument(page, mode, "lightsaber");
    const pad = stage(page);
    await expect(
      page.getByRole("button", { name: "Ignite", exact: true }),
    ).toBeEnabled();
    if (mode === "held") {
      await pad.scrollIntoViewIfNeeded();
      const box = (await pad.boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.8);
      await page.mouse.down();
      await expect(pad).toHaveAttribute("data-state", "starting");
      // Pending activation has no blade to animate. Slow graphics must not
      // consume the engine's activation deadline before input can be released.
      const pendingDraws = await page.evaluate(async () => {
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
        return (globalThis as unknown as { bladeDraws(): number }).bladeDraws();
      });
      expect(
        await page.evaluate(async () => {
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          );
          return (
            globalThis as unknown as { bladeDraws(): number }
          ).bladeDraws();
        }),
      ).toBe(pendingDraws);
      await page.mouse.up();
      await expect(pad).toHaveAttribute("data-state", "stopped");
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
      await expect(pad).toHaveAttribute("data-state", "stopped");
      await expect(pad).toHaveAttribute("data-extension", "0.000");
    } else {
      await page.getByRole("button", { name: "Ignite", exact: true }).click();
      await expect(
        page.locator(".lightsaber-controls [role=alert]"),
      ).toContainText("Tap Ignite to retry");
    }
    expect((await probe(page)).sources).toBe(0);
    await page.getByRole("button", { name: "Ignite", exact: true }).click();
    await expect(pad).toHaveAttribute("data-state", "running");
    await expect(page.locator(".lightsaber-controls [role=alert]")).toHaveCount(
      0,
    );
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        value: true,
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(pad).toHaveAttribute("data-state", "stopped");
    await expect
      .poll(async () => (await probe(page)).contexts)
      .toEqual(["suspended"]);
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        value: false,
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(pad).toHaveAttribute("data-state", "stopped");
    await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
    await expect
      .poll(async () => (await probe(page)).contexts)
      .toEqual(["closed"]);
    expect((await probe(page)).connected).toBe(0);
  });

test("keyboard alternatives, touch release and cancellation, reduced motion, source fidelity and mobile layout", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await instrument(page, "normal", "lightsaber");
  await expect(
    page.getByRole("button", { name: "Ignite", exact: true }),
  ).toBeEnabled();
  const pad = stage(page);
  await pad.focus();
  await page.keyboard.press("Enter");
  await expect(pad).toHaveAttribute("data-state", "running");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Space");
  await expect
    .poll(async () => Number(await pad.getAttribute("data-hits")))
    .toBeGreaterThan(0);
  await expect(pad).toHaveAttribute("data-reduced-motion", "true");
  await page.keyboard.press("Escape");
  await expect(pad).toHaveAttribute("data-state", "stopped");
  await page.getByRole("tab", { name: "Complete interaction" }).click();
  const interaction = page.getByRole("tabpanel", {
    name: "Complete interaction",
  });
  for (const name of [
    "recipe.ts",
    "motion.ts",
    "controller.ts",
    "host.ts",
    "stage.ts",
    "index.html",
  ]) {
    await interaction
      .getByRole("button", { name: `Copy ${name}`, exact: true })
      .click();
    expect(
      await page.evaluate(
        () => (globalThis as unknown as { copiedSource: string }).copiedSource,
      ),
    ).toBe(readFileSync(`catalog/experiences/lightsaber/${name}`, "utf8"));
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await pad.scrollIntoViewIfNeeded();
  const box = (await pad.boundingBox())!;
  const touch = await page.context().newCDPSession(page);
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height * 0.8 }],
  });
  await expect(pad).toHaveAttribute("data-state", "running");
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: box.x + box.width * 0.2, y: box.y + box.height * 0.7 }],
  });
  await expect
    .poll(async () => Number(await pad.getAttribute("data-motion")))
    .toBeGreaterThan(0);
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(pad).toHaveAttribute("data-state", "stopped");
  await expect(pad).toHaveAttribute("data-extension", "0.000");
  await expect
    .poll(async () => {
      const p = await probe(page);
      return p.sources === p.ended;
    })
    .toBe(true);
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height * 0.8 }],
  });
  await expect(pad).toHaveAttribute("data-state", "running");
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
  await expect(pad).toHaveAttribute("data-state", "stopped");
  await expect
    .poll(async () => {
      const p = await probe(page);
      return p.sources === p.ended;
    })
    .toBe(true);
});

test("Chromium native signal: five timbres, control extrema, rapid ramps and eight-voice headroom", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4173");
  await page.addScriptTag({
    path: resolve(
      "node_modules/.cache/audiobits-audio-tests/audio-harness.iife.js",
    ),
  });
  await requireOfflineCheckpoints(page);
  const results = await page.evaluate(async () => {
    const h = globalThis as unknown as {
      lightsaberSignal(
        name: string,
        value: number,
        count?: number,
        update?: boolean,
        rate?: number,
        sweep?: number,
      ): Promise<{
        peak: number;
        energy: number;
        delta: number;
        tail: number;
        onset: number;
        finished: number;
        brightness: number;
        humFrequency: number;
        upperEnergyRatio: number;
      }>;
    };
    const singles = [];
    for (const rate of [44100, 48000])
      for (const name of [
        "lightsaber",
        "bladeIgnition",
        "bladeSwing",
        "bladeClash",
        "bladeRetraction",
      ])
        for (const value of [0, 0.5, 1])
          singles.push(await h.lightsaberSignal(name, value, 1, false, rate));
    return {
      singles,
      moving: await h.lightsaberSignal("lightsaber", 0.2, 1, true),
      directions: await Promise.all(
        [-1, 0, 1].map((sweep) =>
          h.lightsaberSignal("lightsaber", 0.8, 1, false, 48000, sweep),
        ),
      ),
      stacks: await Promise.all(
        [
          "lightsaber",
          "bladeIgnition",
          "bladeSwing",
          "bladeClash",
          "bladeRetraction",
        ].map((name) => h.lightsaberSignal(name, 1, 8)),
      ),
    };
  });
  for (const s of results.singles) {
    expect(s.peak).toBeLessThan(0.5);
    expect(s.energy).toBeGreaterThan(0);
    expect(s.onset).toBe(0);
    expect(s.tail).toBe(0);
    expect(s.finished).toBe(1);
  }
  expect(results.moving.delta).toBeLessThan(0.04);
  expect(results.moving.tail).toBe(0);
  // Keep the sustained field soft even at full motion; bright impact transients
  // have their own headroom checks and are not constrained to this tonal balance.
  for (const offset of [0, 15])
    for (const index of [0, 1, 2])
      expect(results.singles[offset + index].upperEnergyRatio).toBeLessThan(
        0.01,
      );
  const [returning, idlePitch, forward] = results.directions;
  expect(returning.humFrequency).toBeLessThan(idlePitch.humFrequency - 10);
  expect(forward.humFrequency).toBeGreaterThan(idlePitch.humFrequency + 10);
  for (const stack of results.stacks) {
    expect(stack.peak).toBeLessThan(1);
    expect(stack.finished).toBe(8);
  }
  for (const offset of [0, 15]) {
    expect(results.singles[offset + 2].energy).toBeGreaterThan(
      results.singles[offset].energy * 1.5,
    );
    expect(results.singles[offset + 2].brightness).toBeGreaterThan(
      results.singles[offset].brightness,
    );
  }
});

async function trackBladeGraphics(
  page: import("@playwright/test").Page,
  failure?: "context" | "shader",
) {
  await page.addInitScript((failure) => {
    const resources = new Map<object, () => boolean>();
    let draws = 0;
    const gl = WebGL2RenderingContext.prototype;
    for (const name of [
      "Shader",
      "Program",
      "Buffer",
      "Texture",
      "Framebuffer",
      "Renderbuffer",
      "VertexArray",
    ] as const) {
      const create = `create${name}` as keyof WebGL2RenderingContext;
      const remove = `delete${name}` as keyof WebGL2RenderingContext;
      const make = gl[create] as (...args: unknown[]) => object | null;
      const drop = gl[remove] as (...args: unknown[]) => void;
      Object.defineProperty(gl, create, {
        value: function (this: WebGL2RenderingContext, ...args: unknown[]) {
          const resource = Reflect.apply(make, this, args);
          if (resource) {
            const valid = this[`is${name}` as keyof WebGL2RenderingContext] as (
              resource: object,
            ) => boolean;
            resources.set(resource, () => valid.call(this, resource));
          }
          return resource;
        },
      });
      Object.defineProperty(gl, remove, {
        value: function (this: WebGL2RenderingContext, resource: object) {
          resources.delete(resource);
          return Reflect.apply(drop, this, [resource]);
        },
      });
    }
    for (const method of ["drawArrays", "drawElements"] as const) {
      const draw = gl[method];
      Object.defineProperty(gl, method, {
        value: function (this: WebGL2RenderingContext, ...args: unknown[]) {
          draws++;
          return Reflect.apply(draw, this, args);
        },
      });
    }
    if (failure === "context") {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (
        ...args: Parameters<typeof getContext>
      ) {
        if (args[0] === "webgl2") return null;
        return Reflect.apply(getContext, this, args);
      } as typeof getContext;
    }
    if (failure === "shader") {
      const getShaderParameter = gl.getShaderParameter;
      gl.getShaderParameter = function (shader, parameter) {
        return parameter === this.COMPILE_STATUS
          ? false
          : getShaderParameter.call(this, shader, parameter);
      };
      const getProgramParameter = gl.getProgramParameter;
      gl.getProgramParameter = function (program, parameter) {
        return parameter === this.LINK_STATUS
          ? false
          : getProgramParameter.call(this, program, parameter);
      };
    }
    Object.assign(globalThis, {
      bladeGraphics: resources,
      bladeDraws: () => draws,
    });
  }, failure);
}

const bladeResourceCount = (page: import("@playwright/test").Page) =>
  page.evaluate(
    () =>
      // Context loss releases Three's internal default textures without JS delete calls.
      // Ask Chromium which native objects remain valid, including those allocations.
      [
        ...(
          globalThis as unknown as { bladeGraphics: Map<object, () => boolean> }
        ).bladeGraphics.values(),
      ].filter((valid) => valid()).length,
  );

test("development Strict Mode replays effects with a fresh graphics canvas", async ({
  page,
}) => {
  const { outputFiles } = await build({
    stdin: {
      contents: `
        import { StrictMode } from "react";
        import { createRoot } from "react-dom/client";
        import { LightsaberDetail } from "./app/lightsaber-detail";
        const root = createRoot(document.getElementById("strict-root"));
        root.render(<StrictMode><LightsaberDetail /></StrictMode>);
        globalThis.unmountBlade = () => root.unmount();
      `,
      resolveDir: resolve("apps/www"),
      loader: "tsx",
    },
    bundle: true,
    format: "iife",
    platform: "browser",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"development"' },
    loader: { ".css": "empty" },
    write: false,
  });
  const errors: string[] = [];
  page.on("pageerror", (cause) => errors.push(cause.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await trackBladeGraphics(page);
  await page.addInitScript(() => {
    const canvases = new Set<HTMLCanvasElement>();
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      ...args: Parameters<typeof getContext>
    ) {
      if (args[0] === "webgl2") canvases.add(this);
      return Reflect.apply(getContext, this, args);
    } as typeof getContext;
    Object.assign(globalThis, { bladeCanvases: canvases });
  });
  await page.goto("about:blank");
  await page.setContent(
    '<main id="strict-root" class="foundation" style="width:700px"></main>',
  );
  await page.addStyleTag({ path: resolve("apps/www/app/lightsaber.css") });
  await page.addScriptTag({ content: outputFiles[0].text });
  const pad = stage(page);
  await expect(pad).toHaveAttribute("data-renderer", "three");
  await expect(pad.locator("canvas")).toHaveCount(1);
  expect(
    await page.evaluate(() =>
      [
        ...(globalThis as unknown as { bladeCanvases: Set<HTMLCanvasElement> })
          .bladeCanvases,
      ].map((canvas) => canvas.getContext("webgl2")!.isContextLost()),
    ),
  ).toEqual([true, false]);
  await page.getByRole("button", { name: "Ignite", exact: true }).click();
  await expect(pad).toHaveAttribute("data-state", "running");
  await expect(pad).toHaveAttribute("data-extension", "1.000");
  await page.getByRole("button", { name: "Stop all", exact: true }).click();
  await page.evaluate(() =>
    (globalThis as unknown as { unmountBlade(): void }).unmountBlade(),
  );
  await expect.poll(() => bladeResourceCount(page)).toBe(0);
  expect(errors).toEqual([]);
});

test("3D blade graphics release on navigation and remain static at rest", async ({
  page,
}) => {
  await trackBladeGraphics(page);
  await instrument(page, "normal", "lightsaber");
  await expect(
    page.getByRole("button", { name: "Ignite", exact: true }),
  ).toBeEnabled();
  const pad = stage(page);
  await expect(pad).toHaveAttribute("data-renderer", "three");
  expect(await bladeResourceCount(page)).toBeGreaterThan(0);
  await pad.focus();
  await page.keyboard.press("Enter");
  await expect(pad).toHaveAttribute("data-extension", "1.000");
  await page.keyboard.press("Space");
  await expect
    .poll(async () => Number(await pad.getAttribute("data-hits")))
    .toBeGreaterThan(0);
  await page.keyboard.press("Escape");
  await expect(pad).toHaveAttribute("data-extension", "0.000");
  const restingDraws = await page.evaluate(async () => {
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    return (globalThis as unknown as { bladeDraws(): number }).bladeDraws();
  });
  expect(
    await page.evaluate(async () => {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      return (globalThis as unknown as { bladeDraws(): number }).bladeDraws();
    }),
  ).toBe(restingDraws);
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Catalog", exact: true })
    .click();
  await expect.poll(() => bladeResourceCount(page)).toBe(0);
  await expect
    .poll(async () => (await probe(page)).contexts)
    .toEqual(["closed"]);
});

for (const failure of ["context", "shader", "lost"] as const)
  test(`3D blade ${failure} failure preserves audio controls and frees graphics`, async ({
    page,
  }) => {
    await trackBladeGraphics(page, failure === "lost" ? undefined : failure);
    await instrument(page, "normal", "lightsaber");
    await expect(
      page.getByRole("button", { name: "Ignite", exact: true }),
    ).toBeEnabled();
    const pad = stage(page);
    if (failure === "lost") {
      await expect(pad).toHaveAttribute("data-renderer", "three");
      await page.getByRole("button", { name: "Ignite", exact: true }).click();
      await expect(pad).toHaveAttribute("data-state", "running");
      await pad.evaluate((canvas) => {
        canvas
          .querySelector("canvas")!
          .getContext("webgl2")!
          .getExtension("WEBGL_lose_context")!
          .loseContext();
      });
      await expect(pad).toHaveAttribute("data-state", "stopped");
    }
    await expect(pad).toHaveAttribute("data-renderer", "unavailable");
    await expect(page.locator(".lightsaber-display-error")).toContainText(
      "3D display is unavailable",
    );
    await expect.poll(() => bladeResourceCount(page)).toBe(0);
    await page.getByRole("button", { name: "Ignite", exact: true }).click();
    await expect(
      page
        .getByRole("status", { name: "", exact: true })
        .filter({ hasText: "Blade:" }),
    ).toHaveText("Blade: running");
    await expect(
      page.getByRole("button", { name: "Strike target", exact: true }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "Mute", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Unmute", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Stop all", exact: true }).click();
    await expect
      .poll(async () => {
        const p = await probe(page);
        return p.sources === p.ended;
      })
      .toBe(true);
  });
