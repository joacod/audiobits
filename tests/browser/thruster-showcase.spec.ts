import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";

interface Probe {
  contexts: AudioContext[];
  sources: AudioScheduledSourceNode[];
  ended: number;
  connected: Set<AudioNode>;
  releaseActivation(): void;
}
async function instrument(
  page: Page,
  activation: "normal" | "held" | "failed" = "normal",
) {
  await page.addInitScript((mode) => {
    const Native = AudioContext;
    const probe = {
      contexts: [] as AudioContext[],
      sources: [] as AudioScheduledSourceNode[],
      ended: 0,
      connected: new Set<AudioNode>(),
      releaseActivation: () => {},
    };
    let fail = mode === "failed";
    globalThis.AudioContext = class extends Native {
      constructor() {
        super();
        probe.contexts.push(this);
        for (const name of [
          "createGain",
          "createOscillator",
          "createBufferSource",
          "createBiquadFilter",
          "createStereoPanner",
          "createAnalyser",
        ] as const) {
          const create = this[name].bind(this);
          Object.defineProperty(this, name, {
            value: () => {
              const node = create();
              const connect = node.connect.bind(node);
              const disconnect = node.disconnect.bind(node);
              Object.defineProperty(node, "connect", {
                value: (...args: Parameters<AudioNode["connect"]>) => {
                  probe.connected.add(node);
                  return connect(...args);
                },
              });
              Object.defineProperty(node, "disconnect", {
                value: () => {
                  probe.connected.delete(node);
                  disconnect();
                },
              });
              if (node instanceof AudioScheduledSourceNode) {
                probe.sources.push(node);
                node.addEventListener("ended", () => {
                  probe.ended++;
                });
              }
              return node;
            },
          });
        }
      }
      resume() {
        if (fail) {
          fail = false;
          return Promise.reject(new Error("Activation denied"));
        }
        if (mode === "held")
          return new Promise<void>((yes, no) => {
            probe.releaseActivation = () => {
              void super.resume().then(yes, no);
            };
          });
        return super.resume();
      }
    };
    Object.assign(globalThis, { thrusterProbe: probe, copiedSource: "" });
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (code: string) => {
          Object.assign(globalThis, { copiedSource: code });
        },
      },
    });
  }, activation);
  await page.goto("http://127.0.0.1:3100/experiences/reactive-thruster");
}
const probe = (page: Page) =>
  page.evaluate(() => {
    const p = (globalThis as unknown as { thrusterProbe: Probe }).thrusterProbe;
    return {
      contexts: p.contexts.map((c) => c.state),
      sources: p.sources.length,
      ended: p.ended,
      connected: p.connected.size,
    };
  });

test("idle showcase controls stay silent and never read activation-only getters", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (cause) => errors.push(cause.message));
  await instrument(page);
  const start = page.getByRole("button", {
    name: "Start thruster",
    exact: true,
  });
  await expect(start).toBeEnabled();
  await page.getByRole("button", { name: "Mute", exact: true }).click();
  await page.getByRole("button", { name: "Stop all", exact: true }).click();
  await page
    .getByRole("button", { name: "Release thruster", exact: true })
    .click();
  await page.getByRole("slider", { name: "Throttle", exact: true }).fill("0.8");
  expect((await probe(page)).contexts).toEqual([]);
  expect(errors).toEqual([]);
  await page.getByRole("button", { name: "Mute", exact: true }).click();
  await start.click();
  await expect(page.locator(".flight-state")).toHaveText("Thruster: running");
  await page.getByRole("button", { name: "Stop all", exact: true }).click();
  await expect(page.locator(".flight-state")).toHaveText("Thruster: stopped");
  expect(errors).toEqual([]);
});

test("showcase pointer, keyboard, impact, mute and navigation own their lifecycle", async ({
  page,
}) => {
  await instrument(page);
  expect((await probe(page)).contexts).toEqual([]);
  const pad = page.locator(".flight-pad");
  const box = (await pad.boundingBox())!;
  await page.mouse.move(box.x + 40, box.y + 80);
  await page.mouse.down();
  await expect(page.locator(".flight-state")).toHaveText("Thruster: running");
  await page.mouse.move(box.x + box.width - 40, box.y + 140, { steps: 8 });
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
  await page.mouse.up();
  await expect(page.locator(".flight-state")).toHaveText("Thruster: stopped");
  await expect.poll(async () => (await probe(page)).ended).toBe(3);
  await page
    .getByRole("button", { name: "Start thruster", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".flight-state")).toHaveText("Thruster: running");
  await page.getByRole("slider", { name: "Throttle", exact: true }).fill("0.8");
  await expect(page.locator(".flight-readout output")).toHaveText("80%");
  await expect
    .poll(async () =>
      Number(await page.locator("canvas").getAttribute("data-peak")),
    )
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "Play impact" }).click();
  expect((await probe(page)).sources).toBe(8);
  await page.getByRole("button", { name: "Mute", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Mute", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("canvas")).toHaveAttribute("data-peak", "0");
  await page.getByRole("button", { name: "Stop all" }).click();
  await expect
    .poll(async () => {
      const p = await probe(page);
      return p.ended === p.sources;
    })
    .toBe(true);
  await page
    .getByRole("button", { name: "Start thruster", exact: true })
    .click();
  await expect(page.locator(".flight-state")).toContainText("running");
  for (let i = 0; i < 4; i++) {
    await page
      .getByRole("button", { name: "Release thruster", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Start thruster", exact: true })
      .click();
    await expect(page.locator(".flight-state")).toContainText("running");
    const p = await probe(page);
    expect(p.sources - p.ended).toBeLessThanOrEqual(9);
  }
  await page.getByRole("link", { name: "Sounds", exact: true }).click();
  await expect
    .poll(async () => (await probe(page)).contexts)
    .toEqual(["closed"]);
  await page.getByRole("link", { name: "Impact", exact: true }).click();
  await page.getByRole("button", { name: "Play impact", exact: true }).click();
  await expect
    .poll(async () => (await probe(page)).contexts)
    .toEqual(["closed", "running"]);
});

test("activation failure recovers with a fresh gesture", async ({ page }) => {
  await instrument(page, "failed");
  await page
    .getByRole("button", { name: "Start thruster", exact: true })
    .click();
  await expect(page.locator(".flight-controls [role=alert]")).toContainText(
    "Try Start thruster",
  );
  expect((await probe(page)).sources).toBe(0);
  await page
    .getByRole("button", { name: "Start thruster", exact: true })
    .click();
  await expect(page.locator(".flight-state")).toHaveText("Thruster: running");
  await expect(page.locator(".flight-controls [role=alert]")).toHaveCount(0);
});

test("cancelled activation and visibility cleanup require a fresh gesture", async ({
  page,
}) => {
  await instrument(page, "held");
  await page
    .getByRole("button", { name: "Start thruster", exact: true })
    .click();
  await expect(page.locator(".flight-state")).toHaveText("Thruster: starting");
  await page.getByRole("button", { name: "Stop all" }).click();
  await page.evaluate(() =>
    (
      globalThis as unknown as { thrusterProbe: Probe }
    ).thrusterProbe.releaseActivation(),
  );
  await expect
    .poll(async () => (await probe(page)).contexts)
    .toEqual(["running"]);
  expect((await probe(page)).sources).toBe(0);
  await page
    .getByRole("button", { name: "Start thruster", exact: true })
    .click();
  await expect(page.locator(".flight-state")).toHaveText("Thruster: running");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator(".flight-state")).toHaveText("Thruster: stopped");
  await expect
    .poll(async () => (await probe(page)).contexts)
    .toEqual(["suspended"]);
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  await expect
    .poll(async () => (await probe(page)).contexts)
    .toEqual(["closed"]);
});

test("copy actions return every complete canonical source file and report clipboard denial", async ({
  page,
}) => {
  await instrument(page);
  for (const name of ["recipe.ts", "pointer.ts", "host.ts", "index.html"]) {
    await page.locator("summary").filter({ hasText: name }).click();
    await page
      .getByRole("button", { name: `Copy ${name}`, exact: true })
      .click();
    const copied = await page.evaluate(
      () => (globalThis as unknown as { copiedSource: string }).copiedSource,
    );
    expect(copied).toBe(
      readFileSync(`catalog/reactive-thruster/${name}`, "utf8"),
    );
  }
  await page.evaluate(() => {
    navigator.clipboard.writeText = async () => {
      throw new Error("denied");
    };
  });
  await page.getByRole("button", { name: "Copy host.ts", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Copy unavailable" }),
  ).toBeVisible();
});

test("discovery links, narrow touch input and reduced motion remain usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await instrument(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.getByRole("button", { name: "Stop all" })).toBeVisible();
  const pad = page.locator(".flight-pad");
  const box = (await pad.boundingBox())!;
  const touch = await page.context().newCDPSession(page);
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: box.x + 70, y: box.y + 80 }],
  });
  await expect(page.locator(".flight-state")).toHaveText("Thruster: running");
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: box.x + 170, y: box.y + 150 }],
  });
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(page.locator(".flight-state")).toHaveText("Thruster: stopped");
  await expect(page.locator("canvas")).toHaveAttribute("data-peak", "0");
  await page.getByRole("link", { name: "Sounds", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Try the reactive thruster" }),
  ).toBeVisible();
  await page.goto("http://127.0.0.1:3100");
  await expect(
    page.getByRole("link", { name: "Try the reactive thruster" }),
  ).toBeVisible();
});
