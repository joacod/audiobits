import type { AudioEngine, Bus, Voice } from "audiobits";
import { pickedBass, rockKick, rockSnare, rockHat } from "./recipe";

export type MixChannel = "drums" | "bass" | "master";
export type ChannelMix = Readonly<{ level: number; muted: boolean }>;
export type GrooveMix = Readonly<Record<MixChannel, ChannelMix>>;
export const defaultGrooveMix: GrooveMix = {
  drums: { level: 0.5, muted: false },
  bass: { level: 0.5, muted: false },
  master: { level: 0.8, muted: false },
};
export const grooveBpm = 120;
export const grooveStepSeconds = 60 / grooveBpm / 2;
// Two bars of eighth notes: E2, E2, G2, D2, with a backbeat and alternating hats.
export const grooveSteps = Array.from({ length: 16 }, (_, index) => ({
  kick: index % 4 === 0,
  snare: index % 4 === 2,
  hat: index % 2 ? 0.35 : 0.5,
  bass:
    index % 2 === 0
      ? [82.4069, 82.4069, 97.9989, 73.4162][Math.floor(index / 4)]
      : 0,
}));
const bounded = (value: number) =>
  Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
const clock = globalThis as unknown as {
  setInterval(callback: () => void, ms: number): number;
  clearInterval(id: number): void;
};
let nextSession = 0;

/** Portable two-bar groove. The application owns activation and engine disposal. */
export function createGroove(
  audio: AudioEngine,
  onError: (cause: unknown) => void = () => {},
) {
  const sounds = {
    bass: audio.sound(pickedBass),
    kick: audio.sound(rockKick),
    snare: audio.sound(rockSnare),
    hat: audio.sound(rockHat),
  };
  const voices = new Set<Pick<Voice, "stop" | "ended">>();
  let mix: GrooveMix = { ...defaultGrooveMix };
  let buses: Record<MixChannel, Bus> | undefined;
  let timer: number | undefined;
  let origin = 0;
  let step = 0;
  let disposed = false;

  function apply(channel: MixChannel) {
    const bus = buses?.[channel];
    if (!bus) return;
    const { level, muted } = mix[channel];
    bus.setGainDb(
      level > 0 ? Math.max(-60, 20 * Math.log10(level)) : -60,
      0.04,
    );
    bus.setMuted(muted || level === 0);
  }
  function setMix(channel: MixChannel, settings: Partial<ChannelMix>) {
    if (disposed) return;
    mix = {
      ...mix,
      [channel]: {
        level:
          settings.level === undefined
            ? mix[channel].level
            : bounded(settings.level),
        muted: settings.muted ?? mix[channel].muted,
      },
    };
    apply(channel);
  }
  function stop() {
    if (timer !== undefined) clock.clearInterval(timer);
    timer = undefined;
    // Disconnect the session route, including notes already booked ahead.
    if (buses) {
      buses.drums.dispose();
      buses.bass.dispose();
      buses.master.dispose();
      buses = undefined;
    }
    for (const voice of voices) voice.stop();
    voices.clear();
  }
  function schedule() {
    if (!buses) return;
    if (audio.state !== "running") {
      stop();
      return;
    }
    try {
      const now = audio.native.context.currentTime;
      // Skip missed notes after timer throttling instead of bursting stale hits.
      step = Math.max(
        step,
        Math.ceil((now + 0.02 - origin) / grooveStepSeconds),
      );
      while (origin + step * grooveStepSeconds <= now + 0.15) {
        const at = origin + step * grooveStepSeconds;
        const hit = grooveSteps[step % grooveSteps.length];
        const seed = step + 42;
        const own = (voice: Pick<Voice, "stop" | "ended">) => {
          voices.add(voice);
          void voice.ended.then(() => voices.delete(voice));
        };
        own(
          sounds.hat.play({
            at,
            bus: buses.drums,
            parameters: { velocity: hit.hat },
            seed,
          }),
        );
        if (hit.kick)
          own(
            sounds.kick.play({
              at,
              bus: buses.drums,
              parameters: { velocity: 0.7 },
              seed,
            }),
          );
        if (hit.snare)
          own(
            sounds.snare.play({
              at,
              bus: buses.drums,
              parameters: { velocity: 0.6 },
              seed,
            }),
          );
        if (hit.bass)
          own(
            sounds.bass.play({
              at,
              bus: buses.bass,
              parameters: { frequency: hit.bass, velocity: 0.75 },
              seed,
            }),
          );
        step++;
      }
    } catch (cause) {
      stop();
      onError(cause);
    }
  }
  function start() {
    if (disposed || buses) return;
    if (audio.state !== "running")
      throw new Error("Activate audio before starting the groove");
    try {
      const master = audio.bus(`groove-${++nextSession}`);
      buses = {
        master,
        drums: audio.bus(`${master.name}-drums`, master),
        bass: audio.bus(`${master.name}-bass`, master),
      };
      for (const channel of ["drums", "bass", "master"] as const)
        apply(channel);
      origin = audio.native.context.currentTime + 0.15;
      step = 0;
      timer = clock.setInterval(schedule, 25);
      schedule();
    } catch (cause) {
      stop();
      throw cause;
    }
  }
  const unsubscribe = audio.subscribe((state) => {
    if (state !== "running" && state !== "starting") stop();
  });
  return {
    start,
    stop,
    setMix,
    get mix() {
      return mix;
    },
    get playing() {
      return buses !== undefined;
    },
    // The visual host reads this clock; frames never schedule sound.
    position() {
      if (!buses || audio.state !== "running") return -1;
      const context = audio.native.context;
      const latency = (context.baseLatency || 0) + (context.outputLatency || 0);
      return Math.max(
        -1,
        (context.currentTime - latency - origin) / grooveStepSeconds,
      );
    },
    dispose() {
      if (disposed) return;
      stop();
      disposed = true;
      unsubscribe();
      Object.values(sounds).forEach((sound) => sound.dispose());
    },
  };
}
