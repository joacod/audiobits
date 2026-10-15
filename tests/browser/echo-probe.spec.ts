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

test("controlled compositions compare seeded resynthesis with real filtered delay", async ({
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
          matchedClusterEnergies: number[];
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
  expect(result.coherence.replay).toBeGreaterThan(0.99999);
  expect(result.coherence.variation).toBeLessThan(result.coherence.replay);
  expect(result.coherence.delay).toBeGreaterThan(0.98);
  expect(result.coherence.baseline).toBeLessThan(0.5);
  expect(result.metrics.far.returnEnergy).toBeLessThan(
    result.metrics.near.returnEnergy,
  );
  expect(result.metrics.glass.returnBrightness).toBeGreaterThan(
    result.metrics.felt.returnBrightness,
  );
  expect(result.metrics.cluster.lateEnergy).toBeGreaterThan(0);
  expect(result.metrics.wash.lateEnergy).toBeGreaterThan(0);
  expect(result.metrics.weak.returnEnergy).toBeLessThan(
    result.metrics.hybrid.returnEnergy / 20,
  );
  expect(result.metrics.left.wetLeft).toBeGreaterThan(
    result.metrics.left.wetRight * 100,
  );
  expect(result.metrics.right.wetRight).toBeGreaterThan(
    result.metrics.right.wetLeft * 100,
  );
  expect(result.metrics.left.energy).toBeCloseTo(
    result.metrics.right.energy,
    5,
  );
  expect(result.matchedEnergy).toBeCloseTo(0.05, 4);
  expect(result.metrics.delay.sources).toBe(result.metrics.hybrid.sources);
  expect(result.metrics.hybrid.delayNodes).toBe(0); // Early-only hybrid stays unchanged.
  expect(result.metrics.resynthesis.delayNodes).toBe(0);
  expect(result.metrics.cluster.delayNodes).toBe(3);
  expect(result.metrics.cluster.clockSources).toBe(3);
  expect(result.metrics.cluster.delaySeconds).toBeLessThanOrEqual(3 * 0.067);
  expect(result.earlyDifference).toBeLessThan(1e-6);
  for (const energy of result.matchedClusterEnergies)
    expect(energy).toBeCloseTo(0.05, 4);
  expect(result.metrics.cluster.lateEnergy).not.toBe(
    result.metrics.resynthesis.lateEnergy,
  );
  expect(result.metrics.cluster.sources).toBe(
    result.metrics.resynthesis.sources,
  );
  expect(result.metrics.delay.delayNodes).toBe(1);
  expect(result.clusterTimes).toHaveLength(3);
  for (const at of result.clusterTimes)
    expect(at).toBeGreaterThan(result.earlyAt + 0.11);
});

test("sustained rapid interaction admits 40 pulses with bounded native sources and cleanup", async ({
  page,
}) => {
  await instrument(page, "normal", "echo-probe");
  await page.addScriptTag({ path: harness });
  await page.evaluate(() => {
    const h = globalThis as unknown as {
      probeRapid(): Promise<unknown>;
      rapid: Promise<unknown>;
    };
    const button = document.createElement("button");
    button.textContent = "Run rapid bench";
    button.onclick = () => {
      h.rapid = h.probeRapid();
    };
    document.body.append(button);
  });
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
  expect(result.accepted).toBe(40);
  expect(result.groups).toBeLessThanOrEqual(3);
  expect(result.maximum).toBeLessThanOrEqual(30);
  expect(result.maximumSources).toBeLessThanOrEqual(102);
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
});

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
  // Close to Felt: that return sounds before retirement; Glass and Stone are pending.
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
        Math.max(second[0].at + 0.12, first[4].at + 0.015),
    );
    offset = sources.length;
    tap(0.62, 0.72);
    await wait(() => sources.length > offset);
    const third = sources.slice(offset);
    const retiredAt = first[8].cancelledAt!;
    const firstFeltAt = first[4].at;
    // Observe the old pending return times and the new valid returns through their full decay.
    const end = Math.max(first[12].at, third[12].at, second[4].at) + 0.32;
    await wait(() => frames.some((frame) => frame.at >= end));
    const width = surface.clientWidth,
      height = surface.clientHeight;
    const origin: Point = [0.38 * width, 0.27 * height];
    const matches = (a: Point, b: Point) =>
      Math.hypot(a[0] - b[0], a[1] - b[1]) < 2;
    const oldPaths = (frame: Frame) =>
      frame.paths.filter((path) => matches(path.from, origin));
    const felt = "01 / FELT",
      glass = "02 / GLASS",
      stone = "03 / STONE";
    const highlights = (label: string, times: number[]) =>
      frames.filter(
        (frame) =>
          !times.some((at) => frame.at >= at && frame.at < at + 0.3) &&
          frame.lights[label],
      );
    return {
      retiredAt,
      firstFeltAt,
      pendingAudioCancelled: first
        .filter((source) => source.at > retiredAt)
        .every(
          (source) =>
            source.cancelledAt !== null && source.cancelledAt < source.at,
        ),
      soundedAudioNotCancelledEarly: first
        .filter((source) => source.at === firstFeltAt)
        .every((source) => source.cancelledAt === null),
      oldPathsBeforeRetirement: frames.some(
        (frame) => frame.at < retiredAt && oldPaths(frame).length > 0,
      ),
      oldPendingPathsAfterRetirement: frames
        .filter((frame) => frame.at >= retiredAt)
        .flatMap(oldPaths)
        .filter((path) => !matches(path.to, [0.18 * width, 0.27 * height]))
        .length,
      soundedFeltPath: frames.some(
        (frame) =>
          frame.at >= retiredAt &&
          oldPaths(frame).some((path) =>
            matches(path.to, [0.18 * width, 0.27 * height]),
          ),
      ),
      soundedFeltDecay: frames.some(
        (frame) =>
          frame.at >= retiredAt &&
          frame.at < firstFeltAt + 0.3 &&
          frame.lights[felt],
      ),
      unexpectedFelt: highlights(felt, [firstFeltAt, second[4].at, third[4].at])
        .length,
      unexpectedGlass: highlights(glass, [second[8].at, third[8].at]).length,
      unexpectedStone: highlights(stone, [second[12].at, third[12].at]).length,
      newerGlass: frames.some(
        (frame) =>
          frame.at >= second[8].at &&
          frame.at < second[8].at + 0.3 &&
          frame.lights[glass],
      ),
      newerStone: frames.some(
        (frame) =>
          frame.at >= third[12].at &&
          frame.at < third[12].at + 0.3 &&
          frame.lights[stone],
      ),
      newerAudioNotCancelled: [...second, ...third]
        .filter((source) => [second[8].at, third[12].at].includes(source.at))
        .every((source) => source.cancelledAt === null),
    };
  });
  expect(result.retiredAt).toBeGreaterThan(result.firstFeltAt);
  expect(result.pendingAudioCancelled).toBe(true);
  expect(result.soundedAudioNotCancelledEarly).toBe(true);
  expect(result.oldPathsBeforeRetirement).toBe(true);
  expect(result.oldPendingPathsAfterRetirement).toBe(0);
  expect(result.soundedFeltPath).toBe(true);
  expect(result.soundedFeltDecay).toBe(true);
  expect(result.unexpectedFelt).toBe(0);
  expect(result.unexpectedGlass).toBe(0);
  expect(result.unexpectedStone).toBe(0);
  expect(result.newerGlass).toBe(true);
  expect(result.newerStone).toBe(true);
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
    before: 3,
    cutOnNewEmission: true,
    earlyNotRetired: true,
    remaining: 1,
    otherUnaffected: true,
    final: { active: 0, retiring: 0 },
  });
});

test("native late echoes are quiet time-shifted copies of the filtered grain", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:3100");
  await page.addScriptTag({ path: harness });
  const result = await page.evaluate(() =>
    (
      globalThis as unknown as {
        probeGrainCopies(): Promise<{
          error: number;
          copyEnergy: number;
          tail: number;
        }>;
      }
    ).probeGrainCopies(),
  );
  expect(result.error).toBeLessThan(1e-6);
  expect(result.copyEnergy).toBeGreaterThan(0);
  expect(result.tail).toBe(0);
});
