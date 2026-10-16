import { afterEach, expect, it, vi } from "vitest";
import type { AudioEngine, AudioState } from "audiobits";
import { bindAudioGestures, prepareAudioPlayback } from "./audio-gestures";

afterEach(() => vi.unstubAllGlobals());

it("prepares playback when supported and leaves unsupported navigators usable", () => {
  vi.stubGlobal("navigator", {});
  expect(() => prepareAudioPlayback()).not.toThrow();
  const session = { type: "auto" };
  vi.stubGlobal("navigator", { audioSession: session });
  prepareAudioPlayback();
  expect(session.type).toBe("playback");
});

it("retries pending touch activation without starting idle audio or restarting gestures", () => {
  vi.stubGlobal("navigator", {});
  const surface = new EventTarget() as HTMLElement;
  let notify!: (state: AudioState) => void;
  const unsubscribe = vi.fn();
  const audio = {
    state: "idle" as AudioState,
    start: vi.fn(async () => {}),
    subscribe: (listener: typeof notify) => {
      notify = listener;
      return unsubscribe;
    },
  };
  const stop = vi.fn();
  const unbind = bindAudioGestures(
    surface,
    audio as unknown as AudioEngine,
    stop,
    vi.fn(),
  );
  surface.dispatchEvent(new Event("touchstart"));
  expect(audio.start).not.toHaveBeenCalled();
  audio.state = "starting";
  surface.dispatchEvent(new Event("touchstart"));
  surface.dispatchEvent(new Event("touchend"));
  expect(audio.start).toHaveBeenCalledTimes(2);
  expect(stop).not.toHaveBeenCalled();
  audio.state = "running";
  notify("running");
  audio.state = "interrupted";
  notify("interrupted");
  expect(stop).toHaveBeenCalledOnce();
  expect(
    surface.dispatchEvent(new Event("dragstart", { cancelable: true })),
  ).toBe(false);
  unbind();
  expect(unsubscribe).toHaveBeenCalledOnce();
  surface.dispatchEvent(new Event("touchend"));
  expect(audio.start).toHaveBeenCalledTimes(2);
  expect(
    surface.dispatchEvent(new Event("contextmenu", { cancelable: true })),
  ).toBe(true);
});
