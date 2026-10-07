import { createAudio, workspaceStatus } from "audiobits";
import { confirmation } from "audiobits/recipes";

const status = document.querySelector<HTMLParagraphElement>("#status");
if (!status) throw new Error("Missing consumer status element");
status.textContent = workspaceStatus;
const audio = createAudio();
const sound = audio.sound(confirmation);
const state = document.querySelector<HTMLParagraphElement>("#audio-state")!;
const error = document.querySelector<HTMLParagraphElement>("#audio-error")!;
const mute = document.querySelector<HTMLButtonElement>("#mute")!;
const unsubscribe = audio.subscribe((value) => {
  state.textContent = `Audio: ${value}`;
});
let mounted = true;
document.querySelector("#play")!.addEventListener("click", () => {
  error.textContent = "";
  void audio
    .start()
    .then(() => {
      if (mounted) sound.play();
    })
    .catch((cause: unknown) => {
      if (mounted)
        error.textContent =
          cause instanceof Error ? cause.message : "Retry Play.";
    });
});
document
  .querySelector("#stop")!
  .addEventListener("click", () => audio.stopAll());
mute.addEventListener("click", () => {
  const muted = mute.getAttribute("aria-pressed") !== "true";
  audio.setMuted(muted);
  mute.setAttribute("aria-pressed", String(muted));
});
window.addEventListener(
  "pagehide",
  () => {
    mounted = false;
    unsubscribe();
    void audio.dispose().catch(() => {});
  },
  { once: true },
);
