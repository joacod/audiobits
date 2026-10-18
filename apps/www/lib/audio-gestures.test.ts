import { afterEach, expect, it, vi } from "vitest";
import { AudioBitsError, type AudioEngine, type AudioState } from "audiobits";
import { bindAudioGestures, prepareAudioPlayback } from "./audio-gestures";
import {
  audioErrorMessage,
  observeAudioActivation,
  formatAudioActivationReport,
} from "./audio-activation-report";

afterEach(() => vi.unstubAllGlobals());

it("prepares playback when supported and leaves unsupported navigators usable", () => {
  vi.stubGlobal("navigator", {});
  expect(() => prepareAudioPlayback()).not.toThrow();
  const session = { type: "auto" };
  vi.stubGlobal("navigator", { audioSession: session });
  prepareAudioPlayback();
  expect(session.type).toBe("playback");
});

it("leaves initial touch startup to the host and only retries an existing start", () => {
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
  expect(touch.defaultPrevented).toBe(false);
  expect(audio.start).not.toHaveBeenCalled();
  expect(audio.sound).not.toHaveBeenCalled();
  expect(play).not.toHaveBeenCalled();
  audio.state = "suspended";
  surface.dispatchEvent(new Event("touchstart", { cancelable: true }));
  expect(audio.start).not.toHaveBeenCalled();
  // One-shots that started on pointerdown still need a native touch retry.
  audio.state = "starting";
  surface.dispatchEvent(new Event("touchstart", { cancelable: true }));
  expect(audio.start).toHaveBeenCalledOnce();
  audio.state = "running";
  surface.dispatchEvent(new Event("touchstart", { cancelable: true }));
  expect(audio.start).toHaveBeenCalledOnce();
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

it("lets the host activate once synchronously in touchstart while preserving its pending hold", async () => {
  const activation = { isActive: false };
  vi.stubGlobal("navigator", { userActivation: activation });
  const surface = Object.assign(new EventTarget(), {
    dataset: {},
  }) as HTMLElement;
  const audio = {
    state: "idle" as AudioState,
    start: vi.fn(async () => {
      audio.state = "starting";
      await Promise.resolve();
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
  surface.addEventListener("touchstart", () => {
    hold();
    void audio.start();
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
  const touch = new Event("touchstart", { cancelable: true });
  surface.dispatchEvent(touch);
  expect(touch.defaultPrevented).toBe(false);
  expect(audio.start).toHaveBeenCalledOnce();
  expect(audio.state).toBe("starting");
  await Promise.resolve();
  expect(audio.state).toBe("running");
  expect(hold).toHaveBeenCalledOnce();
  expect(activation.isActive).toBe(false);
  surface.dispatchEvent(new Event("touchend"));
  expect(audio.start).toHaveBeenCalledOnce();
  press();
  surface.dispatchEvent(new Event("touchstart", { cancelable: true }));
  expect(hold).toHaveBeenCalledTimes(2);
  expect(stop).not.toHaveBeenCalled();
  unbind();
});

it("reports genuine touch activation failures but ignores cancellation and teardown", async () => {
  vi.stubGlobal(
    "location",
    new URL("https://example.test/?error-details=true"),
  );
  vi.stubGlobal("navigator", {});
  const document = new EventTarget();
  const surface = Object.assign(new EventTarget(), {
    ownerDocument: document,
    getAttribute: () => "Hold to charge",
    hasPointerCapture: () => false,
  }) as unknown as HTMLElement;
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
  surface.dispatchEvent(
    Object.assign(new Event("pointerdown"), {
      pointerId: 1,
      pointerType: "touch",
    }),
  );
  surface.dispatchEvent(new Event("touchend", { cancelable: true }));
  const failure = new Error("Activation denied");
  reject(failure);
  await Promise.resolve();
  expect(error).toHaveBeenCalledExactlyOnceWith(failure);
  // Host failure can drop capture before reporting without a physical release.
  surface.dispatchEvent(
    Object.assign(new Event("lostpointercapture"), {
      pointerId: 1,
    }),
  );
  const report = formatAudioActivationReport(failure, surface);
  expect(JSON.parse(report)).toMatchObject({
    error: { name: "Error", message: "Activation denied" },
    input: { pointersWithoutUpOrCancel: [1], capturedPointers: [] },
  });
  // An up outside the pad is observed, but cannot rewrite the captured report.
  document.dispatchEvent(
    Object.assign(new Event("pointerup"), { pointerId: 1 }),
  );
  expect(
    JSON.parse(formatAudioActivationReport(failure, surface)).input
      .pointersWithoutUpOrCancel,
  ).toEqual([]);
  expect(JSON.parse(report).input.pointersWithoutUpOrCancel).toEqual([1]);
  error.mockClear();
  surface.dispatchEvent(new Event("touchend", { cancelable: true }));
  reject(new AudioBitsError("start-cancelled", "Explicit interruption"));
  await Promise.resolve();
  expect(error).not.toHaveBeenCalled();
  surface.dispatchEvent(new Event("touchend", { cancelable: true }));
  unbind();
  reject(new Error("Activation ended after unmount"));
  await Promise.resolve();
  expect(error).not.toHaveBeenCalled();
  surface.dispatchEvent(new Event("touchend", { cancelable: true }));
  expect(audio.start).toHaveBeenCalledTimes(3);
  expect(
    JSON.parse(formatAudioActivationReport(failure, surface)).input,
  ).toBeUndefined();
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
  surface.dispatchEvent(new Event("touchend", { cancelable: true }));
  reject(new Error("Activation denied"));
  await Promise.resolve();
  expect(error).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ message: "Activation denied" }),
  );
  surface.dispatchEvent(new Event("touchend", { cancelable: true }));
  await Promise.resolve();
  audio.state = "running";
  notify("running");
  expect(recovered).toHaveBeenCalledOnce();
  unbind();
});

it("preserves exact error details and reports audio-session preparation failures", () => {
  vi.stubGlobal(
    "location",
    new URL("https://example.test/?error-details=true"),
  );
  const failure = new DOMException(
    "Playback session denied",
    "NotAllowedError",
  );
  vi.stubGlobal("navigator", {
    audioSession: {
      get type() {
        return "auto";
      },
      set type(_value: string) {
        throw failure;
      },
    },
  });
  const surface = Object.assign(new EventTarget(), {
    getAttribute: () => "Hold to charge",
    hasPointerCapture: () => false,
  }) as unknown as HTMLElement;
  const audio = {
    state: "idle",
    subscribe: () => () => {},
  } as unknown as AudioEngine;
  let report = "";
  const unbind = bindAudioGestures(surface, audio, vi.fn(), (cause) => {
    report = formatAudioActivationReport(cause, surface);
  });
  surface.dispatchEvent(new Event("pointerdown"));
  expect(JSON.parse(report).error).toMatchObject({
    name: "NotAllowedError",
    message: "Playback session denied",
  });
  expect(
    audioErrorMessage(new AudioBitsError("start-failed", "Exact failure")),
  ).toBe("AudioBitsError [start-failed]: Exact failure");
  unbind();
});

it.each(["", "?error-details=false", "?error-details=1"])(
  "keeps friendly errors and disables diagnostic collection for %s",
  (search) => {
    vi.stubGlobal("location", new URL(`https://example.test/${search}`));
    const audio = { subscribe: vi.fn() } as unknown as AudioEngine;
    const surface = new EventTarget() as HTMLElement;
    observeAudioActivation(
      surface,
      audio,
      new AbortController().signal,
    )(new Event("pointerdown"));
    const failure = new AudioBitsError("start-failed", "Technical failure");
    expect(audio.subscribe).not.toHaveBeenCalled();
    expect(audioErrorMessage(failure)).toBe("Audio did not start.");
    expect(formatAudioActivationReport(failure, surface)).toBe("");
  },
);
