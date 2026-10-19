import { afterEach, beforeEach, expect, it, vi } from "vitest";

const { createAudio } = vi.hoisted(() => ({ createAudio: vi.fn() }));
vi.mock("../../../catalog/experiences/lightsaber/host", () => ({
  createLightsaberAudio: createAudio,
}));
vi.mock("../../../catalog/experiences/reactive-thruster/host", () => ({
  createThrusterAudio: createAudio,
}));
vi.mock("../../../catalog/experiences/energy-charge/host", () => ({
  createEnergyChargeAudio: createAudio,
}));
import {
  prepareExperienceNavigationAudio,
  takeExperienceAudio,
} from "./experience-audio";

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "window",
    Object.assign(new EventTarget(), {
      location: new URL("https://example.test/catalog"),
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
  takeExperienceAudio("lightsaber", null);
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
  prepareExperienceNavigationAudio("/catalog/lightsaber");
  expect(audio.start).toHaveBeenCalledOnce();
  prepareExperienceNavigationAudio("/catalog/lightsaber");
  expect(takeExperienceAudio("lightsaber", null)).toBe(audio);
  expect(takeExperienceAudio("lightsaber", null)).toBeUndefined();
  window.dispatchEvent(new Event("pagehide"));
  await vi.runAllTimersAsync();
  expect(audio.dispose).not.toHaveBeenCalled();
  // Clicking the current stage's navigation link must not start another engine.
  window.location.pathname = "/catalog/lightsaber";
  prepareExperienceNavigationAudio("/catalog/lightsaber");
  expect(createAudio).toHaveBeenCalledOnce();
});

it("disposes an unclaimed engine when navigation stalls or the page hides", async () => {
  const audio = {
    start: vi.fn(async () => {}),
    dispose: vi.fn(async () => {}),
  };
  createAudio.mockReturnValue(audio);
  prepareExperienceNavigationAudio("/catalog/lightsaber");
  await vi.runAllTimersAsync();
  expect(takeExperienceAudio("lightsaber", null)).toBeUndefined();
  expect(audio.dispose).toHaveBeenCalledOnce();
  prepareExperienceNavigationAudio("/catalog/lightsaber");
  Object.defineProperty(document, "hidden", { value: true });
  document.dispatchEvent(new Event("visibilitychange"));
  expect(takeExperienceAudio("lightsaber", null)).toBeUndefined();
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
  prepareExperienceNavigationAudio("/catalog/lightsaber");
  fail(new Error("Denied"));
  await Promise.resolve();
  expect(audio.dispose).toHaveBeenCalledOnce();
  expect(takeExperienceAudio("lightsaber", null)).toBeUndefined();
  prepareExperienceNavigationAudio("/catalog/lightsaber");
  expect(takeExperienceAudio("lightsaber", null)).toBe(audio);
  fail(new Error("Denied after transfer"));
  await Promise.resolve();
  expect(audio.dispose).toHaveBeenCalledOnce();
});

it("replaces abandoned destinations and never transfers an engine to a different experience", () => {
  const blade = {
    start: vi.fn(async () => {}),
    dispose: vi.fn(async () => {}),
  };
  const charge = {
    start: vi.fn(async () => {}),
    dispose: vi.fn(async () => {}),
  };
  createAudio.mockReturnValueOnce(blade).mockReturnValueOnce(charge);
  prepareExperienceNavigationAudio("/catalog/lightsaber");
  prepareExperienceNavigationAudio("/catalog/energy-charge");
  expect(blade.dispose).toHaveBeenCalledOnce();
  expect(takeExperienceAudio("reactive-thruster", null)).toBeUndefined();
  expect(charge.dispose).toHaveBeenCalledOnce();
});

it("prepares the landing thruster but ignores unrelated or external destinations", () => {
  const audio = {
    state: "running",
    start: vi.fn(async () => {}),
    dispose: vi.fn(async () => {}),
  };
  createAudio.mockReturnValue(audio);
  prepareExperienceNavigationAudio("/docs");
  prepareExperienceNavigationAudio("https://elsewhere.test/catalog/lightsaber");
  expect(createAudio).not.toHaveBeenCalled();
  prepareExperienceNavigationAudio("/");
  const surface = { dataset: {} } as HTMLElement;
  expect(takeExperienceAudio("reactive-thruster", surface)).toBe(audio);
  expect(surface.dataset).toEqual({
    audioEntry: "navigation",
    audioEntryState: "running",
  });
});
