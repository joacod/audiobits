import { afterEach, expect, test, vi } from "vitest";
import type { AudioEngine, Bus, Voice } from "audiobits";
import { createGroove } from "../catalog/experiences/groove-mixer/controller";

afterEach(() => vi.useRealTimers());

test("groove skips stalled steps, preserves muted levels, and cancels booked notes before restart", () => {
  vi.useFakeTimers();
  const context = { currentTime: 0, baseLatency: 0, outputLatency: 0 };
  const plays: { at: number; voice: Pick<Voice, "stop" | "ended"> }[] = [];
  const buses: Bus[] = [];
  const audio = {
    state: "running",
    native: { context },
    subscribe: () => () => {},
    bus(name: string) {
      const bus = {
        name,
        setGainDb: vi.fn(),
        setMuted: vi.fn(),
        dispose: vi.fn(),
      };
      buses.push(bus as unknown as Bus);
      return bus;
    },
    sound: () => ({
      play({ at }: { at: number }) {
        const voice = { stop: vi.fn(), ended: new Promise<void>(() => {}) };
        plays.push({ at, voice });
        return voice;
      },
      dispose: vi.fn(),
    }),
  } as unknown as AudioEngine;
  const groove = createGroove(audio);
  groove.setMix("bass", { level: 0.72, muted: true });
  groove.start();
  expect(plays).toHaveLength(3);
  expect(plays.every(({ at }) => at === 0.15)).toBe(true);
  expect(buses[2].setMuted).toHaveBeenLastCalledWith(true);
  groove.setMix("bass", { muted: false });
  expect(groove.mix.bass).toEqual({ level: 0.72, muted: false });
  expect(buses[2].setGainDb).toHaveBeenLastCalledWith(
    20 * Math.log10(0.72),
    0.04,
  );
  context.currentTime = 10;
  vi.advanceTimersByTime(25);
  // A stalled main thread never sends the old ten seconds of notes in a burst.
  expect(plays.slice(3).every(({ at }) => at >= 10.02)).toBe(true);
  expect(plays.length).toBeLessThanOrEqual(6);
  groove.stop();
  expect(
    plays.every(({ voice }) => vi.mocked(voice.stop).mock.calls.length === 1),
  ).toBe(true);
  expect(
    buses.every((bus) => vi.mocked(bus.dispose).mock.calls.length === 1),
  ).toBe(true);
  const stoppedCount = plays.length;
  vi.advanceTimersByTime(500);
  expect(plays).toHaveLength(stoppedCount);
  groove.start();
  expect(plays.slice(stoppedCount).map(({ at }) => at)).toEqual([
    10.15, 10.15, 10.15,
  ]);
  expect(groove.mix.bass.level).toBe(0.72);
  groove.dispose();
  expect(vi.getTimerCount()).toBe(0);
});
