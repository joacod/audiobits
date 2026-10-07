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
      if (mounted && token === request) sound.play();
    })
    .catch((cause: unknown) => {
      if (mounted)
        error.textContent =
          cause instanceof Error ? cause.message : "Retry Play.";
    });
});
document.querySelector("#stop")!.addEventListener("click", () => {
  stopThruster();
  audio.stopAll();
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
      if (mounted && token === request)
        impactSound.play({ parameters: { intensity } });
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
      if (!mounted || token !== request || thrusterVoice?.state === "active")
        return;
      const voice = thrusterSound.play({
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
      if (mounted && token === request) stopThruster();
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
    audio.stopAll();
  }
});
window.addEventListener(
  "pagehide",
  () => {
    mounted = false;
    request++;
    thrusterVoice = undefined;
    unsubscribe();
    void audio.dispose().catch(() => {});
  },
  { once: true },
);
