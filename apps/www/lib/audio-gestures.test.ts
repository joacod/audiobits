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

it("activates idle and suspended audio in native touch capture without playing sound", () => {
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
  expect(audio.start).toHaveBeenCalledOnce();
  expect(audio.sound).not.toHaveBeenCalled();
  expect(play).not.toHaveBeenCalled();
  audio.state = "suspended";
  surface.dispatchEvent(new Event("touchstart", { cancelable: true }));
  expect(audio.start).toHaveBeenCalledTimes(2);
  // Pointer-driven one-shots can already have a pending activation.
  audio.state = "starting";
  surface.dispatchEvent(new Event("touchstart", { cancelable: true }));
  expect(audio.start).toHaveBeenCalledTimes(3);
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

it("activates before the touch host while leaving a single hold owned by the host", async () => {
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
    expect(["starting", "running"]).toContain(audio.state);
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
  expect(audio.start).toHaveBeenCalledTimes(2);
  expect(audio.state).toBe("starting");
  await Promise.resolve();
  expect(audio.state).toBe("running");
  expect(hold).toHaveBeenCalledOnce();
  expect(activation.isActive).toBe(false);
  surface.dispatchEvent(new Event("touchend"));
  expect(audio.start).toHaveBeenCalledTimes(2);
  press();
  surface.dispatchEvent(new Event("touchstart", { cancelable: true }));
  expect(hold).toHaveBeenCalledTimes(2);
  expect(stop).not.toHaveBeenCalled();
  unbind();
});

it("does not report a late touch-start failure after the host cancels its hold", async () => {
  vi.stubGlobal("navigator", {});
  const surface = new EventTarget() as HTMLElement;
  let reject!: (cause: unknown) => void;
  const pending = new Promise<void>((_resolve, fail) => {
    reject = fail;
  });
  const audio = {
    state: "idle" as AudioState,
    start: vi.fn(() => {
      audio.state = "starting";
      return pending;
    }),
    subscribe: () => () => {},
  };
  const error = vi.fn();
  let holding = false;
  const unbind = bindAudioGestures(
    surface,
    audio as unknown as AudioEngine,
    vi.fn(),
    error,
  );
  surface.addEventListener("touchstart", () => {
    holding = true;
    void audio.start().catch((cause: unknown) => {
      if (holding) error(cause);
    });
  });
  surface.addEventListener("pointercancel", () => {
    holding = false;
  });
  surface.dispatchEvent(new Event("touchstart", { cancelable: true }));
  surface.dispatchEvent(new Event("pointercancel"));
  reject(new Error("Activation denied after cancellation"));
  await Promise.resolve();
  expect(error).not.toHaveBeenCalled();
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

function nativeDiagnostics() {
  vi.stubGlobal(
    "location",
    new URL("https://example.test/?error-details=true"),
  );
  vi.stubGlobal("navigator", {
    userActivation: { isActive: false, hasBeenActive: true },
  });
  let resolve!: () => void;
  let reject!: (cause: unknown) => void;
  const pending = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  class NativeContext extends EventTarget {
    state = "interrupted";
    currentTime = 0;
    sampleRate = 48000;
    resume() {
      return pending;
    }
  }
  vi.stubGlobal("AudioContext", NativeContext);
  const context = new NativeContext();
  const surface = Object.assign(new EventTarget(), {
    getAttribute: () => "Lightsaber stage",
    hasPointerCapture: () => false,
  }) as unknown as HTMLElement;
  const audio = {
    state: "suspended",
    start: vi.fn(() => context.resume()),
    subscribe: () => () => {},
  } as unknown as AudioEngine;
  const originalStart = audio.start;
  const originalResume = NativeContext.prototype.resume;
  const listeners = new AbortController();
  const record = observeAudioActivation(surface, audio, listeners.signal);
  const report = () =>
    JSON.parse(
      formatAudioActivationReport(new Error("Engine timeout"), surface),
    );
  return {
    audio,
    context,
    surface,
    listeners,
    record,
    report,
    pending,
    resolve,
    reject,
    originalStart,
    originalResume,
  };
}

it("observes pending native startup before engine activation without replacing promises", async () => {
  const d = nativeDiagnostics();
  let result: Promise<void> | undefined;
  d.surface.addEventListener("touchstart", (event) => {
    d.record(event);
    result = d.audio.start();
  });
  d.surface.dispatchEvent(new Event("touchstart", { cancelable: true }));
  expect(result).toBe(d.pending);
  expect(AudioContext.prototype.resume).toBe(d.originalResume);
  const failure = d.report();
  expect(failure).toMatchObject({
    report: "AudioBits activation v2",
    input: {
      engineState: "suspended",
      native: { state: "interrupted", currentTime: 0, sampleRate: 48000 },
      resume: { calls: 1, resolved: 0, rejected: 0, pending: 1 },
      events: expect.arrayContaining([
        expect.objectContaining({
          type: "native-resume",
          attempt: 1,
          userActivation: { isActive: false, hasBeenActive: true },
          gesture: {
            type: "touchstart",
            trusted: false,
            defaultPrevented: false,
            cancelable: true,
          },
        }),
      ]),
    },
  });
  expect(failure.input.resume.callStack).toContain(
    "Native audio resume requested",
  );
  // A native transition and promise resolution remain visible after the error.
  d.context.state = "running";
  d.context.currentTime = 0.25;
  d.context.dispatchEvent(new Event("statechange"));
  d.resolve();
  await d.pending;
  expect(d.report().input).toMatchObject({
    native: { state: "running", currentTime: 0.25 },
    resume: { resolved: 1, pending: 0 },
    events: expect.arrayContaining([
      expect.objectContaining({
        type: "native-state",
        native: { state: "running", currentTime: 0.25, sampleRate: 48000 },
      }),
      expect.objectContaining({ type: "native-resume-resolved", attempt: 1 }),
    ]),
  });
  expect(failure.input.resume.pending).toBe(1);
  // Native calls outside this engine's synchronous startup are not intercepted.
  await d.context.resume();
  expect(d.report().input.resume.calls).toBe(1);
  d.listeners.abort();
  expect(d.audio.start).toBe(d.originalStart);
  expect(d.report().input).toBeUndefined();
});

it("preserves native rejection details and bounds history across retries", async () => {
  const d = nativeDiagnostics();
  const pending = d.audio.start();
  const cause = new Error("Output device denied", {
    cause: new Error("Native reason"),
  });
  const failure = new DOMException("Playback blocked", "NotAllowedError");
  Object.defineProperty(failure, "cause", { value: cause });
  d.reject(failure);
  await expect(pending).rejects.toBe(failure);
  expect(d.report().input).toMatchObject({
    resume: { calls: 1, rejected: 1, pending: 0 },
    events: expect.arrayContaining([
      expect.objectContaining({
        type: "native-resume-rejected",
        attempt: 1,
        elapsedMs: expect.any(Number),
        error: {
          name: "NotAllowedError",
          message: "Playback blocked",
          stack: failure.stack,
          code: failure.code,
          cause: expect.objectContaining({ message: "Output device denied" }),
        },
      }),
    ]),
  });
  const throwingResume = () => {
    throw failure;
  };
  AudioContext.prototype.resume = throwingResume;
  expect(() => d.audio.start()).toThrow(failure);
  expect(AudioContext.prototype.resume).toBe(throwingResume);
  expect(d.report().input.resume).toMatchObject({ rejected: 2, pending: 0 });
  for (let i = 0; i < 45; i++) d.record(new Event("click"));
  expect(d.report().input.events).toHaveLength(40);
  expect(d.report().input.omittedEvents).toBeGreaterThan(0);
  d.listeners.abort();
});

it.each(["", "?error-details=false", "?error-details=1"])(
  "keeps friendly errors and disables diagnostic collection for %s",
  (search) => {
    vi.stubGlobal("location", new URL(`https://example.test/${search}`));
    const start = vi.fn();
    class NativeContext {
      resume() {}
    }
    vi.stubGlobal("AudioContext", NativeContext);
    const resume = NativeContext.prototype.resume;
    const audio = { start, subscribe: vi.fn() } as unknown as AudioEngine;
    const surface = new EventTarget() as HTMLElement;
    observeAudioActivation(
      surface,
      audio,
      new AbortController().signal,
    )(new Event("pointerdown"));
    const failure = new AudioBitsError("start-failed", "Technical failure");
    expect(audio.subscribe).not.toHaveBeenCalled();
    expect(audio.start).toBe(start);
    expect(NativeContext.prototype.resume).toBe(resume);
    expect(audioErrorMessage(failure)).toBe("Audio did not start.");
    expect(formatAudioActivationReport(failure, surface)).toBe("");
  },
);
