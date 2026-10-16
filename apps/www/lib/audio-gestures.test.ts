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

it("starts idle and resumable engines from a native touchstart and prevents its default", () => {
  vi.stubGlobal("navigator", {});
  const surface = new EventTarget() as HTMLElement;
  const play = vi.fn();
  const audio = {
    state: "idle" as AudioState,
    sound: vi.fn(() => ({ play })),
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
  const touch = new Event("touchstart", { cancelable: true });
  surface.dispatchEvent(touch);
  expect(touch.defaultPrevented).toBe(true);
  expect(audio.start).toHaveBeenCalledOnce();
  expect(audio.sound).not.toHaveBeenCalled();
  expect(play).not.toHaveBeenCalled();
  audio.state = "suspended";
  surface.dispatchEvent(new Event("touchstart", { cancelable: true }));
  expect(audio.start).toHaveBeenCalledTimes(2);
  // A held gesture already owns its pending native activation.
  audio.state = "starting";
  surface.dispatchEvent(new Event("touchstart", { cancelable: true }));
  expect(audio.start).toHaveBeenCalledTimes(3);
  // A live engine must not restart from later contact.
  audio.state = "running";
  surface.dispatchEvent(new Event("touchstart", { cancelable: true }));
  expect(audio.start).toHaveBeenCalledTimes(3);
  expect(stop).not.toHaveBeenCalled();
  unbind();
});

it("leaves an idle engine idle on release and retries resumable holds on touchend", () => {
  vi.stubGlobal("navigator", {});
  const surface = new EventTarget() as HTMLElement;
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
  surface.dispatchEvent(new Event("touchend"));
  expect(audio.start).not.toHaveBeenCalled();
  audio.state = "suspended";
  surface.dispatchEvent(new Event("touchend"));
  expect(audio.start).toHaveBeenCalledOnce();
  audio.state = "interrupted";
  surface.dispatchEvent(new Event("touchend"));
  expect(audio.start).toHaveBeenCalledTimes(2);
  expect(stop).not.toHaveBeenCalled();
  unbind();
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

it("reports genuine touch activation failures but ignores cancellation and teardown", async () => {
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
  surface.dispatchEvent(new Event("touchstart", { cancelable: true }));
  const failure = new Error("Activation denied");
  reject(failure);
  await Promise.resolve();
  expect(error).toHaveBeenCalledExactlyOnceWith(failure);
  error.mockClear();
  surface.dispatchEvent(new Event("touchstart", { cancelable: true }));
  reject(new AudioBitsError("start-cancelled", "Explicit interruption"));
  await Promise.resolve();
  expect(error).not.toHaveBeenCalled();
  surface.dispatchEvent(new Event("touchstart", { cancelable: true }));
  unbind();
  reject(new Error("Activation ended after unmount"));
  await Promise.resolve();
  expect(error).not.toHaveBeenCalled();
  surface.dispatchEvent(new Event("touchstart", { cancelable: true }));
  expect(audio.start).toHaveBeenCalledTimes(3);
});

it("clears stale activation errors when the engine reaches running", async () => {
  vi.stubGlobal("navigator", {});
  const surface = new EventTarget() as HTMLElement;
  let notify!: (state: AudioState) => void;
  let reject!: (cause: unknown) => void;
  const audio = {
    state: "suspended" as AudioState,
    start: vi.fn(
      () =>
        new Promise<void>((_resolve, fail) => {
          reject = fail;
        }),
    ),
    subscribe: (listener: typeof notify) => {
      notify = listener;
      return () => {};
    },
  };
  const error = vi.fn();
  const recovered = vi.fn();
  const unbind = bindAudioGestures(
    surface,
    audio as unknown as AudioEngine,
    vi.fn(),
    error,
    recovered,
  );
  surface.dispatchEvent(new Event("touchstart", { cancelable: true }));
  reject(new Error("Activation denied"));
  await Promise.resolve();
  expect(error).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ message: "Activation denied" }),
  );
  surface.dispatchEvent(new Event("touchstart", { cancelable: true }));
  await Promise.resolve();
  audio.state = "running";
  notify("running");
  expect(recovered).toHaveBeenCalledOnce();
  unbind();
});
