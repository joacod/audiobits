import { AudioBitsError, type AudioEngine } from "audiobits";

// Troubleshooting: append ?error-details=true to the page URL and reload
// before reproducing the issue. Any other value leaves diagnostics disabled.
export function errorDetailsEnabled() {
  return (
    new URLSearchParams(globalThis.location?.search ?? "").get(
      "error-details",
    ) === "true"
  );
}

export function audioErrorMessage(cause: unknown) {
  if (!errorDetailsEnabled()) return "Audio did not start.";
  if (!(cause instanceof Error)) return String(cause);
  const code = cause instanceof AudioBitsError ? ` [${cause.code}]` : "";
  return `${cause.name}${code}: ${cause.message}`;
}

function errorDetails(cause: unknown, depth = 0): unknown {
  if (!(cause instanceof Error)) return { message: String(cause) };
  return {
    name: cause.name,
    code: "code" in cause ? cause.code : undefined,
    message: cause.message,
    stack: cause.stack?.slice(0, 4000),
    cause:
      cause.cause !== undefined && depth < 3
        ? errorDetails(cause.cause, depth + 1)
        : undefined,
  };
}

function contextState(context: AudioContext) {
  return {
    state: context.state,
    currentTime: context.currentTime,
    sampleRate: context.sampleRate,
  };
}

function nativeState(audio: AudioEngine, observed?: AudioContext) {
  if (observed) return contextState(observed);
  try {
    return contextState(audio.native.context);
  } catch {
    return "not observed: no native resume call captured yet";
  }
}

const reports = new WeakMap<HTMLElement, () => unknown>();

function activation() {
  const value = navigator.userActivation;
  return value
    ? { isActive: value.isActive, hasBeenActive: value.hasBeenActive }
    : "unavailable";
}

/** Observe startup and input only. Never activate, retry or schedule sound. */
export function observeAudioActivation(
  surface: HTMLElement,
  audio: AudioEngine,
  signal: AbortSignal,
): (event: Event) => void {
  if (!errorDetailsEnabled() || signal.aborted) return () => {};
  const startedAt = performance.now();
  const events: object[] = [];
  const pointers = new Set<number>();
  const touches = new Set<number>();
  const seen = new WeakSet<Event>();
  let native: AudioContext | undefined;
  let currentEvent: Event | undefined;
  let resumeCallStack: string | undefined;
  let resumeCalls = 0,
    resumeResolved = 0,
    resumeRejected = 0;
  let omittedEvents = 0;
  const append = (entry: object) => {
    if (signal.aborted) return;
    events.push({
      atMs: Math.round(performance.now() - startedAt),
      engineState: audio.state,
      userActivation: activation(),
      ...entry,
    });
    if (events.length > 40) {
      events.shift();
      omittedEvents++;
    }
  };
  const observeContext = (context: AudioContext) => {
    if (native === context) return;
    native = context;
    context.addEventListener(
      "statechange",
      () => append({ type: "native-state", native: contextState(context) }),
      { signal },
    );
  };
  const start = audio.start;
  if (
    typeof start === "function" &&
    typeof globalThis.AudioContext?.prototype.resume === "function"
  ) {
    // Capture this engine's context without exposing library internals. Patch
    // resume only for the synchronous start() call and restore it immediately,
    // before awaiting anything. Return both original promises unchanged.
    const observedStart = function (this: AudioEngine) {
      const prototype = globalThis.AudioContext?.prototype;
      const resume = prototype?.resume;
      const canObserve =
        typeof resume === "function" &&
        Object.getOwnPropertyDescriptor(prototype, "resume")?.writable;
      if (!canObserve) return start.call(this);
      const observedResume = function (this: AudioContext) {
        observeContext(this);
        const attempt = ++resumeCalls;
        const at = performance.now();
        const gesture =
          surface.ownerDocument?.defaultView?.event ?? currentEvent;
        resumeCallStack ??= new Error(
          "Native audio resume requested",
        ).stack?.slice(0, 4000);
        append({
          type: "native-resume",
          attempt,
          native: contextState(this),
          gesture: gesture
            ? {
                type: gesture.type,
                trusted: gesture.isTrusted,
                defaultPrevented: gesture.defaultPrevented,
                cancelable: gesture.cancelable,
              }
            : null,
        });
        const settled = (rejected: boolean, cause?: unknown) => {
          if (rejected) resumeRejected++;
          else resumeResolved++;
          append({
            type: rejected
              ? "native-resume-rejected"
              : "native-resume-resolved",
            attempt,
            elapsedMs: Math.round(performance.now() - at),
            native: contextState(this),
            ...(rejected ? { error: errorDetails(cause) } : {}),
          });
        };
        try {
          const pending = resume.call(this);
          void pending.then(
            () => settled(false),
            (cause: unknown) => settled(true, cause),
          );
          return pending;
        } catch (cause) {
          settled(true, cause);
          throw cause;
        }
      };
      prototype.resume = observedResume;
      try {
        return start.call(this);
      } finally {
        prototype.resume = resume;
      }
    };
    audio.start = observedStart;
    signal.addEventListener(
      "abort",
      () => {
        if (audio.start === observedStart) audio.start = start;
      },
      { once: true },
    );
  }
  const unsubscribe = audio.subscribe((state) => {
    append({ type: "engine-state", state, native: nativeState(audio, native) });
  });
  const record = (event: Event) => {
    if (seen.has(event)) return;
    seen.add(event);
    currentEvent = event;
    queueMicrotask(() => {
      if (currentEvent === event) currentEvent = undefined;
    });
    if (event.type === "pointerdown")
      pointers.add((event as PointerEvent).pointerId);
    if (event.type === "pointerup" || event.type === "pointercancel")
      pointers.delete((event as PointerEvent).pointerId);
    if ("changedTouches" in event) {
      for (const touch of Array.from((event as TouchEvent).changedTouches)) {
        if (event.type === "touchstart") touches.add(touch.identifier);
        else touches.delete(touch.identifier);
      }
    }
    append({
      type: event.type,
      trusted: event.isTrusted,
      defaultPrevented: event.defaultPrevented,
      cancelable: event.cancelable,
      ...("pointerId" in event
        ? {
            pointerId: (event as PointerEvent).pointerId,
            pointerType: (event as PointerEvent).pointerType,
            isPrimary: (event as PointerEvent).isPrimary,
            button: (event as PointerEvent).button,
            buttons: (event as PointerEvent).buttons,
          }
        : {}),
      ...("touches" in event
        ? { touches: (event as TouchEvent).touches.length }
        : {}),
    });
  };
  const options = { capture: true, passive: true, signal };
  // Capture can be released by error cleanup while the finger is still down.
  // Only actual up/cancel events close the observed press, even outside the pad.
  const document = surface.ownerDocument ?? surface;
  for (const type of ["pointerup", "pointercancel"] as const)
    document.addEventListener(
      type,
      (event) => {
        if (pointers.has((event as PointerEvent).pointerId)) record(event);
      },
      options,
    );
  for (const type of ["touchend", "touchcancel"] as const)
    document.addEventListener(
      type,
      (event) => {
        if (
          Array.from((event as TouchEvent).changedTouches ?? []).some((touch) =>
            touches.has(touch.identifier),
          )
        )
          record(event);
      },
      options,
    );
  for (const type of [
    "gotpointercapture",
    "lostpointercapture",
    "focus",
    "blur",
    "mousedown",
    "click",
  ])
    surface.addEventListener(type, record, options);
  surface.ownerDocument?.addEventListener("visibilitychange", record, options);
  for (const type of ["pagehide", "blur"])
    surface.ownerDocument?.defaultView?.addEventListener(type, record, options);

  reports.set(surface, () => ({
    elapsedMs: Math.round(performance.now() - startedAt),
    engineState: audio.state,
    native: nativeState(audio, native),
    resume: {
      calls: resumeCalls,
      resolved: resumeResolved,
      rejected: resumeRejected,
      pending: resumeCalls - resumeResolved - resumeRejected,
      callStack: resumeCallStack,
    },
    // These describe received events, not an assumption about physical contact.
    pointersWithoutUpOrCancel: [...pointers],
    touchesWithoutEndOrCancel: [...touches],
    capturedPointers: [...pointers].filter((id) =>
      surface.hasPointerCapture(id),
    ),
    events,
    omittedEvents,
  }));
  signal.addEventListener(
    "abort",
    () => {
      reports.delete(surface);
      unsubscribe();
    },
    { once: true },
  );
  return record;
}

/** Freeze the evidence now, before release or a successful retry changes it. */
export function formatAudioActivationReport(
  cause: unknown,
  surface: HTMLElement | null,
) {
  if (!errorDetailsEnabled()) return "";
  const session = (
    navigator as Navigator & {
      audioSession?: { type: string; state?: string };
    }
  ).audioSession;
  return JSON.stringify(
    {
      report: "AudioBits activation v2",
      capturedAt: new Date().toISOString(),
      path: globalThis.location?.pathname,
      surface: surface?.getAttribute("aria-label"),
      userAgent: navigator.userAgent,
      visibility: surface?.ownerDocument?.visibilityState,
      documentFocused: surface?.ownerDocument?.hasFocus?.(),
      userActivation: activation(),
      audioSession: session
        ? { type: session.type, state: session.state }
        : "unavailable",
      error: errorDetails(cause),
      input: surface ? reports.get(surface)?.() : undefined,
      evidenceLimit:
        "Frontend observations of this engine's native resume calls. A pending promise does not reveal why the browser has not activated audio.",
    },
    null,
    2,
  );
}
