import { expect, test, type Locator, type Page } from "@playwright/test";
import { instrument, probe } from "./experience-probe";
import { riffReactorSong as song } from "../../catalog/experiences/riff-reactor/song";
import { buildChart } from "../../apps/www/lib/riff-chart";

const stageName = { name: "Riff Reactor stage", exact: true };
const chart = buildChart(song);
const secondsPerBeat = 60 / song.bpm;

/** Record every native source start with the context time it was booked at. */
async function recordStarts(page: Page) {
  await page.addInitScript(() => {
    const starts: { when: number; now: number }[] = [];
    const start = AudioScheduledSourceNode.prototype.start;
    AudioScheduledSourceNode.prototype.start = function (
      this: AudioScheduledSourceNode,
      when = 0,
      ...rest: number[]
    ) {
      starts.push({ when, now: this.context.currentTime });
      return (start as (...args: number[]) => void).call(this, when, ...rest);
    };
    Object.assign(globalThis, { riffStarts: starts });
  });
}
const starts = (page: Page) =>
  page.evaluate(
    () =>
      (globalThis as unknown as { riffStarts: { when: number; now: number }[] })
        .riffStarts,
  );
/** Band events are booked ahead; performed notes start at the booking time. */
function expectOnGrid(
  list: { when: number; now: number }[],
  origin: number,
  until = Infinity,
) {
  const band = list.filter(
    (entry) =>
      entry.when >= origin - 1e-6 &&
      entry.when < until &&
      entry.when > entry.now + 0.015,
  );
  expect(band.length).toBeGreaterThan(0);
  const sixteenth = secondsPerBeat / 4;
  for (const { when, now } of band) {
    const steps = (when - origin) / sixteenth;
    expect(
      Math.abs(steps - Math.round(steps)),
      `start at ${when}`,
    ).toBeLessThan(1e-6);
    // Booked within the lookahead, never further ahead.
    expect(when - now).toBeLessThan(0.15 + 0.12 + 0.05);
  }
  return band;
}
const origin = async (stage: Locator) =>
  Number(await stage.getAttribute("data-origin"));
const peak = async (stage: Locator) =>
  Number(await stage.locator("canvas").getAttribute("data-peak"));
async function owned(page: Page) {
  const p = await probe(page);
  return p.sources - p.ended;
}

/**
 * Perform chart notes in the page on the audio clock, alternating keyboard and
 * pointer input, so the judgement does not depend on automation round trips.
 */
function perform(page: Page, notes: { beat: number; lane: number }[]) {
  return page.evaluate(
    async ({ notes, secondsPerBeat }) => {
      const stage = document.querySelector<HTMLElement>(".riff-stage")!;
      const context = (
        globalThis as unknown as { thrusterProbe: { contexts: AudioContext[] } }
      ).thrusterProbe.contexts.at(-1)!;
      const latency = (context.baseLatency || 0) + (context.outputLatency || 0);
      const zero = Number(stage.dataset.origin);
      for (const [index, note] of notes.entries()) {
        const due = zero + note.beat * secondsPerBeat + latency;
        while (context.currentTime < due - 0.004)
          await new Promise((resolve) => setTimeout(resolve, 2));
        if (index % 2) {
          const box = stage.getBoundingClientRect();
          stage.dispatchEvent(
            new PointerEvent("pointerdown", {
              bubbles: true,
              isPrimary: true,
              pointerId: 1,
              clientX: box.left + box.width * ((note.lane + 0.5) / 3),
              clientY: box.top + box.height * 0.8,
            }),
          );
        } else
          stage.dispatchEvent(
            new KeyboardEvent("keydown", {
              bubbles: true,
              key: "asd"[note.lane],
            }),
          );
      }
    },
    { notes, secondsPerBeat },
  );
}

test("perform, miss, lift on a bar line, stop, replay, hide and leave cleanly @smoke", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await recordStarts(page);
  await instrument(page, "normal", "riff-reactor");
  const stage = page.getByRole("group", stageName);
  await expect(stage).toHaveAttribute("data-ready", "true");
  await expect(stage).toHaveAttribute("data-phase", "idle");
  expect((await probe(page)).contexts).toEqual([]);
  await stage.focus();
  await stage.press("Enter");
  await expect(stage).toHaveAttribute("data-phase", "playing");
  await expect.poll(() => peak(stage)).toBeGreaterThan(0);
  const first = await origin(stage);

  // Seven hits in a row: the streak requests tier 1 for the next bar line.
  await perform(page, chart.slice(0, 7));
  await expect(stage).toHaveAttribute("data-hits", "7");
  await expect(stage).toHaveAttribute("data-streak", "7");
  await expect(stage).toHaveAttribute("data-misses", "0");
  await expect(stage).toHaveAttribute("data-tier", "1", { timeout: 4000 });
  const lifted = await page.evaluate(() => {
    const context = (
      globalThis as unknown as { thrusterProbe: { contexts: AudioContext[] } }
    ).thrusterProbe.contexts.at(-1)!;
    return (
      context.currentTime -
      ((context.baseLatency || 0) + (context.outputLatency || 0))
    );
  });
  // The audible lift lands on a downbeat, within a frame or two.
  const beat = (lifted - first) / secondsPerBeat;
  expect(beat % 4).toBeLessThan(0.25);
  expect(beat).toBeGreaterThan(chart[6].beat);

  // Missed notes leave gaps; the band plays on at its level.
  await expect
    .poll(async () => Number(await stage.getAttribute("data-misses")), {
      timeout: 4000,
    })
    .toBeGreaterThan(0);
  await expect.poll(() => peak(stage)).toBeGreaterThan(0);
  expectOnGrid(await starts(page), first);

  // Stop is immediate and silent; the stage replays from the top.
  await stage.press("Escape");
  await expect(stage).toHaveAttribute("data-phase", "idle");
  await expect.poll(() => owned(page)).toBe(0);
  await stage.press("Enter");
  await expect(stage).toHaveAttribute("data-phase", "playing");
  const second = await origin(stage);
  expect(second).toBeGreaterThan(first);
  await expect.poll(() => peak(stage)).toBeGreaterThan(0);
  await expect(stage).toHaveAttribute("data-tier", "0");

  // Hiding the tab mid-song stops the song and suspends the context.
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(stage).toHaveAttribute("data-phase", "idle");
  await expect
    .poll(async () => (await probe(page)).contexts)
    .toEqual(["suspended"]);
  const after = (await starts(page)).length;
  await page.waitForTimeout(400);
  expect((await starts(page)).length).toBe(after);
  // A suspended context fires no ended events; owned sources are disconnected.
  expect((await probe(page)).ownedSources).toBe(0);
  await page.evaluate(() => {
    Reflect.deleteProperty(document, "hidden");
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await stage.press("Enter");
  await expect(stage).toHaveAttribute("data-phase", "playing");
  expectOnGrid(await starts(page), await origin(stage));

  // Leaving the route disposes the song and its engine.
  await page
    .getByRole("navigation", { name: "Breadcrumb" })
    .getByRole("link")
    .click();
  await expect
    .poll(async () => {
      const result = await probe(page);
      return {
        connected: result.connected,
        contexts: result.contexts.filter((state) => state !== "closed"),
      };
    })
    .toEqual({ connected: 0, contexts: [] });
});

test("the whole track stays on the audio clock and ends on its own", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await recordStarts(page);
  await instrument(page, "normal", "riff-reactor");
  const stage = page.getByRole("group", stageName);
  await expect(stage).toHaveAttribute("data-ready", "true");
  await stage.focus();
  await stage.press("Enter");
  await expect(stage).toHaveAttribute("data-phase", "playing");
  const zero = await origin(stage);
  await expect(stage).toHaveAttribute("data-phase", "idle", {
    timeout: 75_000,
  });
  const band = expectOnGrid(await starts(page), zero);
  // The closing downbeat is exactly 128 beats after the first, with no drift.
  const last = Math.max(...band.map((entry) => entry.when));
  expect(Math.abs(last - (zero + 128 * secondsPerBeat))).toBeLessThan(1e-6);
  await expect.poll(() => owned(page)).toBe(0);
});
