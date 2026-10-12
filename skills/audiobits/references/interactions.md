# Live controls and complete experiences

Keep a running voice for a sustained interaction. After gesture activation, use
`sound.play({ parameters, seed })`, retain its typed voice, and call `voice.set`
only while `voice.state === "active"`. Clear that reference on Stop/end. Repeated
slider or frame updates should change the existing voice rather than retrigger
its attack. `voice.parameters` contains requested values, not measured smoothed
native values.

Bound finite application input to the recipe's declared range. Rate-limit dense
pointer events with the host's frame loop; use the recipe's native smoothing for
audio ramps. Let application state drive controls, never encode that state inside
recipe data. Use one consistent clock for elapsed/progress calculations.

For a complete experience, consult [catalog](catalog.md) first. Separate acoustic
data, the controller and presentation. Adapt a controller to existing Start,
Stop, input and status/error controls. Keep keyboard alternatives for pointer
interactions, handle pointer cancellation/lost capture, and cancel owned frames.
Mute and Stop serve different purposes: mute affects output, Stop ends activity.

For Reactive Thruster, the installed `attachPointerThruster(surface, audio,
feedback)` owns its sound, listeners and frames; its host owns the engine. It
exposes `start(value)`, `setThrottle(value)`, `stop()` and `dispose()`. Bind
`start` directly to a user gesture and update existing application state through
the feedback callbacks. Use a surface with `touch-action: none` where appropriate.

This adaptation assumes the registry targets described in [catalog](catalog.md).
It uses an existing application's elements and omits the standalone demo/Impact:

```ts
import { createAudio } from "audiobits";
import { attachPointerThruster } from "./sounds/experiences/reactive-thruster/pointer";

export function mountThruster(
  surface: HTMLElement,
  reportError: (cause: unknown) => void,
) {
  const audio = createAudio({ maxVoices: 4, maxVoicesPerSound: 2 });
  const listeners = new AbortController();
  let disposed = false;
  const controller = attachPointerThruster(surface, audio, {
    state: (state) => {
      surface.dataset.audioState = state;
    },
    throttle: (value) => {
      surface.dataset.throttle = String(value);
    },
    error: reportError,
  });
  function stop() {
    controller.stop();
    audio.stopAll({ tails: "cut" });
  }
  async function dispose() {
    if (disposed) return;
    disposed = true;
    listeners.abort();
    controller.dispose();
    await audio.dispose();
  }
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden && !disposed) {
        stop();
        void audio.suspend().catch(reportError);
      }
    },
    { signal: listeners.signal },
  );
  window.addEventListener(
    "pagehide",
    () => {
      void dispose().catch(reportError);
    },
    { signal: listeners.signal },
  );
  return {
    start: (value = 0.2) => controller.start(value),
    setThrottle: controller.setThrottle,
    stop,
    dispose,
  };
}
```

Bind the returned methods to the application's controls, handle disposal errors,
and call `dispose()` on unmount. The copied controller already guards pending
activation and stops on pointer release, blur and hide. The engine owner still
must suspend on hide and dispose on removal. Return remains silent until another
gesture. If using a shared application engine, omit its disposal and limit Stop
to this controller; preserve the shared owner's lifecycle.

When adding output visuals, use actual analyser data after activation. Detach
AudioBits output taps and disconnect caller-owned native nodes during cleanup.
Keep animation/accessibility preferences in the host, and verify repeated
mount/unmount, fast Start/Stop and release tails before claiming lifecycle safety.
