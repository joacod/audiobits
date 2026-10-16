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

it("activates from touchstart before pointerdown and retries without restarting gestures", () => {
  const session = { type: "auto" };
  vi.stubGlobal("navigator", { audioSession: session });
  const surface = Object.assign(new EventTarget(), {
    dataset: {},
  }) as HTMLElement;
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
  surface.dispatchEvent(new Event("touchend"));
  expect(audio.start).not.toHaveBeenCalled();
  const touch = new Event("touchstart", { cancelable: true });
  surface.dispatchEvent(touch);
  expect(audio.start).toHaveBeenCalledOnce();
  expect(session.type).toBe("playback");
  expect(touch.defaultPrevented).toBe(true);
  audio.state = "starting";
  surface.dispatchEvent(new Event("touchstart"));
  surface.dispatchEvent(new Event("touchend"));
  expect(audio.start).toHaveBeenCalledTimes(3);
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
  expect(audio.start).toHaveBeenCalledTimes(3);
  expect(
    surface.dispatchEvent(new Event("contextmenu", { cancelable: true })),
  ).toBe(true);
});

it("unlocks on release before accepting a hold when activation is unavailable", async () => {
  const activation = { isActive: false };
  vi.stubGlobal("navigator", { userActivation: activation });
  const surface = Object.assign(new EventTarget(), {
    dataset: {},
  }) as HTMLElement;
  const audio = {
    state: "idle" as AudioState,
    start: vi.fn(async () => {
      audio.state = "running";
    }),
    subscribe: () => () => {},
  };
  const stop = vi.fn();
  const unbind = bindAudioGestures(
    surface,
    audio as unknown as AudioEngine,
    stop,
    vi.fn(),
  );
  const hold = vi.fn();
  surface.addEventListener("pointerdown", hold);
  const press = () =>
    surface.dispatchEvent(
      Object.assign(new Event("pointerdown", { cancelable: true }), {
        pointerType: "touch",
        isPrimary: true,
        button: 0,
      }),
    );
  press();
  surface.dispatchEvent(new Event("touchstart", { cancelable: true }));
  expect(hold).not.toHaveBeenCalled();
  expect(audio.start).not.toHaveBeenCalled();
  expect(surface.dataset.audioActivation).toBe("release");
  activation.isActive = true;
  surface.dispatchEvent(new Event("touchend"));
  await Promise.resolve();
  expect(audio.start).toHaveBeenCalledOnce();
  expect(surface.dataset.audioActivation).toBeUndefined();
  expect(hold).not.toHaveBeenCalled();
  press();
  expect(hold).toHaveBeenCalledOnce();
  expect(stop).not.toHaveBeenCalled();
  unbind();
});
