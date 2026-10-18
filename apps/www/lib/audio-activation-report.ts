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
    stack: cause.stack,
    cause:
      cause.cause !== undefined && depth < 3
        ? errorDetails(cause.cause, depth + 1)
        : undefined,
  };
}

function nativeState(audio: AudioEngine) {
  try {
    const context = audio.native.context;
    return {
      state: context.state,
      currentTime: context.currentTime,
      sampleRate: context.sampleRate,
    };
  } catch {
    return "unavailable: the engine does not expose its context before successful activation";
  }
}

const reports = new WeakMap<HTMLElement, () => unknown>();

function activation() {
  const value = navigator.userActivation;
  return value
    ? { isActive: value.isActive, hasBeenActive: value.hasBeenActive }
    : "unavailable";
}

/** Observe input only. Hosts still own sound intent and cancellation. */
export function observeAudioActivation(
  surface: HTMLElement,
  audio: AudioEngine,
  signal: AbortSignal,
): (event: Event) => void {
  if (!errorDetailsEnabled()) return () => {};
  const startedAt = performance.now();
  const events: object[] = [];
  const pointers = new Set<number>();
  const touches = new Set<number>();
  const seen = new WeakSet<Event>();
  let omittedEvents = 0;
  const append = (entry: object) => {
    events.push({
      atMs: Math.round(performance.now() - startedAt),
      engineState: audio.state,
      userActivation: activation(),
      ...entry,
    });
    if (events.length > 24) {
      events.shift();
      omittedEvents++;
    }
  };
  const unsubscribe = audio.subscribe((state) => {
    append({ type: "engine-state", state, native: nativeState(audio) });
  });
  const record = (event: Event) => {
    if (seen.has(event)) return;
    seen.add(event);
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
  for (const type of ["gotpointercapture", "lostpointercapture", "blur"])
    surface.addEventListener(type, record, options);
  surface.ownerDocument?.addEventListener("visibilitychange", record, options);
  for (const type of ["pagehide", "blur"])
    surface.ownerDocument?.defaultView?.addEventListener(type, record, options);

  reports.set(surface, () => ({
    elapsedMs: Math.round(performance.now() - startedAt),
    engineState: audio.state,
    native: nativeState(audio),
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
      report: "AudioBits activation v1",
      capturedAt: new Date().toISOString(),
      path: globalThis.location?.pathname,
      surface: surface?.getAttribute("aria-label"),
      userAgent: navigator.userAgent,
      visibility: surface?.ownerDocument?.visibilityState,
      userActivation: activation(),
      audioSession: session
        ? { type: session.type, state: session.state }
        : "unavailable",
      error: errorDetails(cause),
      input: surface ? reports.get(surface)?.() : undefined,
      evidenceLimit:
        "Frontend observations only. The library does not expose the original native resume failure or a context before successful activation.",
    },
    null,
    2,
  );
}
