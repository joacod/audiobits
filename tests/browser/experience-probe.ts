import { expect, type Page } from "@playwright/test";
interface Probe {
  contexts: AudioContext[];
  sources: AudioScheduledSourceNode[];
  ended: number;
  connected: Set<AudioNode>;
  releaseActivation(): void;
}
export async function instrument(
  page: Page,
  activation: "normal" | "held" | "failed" = "normal",
  route = "reactive-thruster",
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
  await page.goto(
    `http://127.0.0.1:3100${route.startsWith("/") ? route : `/catalog/${route}`}`,
  );
}
export const probe = (page: Page) =>
  page.evaluate(() => {
    const p = (globalThis as unknown as { thrusterProbe: Probe }).thrusterProbe;
    return {
      contexts: p.contexts.map((c) => c.state),
      sources: p.sources.length,
      ended: p.ended,
      connected: p.connected.size,
      ownedSources: p.sources.filter((source) => p.connected.has(source))
        .length,
    };
  });

/** Exercise the website gesture path, including hydration and native capture. */
export async function dragThruster(page: Page) {
  const pad = page.getByRole("group", { name: "Drag to fly" });
  await expect(pad.locator(".thruster-ribbons")).toHaveAttribute(
    "data-renderer",
    /webgl|canvas|unavailable/,
  );
  await pad.scrollIntoViewIfNeeded();
  const box = (await pad.boundingBox())!;
  await page.mouse.move(box.x + 40, box.y + 80);
  await page.mouse.down();
  await expect(pad).toHaveAttribute("data-state", /running|starting/);
  await page.mouse.move(box.x + box.width - 40, box.y + 140, { steps: 8 });
  return box;
}
