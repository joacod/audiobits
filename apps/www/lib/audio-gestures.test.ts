import { afterEach, expect, it, vi } from "vitest";
import { AudioBitsError, type AudioEngine, type AudioState } from "audiobits";
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

it("retries host activation without starting idle engines or restarting gestures", () => {
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
  surface.dispatchEvent(new Event("touchstart"));
  expect(audio.start).not.toHaveBeenCalled();
  audio.state = "starting";
  const touch = new Event("touchstart", { cancelable: true });
  surface.dispatchEvent(touch);
  expect(audio.start).toHaveBeenCalledOnce();
  expect(session.type).toBe("playback");
  expect(touch.defaultPrevented).toBe(false);
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

it("accepts the first held touch even when transient activation is false", async () => {
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
  surface.addEventListener("pointerdown", () => {
    audio.state = "starting";
    hold();
  });
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
  await Promise.resolve();
  expect(audio.start).toHaveBeenCalledOnce();
  expect(hold).toHaveBeenCalledOnce();
  expect(activation.isActive).toBe(false);
  surface.dispatchEvent(new Event("touchend"));
  expect(audio.start).toHaveBeenCalledOnce();
  press();
  expect(hold).toHaveBeenCalledTimes(2);
  expect(stop).not.toHaveBeenCalled();
  unbind();
});

it("lets a native click activate a released hold without replaying it", async () => {
  vi.stubGlobal("navigator", {});
  const surface = new EventTarget() as HTMLElement;
  const audio = {
    state: "suspended" as AudioState,
    start: vi.fn(async () => {
      audio.state = "running";
    }),
    subscribe: () => () => {},
  };
  const stop = vi.fn();
  const error = vi.fn();
  const unbind = bindAudioGestures(
    surface,
    audio as unknown as AudioEngine,
    stop,
    error,
  );
  surface.dispatchEvent(new Event("click"));
  await Promise.resolve();
  expect(audio.start).toHaveBeenCalledOnce();
  expect(stop).not.toHaveBeenCalled();
  expect(error).not.toHaveBeenCalled();
  surface.dispatchEvent(new Event("click"));
  expect(audio.start).toHaveBeenCalledOnce();
  unbind();
});

it("reports click activation failures but ignores cancellation and teardown", async () => {
  vi.stubGlobal("navigator", {});
  const surface = new EventTarget() as HTMLElement;
  let reject!: (cause: unknown) => void;
  const audio = {
    state: "suspended" as AudioState,
    start: vi.fn(
      () =>
        new Promise<void>((_resolve, fail) => {
          reject = fail;
        }),
    ),
    subscribe: () => () => {},
  };
  const error = vi.fn();
  const unbind = bindAudioGestures(
    surface,
    audio as unknown as AudioEngine,
    vi.fn(),
    error,
  );
  surface.dispatchEvent(new Event("click"));
  const failure = new Error("Activation denied");
  reject(failure);
  await Promise.resolve();
  expect(error).toHaveBeenCalledExactlyOnceWith(failure);
  error.mockClear();
  surface.dispatchEvent(new Event("click"));
  reject(new AudioBitsError("start-cancelled", "Explicit interruption"));
  await Promise.resolve();
  expect(error).not.toHaveBeenCalled();
  surface.dispatchEvent(new Event("click"));
  unbind();
  reject(new Error("Activation ended after unmount"));
  await Promise.resolve();
  expect(error).not.toHaveBeenCalled();
  surface.dispatchEvent(new Event("click"));
  expect(audio.start).toHaveBeenCalledTimes(3);
});
