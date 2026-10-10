import { createAudio } from "audiobits";
import { confirmation, impact } from "audiobits/recipes";
import { attachPointerThruster } from "../../../catalog/reactive-thruster/pointer";

const status = document.querySelector<HTMLParagraphElement>("#status");
if (!status) throw new Error("Missing consumer status element");
const audio = createAudio({ maxVoices: 8, maxVoicesPerSound: 2 });
status.textContent = `AudioBits: ${audio.state}`;
const sound = audio.sound(confirmation);
const impactSound = audio.sound(impact);
let request = 0;
let routed: import("audiobits").Bus | undefined;
let removeAnalyser: (() => void) | undefined;
let analyser: AnalyserNode | undefined;
let frame = 0;
let readMeter: (() => void) | undefined;
function routing() {
  if (!routed) {
    routed = audio.bus("effects");
    routed.setGainDb(
      Number(document.querySelector<HTMLInputElement>("#volume")!.value),
      0.1,
    );
    const native = audio.native;
    analyser = native.context.createAnalyser();
    removeAnalyser = native.connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    const meter = document.querySelector<HTMLParagraphElement>("#level")!;
    readMeter = () => {
      frame = 0;
      if (!mounted || document.hidden || !analyser) return;
      analyser.getFloatTimeDomainData(samples);
      const peak = samples.reduce(
        (value, sample) => Math.max(value, Math.abs(sample)),
        0,
      );
      meter.textContent = `Output peak: ${peak.toFixed(3)}`;
      frame = requestAnimationFrame(readMeter!);
    };
  }
  if (!frame) readMeter?.();
  return routed;
}
const thrusterState =
  document.querySelector<HTMLParagraphElement>("#thruster-state")!;
const thrusterButton = document.querySelector<HTMLButtonElement>("#thruster")!;
function stopThruster() {
  request++;
  interaction.stop();
}
function showError(cause: unknown) {
  if (mounted)
    error.textContent =
      cause instanceof Error ? cause.message : "Audio action failed.";
}
const state = document.querySelector<HTMLParagraphElement>("#audio-state")!;
const error = document.querySelector<HTMLParagraphElement>("#audio-error")!;
const mute = document.querySelector<HTMLButtonElement>("#mute")!;
const unsubscribe = audio.subscribe((value) => {
  state.textContent = `Audio: ${value}`;
});
let mounted = true;
const hostListeners = new AbortController();
document.querySelector("#play")!.addEventListener(
  "click",
  () => {
    error.textContent = "";
    const token = request;
    void audio
      .start()
      .then(() => {
        if (mounted && !document.hidden && token === request)
          sound.play({ bus: routing() });
      })
      .catch((cause: unknown) => {
        if (mounted && !document.hidden && token === request)
          error.textContent =
            cause instanceof Error ? cause.message : "Retry Play.";
      });
  },
  { signal: hostListeners.signal },
);
document.querySelector("#stop")!.addEventListener(
  "click",
  () => {
    stopThruster();
    audio.stopAll({ tails: "cut" });
  },
  { signal: hostListeners.signal },
);
mute.addEventListener(
  "click",
  () => {
    const muted = mute.getAttribute("aria-pressed") !== "true";
    audio.setMuted(muted);
    mute.setAttribute("aria-pressed", String(muted));
  },
  { signal: hostListeners.signal },
);
document.querySelector("#impact")!.addEventListener(
  "click",
  () => {
    error.textContent = "";
    const token = request;
    const intensity = Number(
      document.querySelector<HTMLInputElement>("#intensity")!.value,
    );
    void audio
      .start()
      .then(() => {
        if (mounted && !document.hidden && token === request)
          impactSound.play({
            parameters: { intensity },
            seed: 42,
            bus: audio.bus("impacts", routing()),
          });
      })
      .catch((cause: unknown) => {
        if (mounted && !document.hidden && token === request) showError(cause);
      });
  },
  { signal: hostListeners.signal },
);
const interaction = attachPointerThruster(
  document.querySelector<HTMLElement>("#pointer-thruster")!,
  audio,
  {
    state(value) {
      thrusterState.textContent = `Thruster: ${value}`;
      thrusterButton.disabled = value !== "stopped";
      if (value === "running") routing();
    },
    error: showError,
    throttle(value) {
      document.querySelector<HTMLOutputElement>("#motion-throttle")!.value =
        value.toFixed(2);
    },
  },
);
thrusterButton.addEventListener(
  "click",
  () => {
    error.textContent = "";
    interaction.start(
      Number(document.querySelector<HTMLInputElement>("#throttle")!.value),
    );
  },
  { signal: hostListeners.signal },
);
document
  .querySelector("#thruster-stop")!
  .addEventListener("click", stopThruster, { signal: hostListeners.signal });
document.querySelector<HTMLInputElement>("#throttle")!.addEventListener(
  "input",
  (event) => {
    try {
      interaction.setThrottle(Number((event.target as HTMLInputElement).value));
    } catch (cause) {
      showError(cause);
    }
  },
  { signal: hostListeners.signal },
);
document.addEventListener(
  "visibilitychange",
  () => {
    if (document.hidden) {
      stopThruster();
      cancelAnimationFrame(frame);
      frame = 0;
      audio.stopAll({ tails: "cut" });
      void audio.suspend().catch(showError);
    }
  },
  { signal: hostListeners.signal },
);
window.addEventListener(
  "pagehide",
  () => {
    mounted = false;
    request++;
    interaction.dispose();
    hostListeners.abort();
    unsubscribe();
    cancelAnimationFrame(frame);
    removeAnalyser?.();
    analyser?.disconnect();
    analyser = undefined;
    void audio.dispose().catch((cause: unknown) => {
      console.error("Audio cleanup failed", cause);
    });
  },
  { once: true, signal: hostListeners.signal },
);

document.querySelector<HTMLInputElement>("#volume")!.addEventListener(
  "input",
  (event) => {
    try {
      routed?.setGainDb(Number((event.target as HTMLInputElement).value), 0.1);
    } catch (cause) {
      showError(cause);
    }
  },
  { signal: hostListeners.signal },
);
