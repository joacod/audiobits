import { createAudio, workspaceStatus } from "audiobits";
import { confirmation, impact, thruster } from "audiobits/recipes";

const status = document.querySelector<HTMLParagraphElement>("#status");
if (!status) throw new Error("Missing consumer status element");
status.textContent = workspaceStatus;
const audio = createAudio();
const sound = audio.sound(confirmation);
const impactSound = audio.sound(impact);
const thrusterSound = audio.sound(thruster);
let thrusterVoice: import("audiobits").Voice | undefined;
let request = 0;
let routed: import("audiobits").Bus | undefined;
let removeAnalyser: (() => void) | undefined;
let analyser: AnalyserNode | undefined;
let frame = 0;
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
    const read = () => {
      if (!mounted || !analyser) return;
      analyser.getFloatTimeDomainData(samples);
      const peak = samples.reduce(
        (value, sample) => Math.max(value, Math.abs(sample)),
        0,
      );
      meter.textContent = `Output peak: ${peak.toFixed(3)}`;
      frame = requestAnimationFrame(read);
    };
    read();
  }
  return routed;
}
const thrusterState =
  document.querySelector<HTMLParagraphElement>("#thruster-state")!;
const thrusterButton = document.querySelector<HTMLButtonElement>("#thruster")!;
function stopThruster() {
  request++;
  thrusterVoice?.stop();
  thrusterVoice = undefined;
  thrusterState.textContent = "Thruster: stopped";
  thrusterButton.disabled = false;
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
document.querySelector("#play")!.addEventListener("click", () => {
  error.textContent = "";
  const token = request;
  void audio
    .start()
    .then(() => {
      if (mounted && !document.hidden && token === request)
        sound.play({ bus: routing() });
    })
    .catch((cause: unknown) => {
      if (mounted)
        error.textContent =
          cause instanceof Error ? cause.message : "Retry Play.";
    });
});
document.querySelector("#stop")!.addEventListener("click", () => {
  stopThruster();
  audio.stopAll({ tails: "cut" });
});
mute.addEventListener("click", () => {
  const muted = mute.getAttribute("aria-pressed") !== "true";
  audio.setMuted(muted);
  mute.setAttribute("aria-pressed", String(muted));
});
document.querySelector("#impact")!.addEventListener("click", () => {
  error.textContent = "";
  const token = request;
  const intensity = Number(
    document.querySelector<HTMLInputElement>("#intensity")!.value,
  );
  void audio
    .start()
    .then(() => {
      if (mounted && !document.hidden && token === request)
        impactSound.play({ parameters: { intensity }, bus: routing() });
    })
    .catch(showError);
});
thrusterButton.addEventListener("click", () => {
  error.textContent = "";
  const token = request;
  thrusterButton.disabled = true;
  thrusterState.textContent = "Thruster: starting";
  void audio
    .start()
    .then(() => {
      if (
        !mounted ||
        document.hidden ||
        token !== request ||
        thrusterVoice?.state === "active"
      )
        return;
      const voice = thrusterSound.play({
        bus: routing(),
        parameters: {
          throttle: Number(
            document.querySelector<HTMLInputElement>("#throttle")!.value,
          ),
        },
      });
      thrusterVoice = voice;
      thrusterState.textContent = "Thruster: running";
      void voice.ended.then(() => {
        if (mounted && thrusterVoice === voice) stopThruster();
      });
    })
    .catch((cause: unknown) => {
      if (mounted && !document.hidden && token === request) stopThruster();
      showError(cause);
    });
});
document
  .querySelector("#thruster-stop")!
  .addEventListener("click", stopThruster);
document
  .querySelector<HTMLInputElement>("#throttle")!
  .addEventListener("input", (event) => {
    try {
      if (thrusterVoice?.state === "active")
        thrusterVoice.set({
          throttle: Number((event.target as HTMLInputElement).value),
        });
    } catch (cause) {
      showError(cause);
    }
  });
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopThruster();
    audio.stopAll({ tails: "cut" });
    void audio.suspend().catch(showError);
  }
});
window.addEventListener(
  "pagehide",
  () => {
    mounted = false;
    request++;
    thrusterVoice = undefined;
    unsubscribe();
    cancelAnimationFrame(frame);
    removeAnalyser?.();
    analyser?.disconnect();
    analyser = undefined;
    void audio.dispose().catch(() => {});
  },
  { once: true },
);

document.querySelector("#delay")!.addEventListener("click", () => {
  const token = request;
  void audio
    .start()
    .then(() => {
      if (!mounted || document.hidden || token !== request) return;
      const button = document.querySelector<HTMLButtonElement>("#delay")!;
      const enabled = button.getAttribute("aria-pressed") !== "true";
      routing().setDelay(
        enabled ? { seconds: 0.18, feedback: 0.35, wet: 0.25 } : null,
      );
      button.setAttribute("aria-pressed", String(enabled));
    })
    .catch(showError);
});

document
  .querySelector<HTMLInputElement>("#volume")!
  .addEventListener("input", (event) => {
    try {
      routed?.setGainDb(Number((event.target as HTMLInputElement).value), 0.1);
    } catch (cause) {
      showError(cause);
    }
  });
