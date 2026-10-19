import { afterEach, beforeEach, expect, it, vi } from "vitest";

const { createAudio } = vi.hoisted(() => ({ createAudio: vi.fn() }));
vi.mock("../../../catalog/experiences/lightsaber/host", () => ({
  createLightsaberAudio: createAudio,
}));
import {
  prepareLightsaberNavigationAudio,
  takeLightsaberNavigationAudio,
} from "./lightsaber-navigation-audio";

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "window",
    Object.assign(new EventTarget(), {
      location: { pathname: "/catalog" },
      setTimeout,
      clearTimeout,
    }),
  );
  vi.stubGlobal(
    "document",
    Object.assign(new EventTarget(), { hidden: false }),
  );
  vi.stubGlobal("navigator", {});
});

afterEach(() => {
  takeLightsaberNavigationAudio();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.clearAllMocks();
});

it("starts synchronously and transfers one engine and its disposal to the stage", async () => {
  const audio = {
    start: vi.fn(async () => {}),
    dispose: vi.fn(async () => {}),
  };
  createAudio.mockReturnValue(audio);
  prepareLightsaberNavigationAudio();
  expect(audio.start).toHaveBeenCalledOnce();
  prepareLightsaberNavigationAudio();
  expect(takeLightsaberNavigationAudio()).toBe(audio);
  expect(takeLightsaberNavigationAudio()).toBeUndefined();
  window.dispatchEvent(new Event("pagehide"));
  await vi.runAllTimersAsync();
  expect(audio.dispose).not.toHaveBeenCalled();
  // Clicking the current stage's navigation link must not start another engine.
  window.location.pathname = "/catalog/lightsaber";
  prepareLightsaberNavigationAudio();
  expect(createAudio).toHaveBeenCalledOnce();
});

it("disposes an unclaimed engine when navigation stalls or the page hides", async () => {
  const audio = {
    start: vi.fn(async () => {}),
    dispose: vi.fn(async () => {}),
  };
  createAudio.mockReturnValue(audio);
  prepareLightsaberNavigationAudio();
  await vi.runAllTimersAsync();
  expect(takeLightsaberNavigationAudio()).toBeUndefined();
  expect(audio.dispose).toHaveBeenCalledOnce();
  prepareLightsaberNavigationAudio();
  Object.defineProperty(document, "hidden", { value: true });
  document.dispatchEvent(new Event("visibilitychange"));
  expect(takeLightsaberNavigationAudio()).toBeUndefined();
  expect(audio.dispose).toHaveBeenCalledTimes(2);
});

it("discards failed warmup but leaves a claimed engine's failures to its host", async () => {
  let fail!: (cause: Error) => void;
  const audio = {
    start: vi.fn(
      () =>
        new Promise<void>((_, reject) => {
          fail = reject;
        }),
    ),
    dispose: vi.fn(async () => {}),
  };
  createAudio.mockReturnValue(audio);
  prepareLightsaberNavigationAudio();
  fail(new Error("Denied"));
  await Promise.resolve();
  expect(audio.dispose).toHaveBeenCalledOnce();
  expect(takeLightsaberNavigationAudio()).toBeUndefined();
  prepareLightsaberNavigationAudio();
  expect(takeLightsaberNavigationAudio()).toBe(audio);
  fail(new Error("Denied after transfer"));
  await Promise.resolve();
  expect(audio.dispose).toHaveBeenCalledOnce();
});
