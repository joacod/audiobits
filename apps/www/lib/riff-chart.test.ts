import { expect, test } from "vitest";
import { createTransport } from "../../../catalog/experiences/riff-reactor/controller";
import { riffReactorSong as song } from "../../../catalog/experiences/riff-reactor/song";
import {
  buildChart,
  createPerformance,
  hitWindow,
  perfectWindow,
  tierForStreak,
  tierStreaks,
} from "./riff-chart";

const chart = buildChart(song);
// One clock: input times are AudioContext seconds, corrected for latency once.
const latency = 0.035;
const transport = createTransport(song.bpm, 12.5);
const heardBeat = (contextTime: number) =>
  transport.beatAt(contextTime - latency);
const pressedAt = (beat: number, offset: number) =>
  transport.timeAt(beat) + latency + offset;

test("lanes follow melodic contour and every lead note is charted once", () => {
  expect(chart.map((note) => note.index)).toEqual(song.lead.map((_, i) => i));
  for (let i = 1; i < chart.length; i++) {
    const step = Math.sign(song.lead[i].note! - song.lead[i - 1].note!);
    const lane = chart[i - 1].lane + step;
    expect(chart[i].lane).toBe(Math.max(0, Math.min(2, lane)));
  }
  expect(new Set(chart.map((note) => note.lane))).toEqual(new Set([0, 1, 2]));
});

test("presses at the edges of the hit window on the audio clock hit, outside miss", () => {
  const first = chart[0];
  for (const [offset, kind] of [
    [-hitWindow + 1e-6, "hit"],
    [hitWindow - 1e-6, "hit"],
    [-hitWindow - 1e-4, "stray"],
    [hitWindow + 1e-4, "stray"],
  ] as const) {
    const performance = createPerformance(chart, transport.secondsPerBeat);
    const judgement = performance.press(
      first.lane,
      heardBeat(pressedAt(first.beat, offset)),
    );
    expect(judgement.kind, `offset ${offset}`).toBe(kind);
    if (judgement.kind === "hit") {
      expect(judgement.note.index).toBe(0);
      expect(judgement.offset).toBeCloseTo(offset, 9);
      expect(judgement.grade).toBe("good");
    }
  }
  const performance = createPerformance(chart, transport.secondsPerBeat);
  const perfect = performance.press(
    first.lane,
    heardBeat(pressedAt(first.beat, perfectWindow - 1e-6)),
  );
  expect(perfect).toMatchObject({ kind: "hit", grade: "perfect" });
  // The wrong lane at the right time is not a hit.
  const wrong = createPerformance(chart, transport.secondsPerBeat);
  expect(
    wrong.press(
      ((first.lane + 1) % 3) as 0 | 1 | 2,
      heardBeat(pressedAt(first.beat, 0)),
    ).kind,
  ).toBe("stray");
});

test("a note is missed once its window closes, and streaks map to tiers", () => {
  const performance = createPerformance(chart, transport.secondsPerBeat);
  const window = hitWindow / transport.secondsPerBeat;
  // Still open just before the window closes, missed just after.
  expect(performance.sweep(chart[0].beat + window - 1e-6)).toEqual([]);
  expect(performance.sweep(chart[0].beat + window + 1e-6)).toEqual([chart[0]]);
  expect(performance.misses).toBe(1);
  expect(
    performance.press(chart[0].lane, heardBeat(pressedAt(chart[0].beat, 0)))
      .kind,
  ).toBe("stray");
  const fresh = createPerformance(chart, transport.secondsPerBeat);
  for (const note of chart.slice(0, tierStreaks[1]))
    expect(
      fresh.press(note.lane, heardBeat(pressedAt(note.beat, 0.01))).kind,
    ).toBe("hit");
  expect(fresh.streak).toBe(tierStreaks[1]);
  expect(fresh.tier).toBe(2);
  // A miss at the top tier falls back to the start of tier 1, not to zero.
  fresh.sweep(chart[tierStreaks[1]].beat + window + 1e-6);
  expect(fresh.streak).toBe(tierStreaks[0]);
  expect(fresh.tier).toBe(1);
  expect([0, 5, 6, 15, 16].map(tierForStreak)).toEqual([0, 0, 1, 1, 2]);
});
