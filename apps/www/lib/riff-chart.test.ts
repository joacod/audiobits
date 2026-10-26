import { expect, test } from "vitest";
import { createTransport } from "../../../catalog/experiences/riff-reactor/controller";
import { riffReactorSong as song } from "../../../catalog/experiences/riff-reactor/song";
import {
  buildChart,
  createPerformance,
  hitWindow,
  inputTime,
  maxInputDelay,
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

test("the lead enters promptly with space to learn before the denser finale", () => {
  const bars = Array.from({ length: song.bars }, (_, bar) =>
    chart.filter((note) => note.beat >= bar * 4 && note.beat < (bar + 1) * 4),
  );
  expect(chart[0].beat * transport.secondsPerBeat).toBeLessThan(4);
  for (const bar of bars.slice(2, 6)) {
    expect(bar.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < bar.length; i++)
      expect(bar[i].beat - bar[i - 1].beat).toBeGreaterThanOrEqual(1);
  }
  // The opening answers rather than repeating identical pitch and timing data.
  const pitches = (bar: number) =>
    song.lead
      .filter((note) => note.beat >= bar * 4 && note.beat < (bar + 1) * 4)
      .map((note) => note.note);
  expect(pitches(2)).not.toEqual(pitches(3));
  const density = (from: number, to: number) =>
    bars.slice(from, to).flat().length;
  expect(density(28, 32)).toBeGreaterThan(density(12, 16));
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
  // A press handled late on a busy main thread is judged at its event stamp.
  const stamp = 5000;
  const busy = createPerformance(chart, transport.secondsPerBeat);
  const handled = inputTime(
    pressedAt(first.beat, 0.02) + 0.15,
    stamp + 150,
    stamp,
  );
  const credited = busy.press(first.lane, heardBeat(handled));
  expect(credited).toMatchObject({ kind: "hit", grade: "perfect" });
  if (credited.kind === "hit") expect(credited.offset).toBeCloseTo(0.02, 9);
  // Without the stamp the same press would be a stray.
  expect(
    createPerformance(chart, transport.secondsPerBeat).press(
      first.lane,
      heardBeat(pressedAt(first.beat, 0.02) + 0.15),
    ).kind,
  ).toBe("stray");
  // Implausible stamps (future, or older than the limit) credit nothing.
  expect(inputTime(10, stamp, stamp + 5)).toBe(10);
  expect(inputTime(10, stamp + maxInputDelay * 1000 + 1, stamp)).toBe(10);
  expect(inputTime(10, stamp, Number.NaN)).toBe(10);
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
