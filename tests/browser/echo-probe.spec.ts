import { expect, test } from "@playwright/test";
import { resolve } from "node:path";
import { instrument, probe } from "./experience-probe";

const harness = resolve(
  "node_modules/.cache/audiobits-audio-tests/audio-harness.iife.js",
);
const stageName = { name: "Echo Probe stage", exact: true };

test("original A reference retains material, strength, stereo and finite-decay evidence", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:3100");
  await page.addScriptTag({ path: harness });
  const result = await page.evaluate(async () => {
    const h = globalThis as unknown as {
      probeSignal(
        kind: string,
        surface?: number,
        pan?: number,
        gainDb?: number,
        seed?: number,
        count?: number,
        rate?: number,
      ): Promise<{
        peak: number;
        energy: number;
        left: number;
        right: number;
        brightness: number;
        tail: number;
        onset: number;
      }>;
    };
    return {
      pulse: await h.probeSignal("emission"),
      replay: await h.probeSignal("emission"),
      variation: await h.probeSignal("emission", 0.5, 0, 0, 99),
      dark: await h.probeSignal("reference-reflection", 0),
      bright: await h.probeSignal("reference-reflection", 1),
      weak: await h.probeSignal("reference-reflection", 0.7, 0, -24),
      strong: await h.probeSignal("reference-reflection", 0.7),
      left: await h.probeSignal("reference-reflection", 0.7, -0.9),
      right: await h.probeSignal("reference-reflection", 0.7, 0.9),
      diffuse: await h.probeSignal("diffusion"),
      eight: await h.probeSignal("emission", 0.5, 0, 0, 42, 8),
      lowRate: await h.probeSignal("reflection", 1, 0, 0, 42, 1, 44100),
    };
  });
  // Native oscillator/filter rounding can vary between offline contexts.
  // The compiler's exact seeded determinism is checked separately in unit tests.
  for (const key of ["peak", "energy", "brightness"] as const)
    expect(result.pulse[key]).toBeCloseTo(result.replay[key], 7);
  expect(result.variation.energy).not.toBe(result.pulse.energy);
  for (const value of Object.values(result)) {
    expect(value.energy).toBeGreaterThan(0);
    expect(value.tail).toBe(0);
    expect(value.onset).toBeGreaterThanOrEqual(0.02);
    expect(value.onset).toBeLessThan(0.021);
    expect(value.peak).toBeLessThan(0.5);
  }
  expect(result.bright.brightness).toBeGreaterThan(result.dark.brightness * 10);
  expect(result.strong.energy).toBeGreaterThan(result.weak.energy * 200);
  expect(result.left.left).toBeGreaterThan(result.left.right * 100);
  expect(result.right.right).toBeGreaterThan(result.right.left * 100);
  expect(result.left.energy).toBeCloseTo(result.right.energy, 5);
});

test("1000 scheduled voices cancel without retained ownership or touching shared sound", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:3100");
  await page.addScriptTag({ path: harness });
  await page.evaluate(() => {
    const h = globalThis as unknown as {
      probeResources(): Promise<unknown>;
      resources: Promise<unknown>;
    };
    const button = document.createElement("button");
    button.textContent = "Run resource bench";
    button.onclick = () => {
      h.resources = h.probeResources();
    };
    document.body.append(button);
  });
  await page.getByRole("button", { name: "Run resource bench" }).click();
  const result = await page.evaluate(
    () => (globalThis as unknown as { resources: Promise<unknown> }).resources,
  );
  expect(result).toEqual({
    maximum: 11,
    emissions: 100,
    counts: { active: 0, retiring: 0 },
    state: "disposed",
  });
});

test("tap, repeated emission, measured output, Escape, interruption and navigation clean up", async ({
  page,
}) => {
  // Natural completion waits for metal's late echo (about 6 s per emission).
  test.setTimeout(90_000);
  await instrument(page, "normal", "echo-probe");
  const stage = page.getByRole("group", stageName);
  await expect(stage).toHaveAttribute("data-ready", "true");
  expect((await probe(page)).contexts).toEqual([]);
  await stage.click({ position: { x: 100, y: 160 } });
  await expect(stage).toHaveAttribute("data-state", "running");
  await expect
    .poll(async () =>
      Number(await stage.locator("canvas").getAttribute("data-peak")),
    )
    .toBeGreaterThan(0);
  await stage.press("Escape");
  await expect(stage).toHaveAttribute("data-state", "stopped");
  await expect(stage.locator("canvas")).toHaveAttribute("data-peak", "0");
  await expect
    .poll(async () => {
      const p = await probe(page);
      return p.sources - p.ended;
    })
    .toBe(0);
  const restingConnections = (await probe(page)).connected;
  for (let index = 0; index < 3; index++) {
    await stage.press("Enter");
    await expect(stage).toHaveAttribute("data-state", "running");
    await expect
      .poll(async () => {
        const p = await probe(page);
        return p.sources - p.ended;
      })
      .toBe(0);
    await expect(stage).toHaveAttribute("data-state", "stopped");
  }
  await stage.press("Enter");
  await expect(stage).toHaveAttribute("data-state", "running");
  await page.evaluate(async () => {
    const h = globalThis as unknown as {
      thrusterProbe: { contexts: AudioContext[] };
    };
    await h.thrusterProbe.contexts[0].suspend();
  });
  await expect(stage).toHaveAttribute("data-state", "stopped");
  // Suspended native sources deliver ended events only once rendering resumes.
  // Managed graphs must already be disconnected, with no future return audible.
  expect((await probe(page)).contexts).toEqual(["suspended"]);
  expect((await probe(page)).connected).toBe(restingConnections);
  await stage.press("Enter");
  await expect(stage).toHaveAttribute("data-state", "running");
  await expect
    .poll(async () => {
      const p = await probe(page);
      return p.sources - p.ended;
    })
    .toBe(0);
  await page
    .getByRole("navigation", { name: "Breadcrumb" })
    .getByRole("link")
    .click();
  await expect
    .poll(async () => (await probe(page)).contexts)
    .toEqual(["closed"]);
  expect((await probe(page)).connected).toBe(0);
});

for (const mode of ["held", "failed"] as const)
  test(`activation ${mode} supports cancellation and a fresh gesture`, async ({
    page,
  }) => {
    await instrument(page, mode, "echo-probe");
    const stage = page.getByRole("group", stageName);
    await expect(stage).toHaveAttribute("data-ready", "true");
    await stage.press("Enter");
    if (mode === "held") {
      await expect(stage).toHaveAttribute("data-state", "starting");
      await stage.press("Escape");
      await page.evaluate(() =>
        (
          globalThis as unknown as {
            thrusterProbe: { releaseActivation(): void };
          }
        ).thrusterProbe.releaseActivation(),
      );
      await expect(stage).toHaveAttribute("data-state", "stopped");
      expect((await probe(page)).sources).toBe(0);
    } else {
      await expect(page.locator(".echo-probe-help [role=alert]")).toContainText(
        "Tap again to retry",
      );
      await expect(stage).toHaveAttribute("data-state", "stopped");
    }
    await stage.press("Enter");
    await expect(stage).toHaveAttribute("data-state", "running");
    await expect(page.locator(".echo-probe-help [role=alert]")).toHaveCount(0);
    await stage.press("Escape");
    await expect
      .poll(async () => {
        const p = await probe(page);
        return p.sources - p.ended;
      })
      .toBe(0);
  });

for (const width of [1440, 390])
  test(`stage fits ${width}px with touch, reduced motion and installed-source usage`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await instrument(page, "normal", "echo-probe");
    const stage = page.getByRole("group", stageName);
    await expect(stage).toHaveAttribute("data-ready", "true");
    await stage.dispatchEvent("pointerdown", {
      pointerType: "touch",
      isPrimary: true,
      button: 0,
      clientX: 150,
      clientY: 300,
    });
    await expect(stage).toHaveAttribute("data-state", "running");
    await stage.dispatchEvent("pointercancel");
    await expect(stage).toHaveAttribute("data-state", "stopped");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("button", { name: "Copy echo-probe code", exact: true }),
    ).toBeEnabled();
    await page
      .getByRole("button", { name: "Copy echo-probe code", exact: true })
      .click();
    expect(
      await page.evaluate(
        () => (globalThis as unknown as { copiedSource: string }).copiedSource,
      ),
    ).toContain("./sounds/experiences/echo-probe/controller");
  });

test("materials have distinct signatures, the surface fallback matches, and controls stay independent", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:3100");
  await page.addScriptTag({ path: harness });
  const result = await page.evaluate(() =>
    (
      globalThis as unknown as {
        probeComparisons(): Promise<{
          metrics: Record<string, Record<string, number>>;
          matchedEnergy: number;
          coherence: Record<string, number>;
          clusterTimes: number[];
          earlyAt: number;
          earlyDifference: number;
          fallbackDifference: Record<string, number>;
        }>;
      }
    ).probeComparisons(),
  );
  console.log("Echo Probe comparison", JSON.stringify(result));

  for (const value of Object.values(result.metrics)) {
    expect(value.energy).toBeGreaterThan(0);
    expect(value.peak).toBeLessThan(0.5);
    expect(value.tail).toBe(0);
  }
  const { metrics, coherence } = result;
  expect(coherence.replay).toBeGreaterThan(0.99999);
  expect(coherence.variation).toBeLessThan(coherence.replay);
  expect(coherence.baseline).toBeLessThan(0.5);
  // Each material is its own sound, not a filtered copy of another.
  for (const pair of ["woodMetal", "woodGlass", "metalGlass"])
    expect(Math.abs(coherence[pair])).toBeLessThan(0.5);
  for (const value of Object.values(result.fallbackDifference))
    expect(value).toBeLessThan(1e-6);
  // Glass is brightest, wood darkest; metal carries the most ringing energy.
  expect(metrics.glass.returnBrightness).toBeGreaterThan(
    metrics.metal.returnBrightness,
  );
  expect(metrics.metal.returnBrightness).toBeGreaterThan(
    metrics.wood.returnBrightness,
  );
  expect(metrics.metal.lateEnergy).toBeGreaterThan(metrics.glass.lateEnergy);
  expect(metrics.glass.lateEnergy).toBeGreaterThan(metrics.wood.lateEnergy);
  expect(metrics.far.returnEnergy).toBeLessThan(metrics.near.returnEnergy);
  expect(metrics.cluster.lateEnergy).toBeGreaterThan(
    metrics.current.lateEnergy,
  );
  expect(metrics.wash.lateEnergy).toBeGreaterThan(0);
  expect(metrics.weak.returnEnergy).toBeLessThan(
    metrics.current.returnEnergy / 20,
  );
  expect(metrics.left.wetLeft).toBeGreaterThan(metrics.left.wetRight * 100);
  expect(metrics.right.wetRight).toBeGreaterThan(metrics.right.wetLeft * 100);
  expect(metrics.left.energy).toBeCloseTo(metrics.right.energy, 5);
  expect(result.matchedEnergy).toBeCloseTo(0.05, 4);
  // Early returns are dry; only the three late grains own native delays.
  expect(metrics.current.delayNodes).toBe(0);
  expect(metrics.cluster.delayNodes).toBe(3);
  expect(metrics.cluster.clockSources).toBe(3);
  expect(metrics.metalCluster.delaySeconds).toBeLessThanOrEqual(3 * 0.32);
  expect(metrics.metalCluster.sources).toBe(2 + 4 * 7);
  expect(result.earlyDifference).toBeLessThan(1e-6);
  expect(result.clusterTimes).toHaveLength(3);
  for (const at of result.clusterTimes)
    expect(at).toBeGreaterThan(result.earlyAt + 0.11);
});

for (const count of [8, 40])
  test(
    `rapid interaction admits ${count} pulses with bounded native sources and cleanup`,
    { tag: count === 8 ? [] : "@extended" },
    async ({ page }) => {
      await instrument(page, "normal", "echo-probe");
      await page.addScriptTag({ path: harness });
      await page.evaluate((count) => {
        const h = globalThis as unknown as {
          probeRapid(count: number): Promise<unknown>;
          rapid: Promise<unknown>;
        };
        const button = document.createElement("button");
        button.textContent = "Run rapid bench";
        button.onclick = () => {
          h.rapid = h.probeRapid(count);
        };
        document.body.append(button);
      }, count);
      await page.getByRole("button", { name: "Run rapid bench" }).click();
      const result = await page.evaluate(
        () =>
          (
            globalThis as unknown as {
              rapid: Promise<{
                accepted: number;
                maximum: number;
                maximumSources: number;
                groups: number;
                peak: number;
                afterStop: { active: number; retiring: number };
                final: { active: number; retiring: number };
              }>;
            }
          ).rapid,
      );
      console.log("Echo Probe rapid", JSON.stringify(result));
      expect(result.accepted).toBe(count);
      expect(result.groups).toBeLessThanOrEqual(3);
      expect(result.maximum).toBeLessThanOrEqual(30);
      // Three groups of at most 65 sources (all-metal worst case).
      expect(result.maximumSources).toBeLessThanOrEqual(195);
      expect(result.peak).toBeGreaterThan(0);
      expect(result.peak).toBeLessThan(0.5);
      expect(result.afterStop).toEqual({ active: 0, retiring: 0 });
      expect(result.final).toEqual({ active: 0, retiring: 0 });
      await expect
        .poll(async () => {
          const p = await probe(page);
          return p.sources - p.ended;
        })
        .toBe(0);
      expect((await probe(page)).connected).toBe(0);
    },
  );

test("retirement removes cancelled paths and highlights while sounded returns finish fading", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await instrument(page, "normal", "echo-probe");
  const stage = page.getByRole("group", stageName);
  await expect(stage).toHaveAttribute("data-ready", "true");
  await page.addScriptTag({ path: harness });
  await page.evaluate(() => {
    const h = globalThis as unknown as {
      installProbeVisualProbe(): unknown;
      probeVisuals: unknown;
    };
    h.probeVisuals = h.installProbeVisualProbe();
  });
  const box = (await stage.boundingBox())!;
  // Close to Wood: that return sounds before retirement; Glass and Metal are pending.
  await stage.click({
    position: { x: box.width * 0.38, y: box.height * 0.27 },
  });
  const result = await page.evaluate(async () => {
    type Point = readonly [number, number];
    type Frame = {
      at: number;
      paths: { from: Point; to: Point }[];
      lights: Record<string, boolean>;
    };
    type Source = { at: number; cancelledAt: number | null };
    const h = globalThis as unknown as {
      thrusterProbe: { contexts: AudioContext[] };
      probeVisuals: { frames: Frame[]; sources: Source[] };
    };
    const surface = document.querySelector<HTMLElement>(".echo-probe-stage")!;
    const { frames, sources } = h.probeVisuals;
    const context = h.thrusterProbe.contexts[0];
    const wait = (ready: () => boolean) =>
      new Promise<void>((done) => {
        const check = () => {
          if (ready()) done();
          else requestAnimationFrame(check);
        };
        check();
      });
    const tap = (x: number, y: number) => {
      const bounds = surface.getBoundingClientRect();
      surface.dispatchEvent(
        new PointerEvent("pointerdown", {
          button: 0,
          isPrimary: true,
          clientX: bounds.left + x * bounds.width,
          clientY: bounds.top + y * bounds.height,
        }),
      );
    };
    await wait(() => sources.length > 4);
    const first = sources.slice();
    await wait(() => context.currentTime >= first[0].at + 0.12);
    let offset = sources.length;
    tap(0.79, 0.3);
    await wait(() => sources.length > offset);
    const second = sources.slice(offset);
    await wait(
      () =>
        context.currentTime >=
        Math.max(second[0].at + 0.12, first[2].at + 0.015),
    );
    offset = sources.length;
    tap(0.62, 0.72);
    await wait(() => sources.length > offset);
    const third = sources.slice(offset);
    const retiredAt = first[6].cancelledAt!;
    const firstWoodAt = first[2].at;
    // Pulse sources are 0-1, wood 2-5, glass 6-11, metal 12-18.
    // Observe the old pending return times and the new valid returns through their full decay.
    const end = Math.max(first[12].at, third[12].at, second[2].at) + 0.32;
    await wait(() => frames.some((frame) => frame.at >= end));
    const width = surface.clientWidth,
      height = surface.clientHeight;
    const origin: Point = [0.38 * width, 0.27 * height];
    const matches = (a: Point, b: Point) =>
      Math.hypot(a[0] - b[0], a[1] - b[1]) < 2;
    const oldPaths = (frame: Frame) =>
      frame.paths.filter((path) => matches(path.from, origin));
    const wood = "01 / WOOD",
      glass = "02 / GLASS",
      metal = "03 / METAL";
    const highlights = (label: string, times: number[]) =>
      frames.filter(
        (frame) =>
          !times.some((at) => frame.at >= at && frame.at < at + 0.3) &&
          frame.lights[label],
      );
    return {
      retiredAt,
      firstWoodAt,
      pendingAudioCancelled: first
        .filter((source) => source.at > retiredAt)
        .every(
          (source) =>
            source.cancelledAt !== null && source.cancelledAt < source.at,
        ),
      soundedAudioNotCancelledEarly: first
        .filter((source) => source.at === firstWoodAt)
        .every((source) => source.cancelledAt === null),
      oldPathsBeforeRetirement: frames.some(
        (frame) => frame.at < retiredAt && oldPaths(frame).length > 0,
      ),
      oldPendingPathsAfterRetirement: frames
        .filter((frame) => frame.at >= retiredAt)
        .flatMap(oldPaths)
        .filter((path) => !matches(path.to, [0.18 * width, 0.27 * height]))
        .length,
      soundedWoodPath: frames.some(
        (frame) =>
          frame.at >= retiredAt &&
          oldPaths(frame).some((path) =>
            matches(path.to, [0.18 * width, 0.27 * height]),
          ),
      ),
      soundedWoodDecay: frames.some(
        (frame) =>
          frame.at >= retiredAt &&
          frame.at < firstWoodAt + 0.3 &&
          frame.lights[wood],
      ),
      unexpectedWood: highlights(wood, [firstWoodAt, second[2].at, third[2].at])
        .length,
      unexpectedGlass: highlights(glass, [second[6].at, third[6].at]).length,
      unexpectedMetal: highlights(metal, [second[12].at, third[12].at]).length,
      newerGlass: frames.some(
        (frame) =>
          frame.at >= second[6].at &&
          frame.at < second[6].at + 0.3 &&
          frame.lights[glass],
      ),
      newerMetal: frames.some(
        (frame) =>
          frame.at >= third[12].at &&
          frame.at < third[12].at + 0.3 &&
          frame.lights[metal],
      ),
      newerAudioNotCancelled: [...second, ...third]
        .filter((source) => [second[6].at, third[12].at].includes(source.at))
        .every((source) => source.cancelledAt === null),
    };
  });
  expect(result.retiredAt).toBeGreaterThan(result.firstWoodAt);
  expect(result.pendingAudioCancelled).toBe(true);
  expect(result.soundedAudioNotCancelledEarly).toBe(true);
  expect(result.oldPathsBeforeRetirement).toBe(true);
  expect(result.oldPendingPathsAfterRetirement).toBe(0);
  expect(result.soundedWoodPath).toBe(true);
  expect(result.soundedWoodDecay).toBe(true);
  expect(result.unexpectedWood).toBe(0);
  expect(result.unexpectedGlass).toBe(0);
  expect(result.unexpectedMetal).toBe(0);
  expect(result.newerGlass).toBe(true);
  expect(result.newerMetal).toBe(true);
  expect(result.newerAudioNotCancelled).toBe(true);
  await stage.press("Escape");
  await expect(stage).toHaveAttribute("data-state", "stopped");
  expect(
    await page.evaluate(() => {
      const h = globalThis as unknown as {
        probeVisuals: { frames: { lights: Record<string, boolean> }[] };
      };
      return Object.values(h.probeVisuals.frames.at(-1)!.lights).some(Boolean);
    }),
  ).toBe(false);
  // Native ended delivery requires a running audio clock. Disposal is checked
  // below through context closure, disconnected nodes, and absent stage frames.
  await expect
    .poll(async () => {
      const p = await probe(page);
      return p.sources - p.ended;
    })
    .toBe(0);
  await stage.press("Enter");
  await expect(stage).toHaveAttribute("data-state", "running");
  await page
    .getByRole("navigation", { name: "Breadcrumb" })
    .getByRole("link")
    .click();
  await expect
    .poll(async () => (await probe(page)).contexts)
    .toEqual(["closed"]);
  expect((await probe(page)).connected).toBe(0);
  await expect(stage).toHaveCount(0);
  const framesAfterDisposal = await page.evaluate(async () => {
    const h = globalThis as unknown as { probeVisuals: { frames: unknown[] } };
    const before = h.probeVisuals.frames.length;
    await new Promise<void>((done) => requestAnimationFrame(() => done()));
    return { before, after: h.probeVisuals.frames.length };
  });
  expect(framesAfterDisposal.after).toBe(framesAfterDisposal.before);
});

test("a new emission cuts sounding native late repeats and preserves shared audio", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:3100");
  await page.addScriptTag({ path: harness });
  await page.evaluate(() => {
    const h = globalThis as unknown as {
      probeLateCancellation(): Promise<unknown>;
      lateCancellation: Promise<unknown>;
    };
    const button = document.createElement("button");
    button.textContent = "Check late cancellation";
    button.onclick = () => {
      h.lateCancellation = h.probeLateCancellation();
    };
    document.body.append(button);
  });
  await page.getByRole("button", { name: "Check late cancellation" }).click();
  expect(
    await page.evaluate(
      () =>
        (globalThis as unknown as { lateCancellation: Promise<unknown> })
          .lateCancellation,
    ),
  ).toEqual({
    // Three glass grains, each with a feedback delay and its quantum offset.
    before: 6,
    cutOnNewEmission: true,
    earlyNotRetired: true,
    remaining: 1,
    otherUnaffected: true,
    final: { active: 0, retiring: 0 },
  });
});

test("native late echoes are the material voice plus its own feedback repeats", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:3100");
  await page.addScriptTag({ path: harness });
  const result = await page.evaluate(() =>
    (
      globalThis as unknown as {
        probeGrainCopies(): Promise<
          Record<string, { error: number; copyEnergy: number; tail: number }>
        >;
      }
    ).probeGrainCopies(),
  );
  expect(Object.keys(result).sort()).toEqual(["glass", "metal", "wood"]);
  for (const value of Object.values(result)) {
    expect(value.error).toBeLessThan(1e-5);
    expect(value.copyEnergy).toBeGreaterThan(0);
    expect(value.tail).toBe(0);
  }
});
