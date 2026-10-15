import { createAudio, defineSound } from "audiobits";

const audio = createAudio();
const sound = audio.sound(
  defineSound({
    schemaVersion: 1,
    kind: "one-shot",
    duration: 0.08,
    layers: [
      {
        id: "ping",
        source: { type: "oscillator", waveform: "sine", frequency: 660 },
        gainDb: -18,
        envelope: { attack: 0.004, decay: 0.06, sustain: 0.1, release: 0.04 },
      },
    ],
    effects: [{ type: "delay", time: 0.24, feedback: 0.3, mix: 0.25 }],
  }),
);
let request = 0;
let disposed = false;

// Call directly from a Play button's click handler.
export async function play(): Promise<void> {
  const token = ++request;
  await audio.start();
  if (!disposed && token === request) sound.play();
}
export function stop(): void {
  request++;
  audio.stopAll({ tails: "cut" });
}
// Call when the host unmounts or leaves the page.
export async function dispose(): Promise<void> {
  disposed = true;
  request++;
  await audio.dispose();
}
