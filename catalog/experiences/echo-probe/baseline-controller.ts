import type { AudioEngine, Voice } from "audiobits";
import { echoProbe, probeReflection, probeDiffusion } from "./baseline";

export interface ProbeReflection {
  /** Stylized relative distance [0, 1], not meters. */
  readonly distance: number;
  /** Stereo direction [-1, 1]. */
  readonly pan: number;
  readonly intensity: number;
  /** Absorbent/dark (0) to hard/bright (1). */
  readonly surface: number;
}

export interface ProbeEmission {
  readonly at: number;
  readonly reflections: readonly (ProbeReflection & { readonly at: number })[];
  readonly ended: Promise<void>;
  stop(): void;
}

const bound = (value: number, min = 0, max = 1) =>
  Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : 0;

/** Two overlapping emissions, six returns each, thirteen voices per emission. */
export function createEchoProbe(audio: AudioEngine) {
  const pulse = audio.sound(echoProbe);
  const reflection = audio.sound(probeReflection);
  const diffusion = audio.sound(probeDiffusion);
  type OwnedVoice = Pick<Voice, "stop" | "ended">;
  const groups = new Set<Set<OwnedVoice>>();
  let lastEmission = -Infinity;
  let disposed = false;

  function stop() {
    for (const group of groups) for (const voice of group) voice.stop();
    // Keep stopping voices counted until their ended promises settle.
    lastEmission = -Infinity;
  }

  /** Call after gesture activation. Null means silent, cooling down, or at capacity. */
  function emit(
    input: readonly ProbeReflection[] = [],
    options: { readonly strength?: number; readonly seed?: number } = {},
  ): ProbeEmission | null {
    if (disposed || audio.state !== "running" || groups.size >= 2) return null;
    const now = audio.native.context.currentTime;
    if (now - lastEmission < 0.12) return null;
    const strength = bound(options.strength ?? 0.8);
    if (strength === 0) return null;
    const seed = Number.isFinite(options.seed) ? options.seed! >>> 0 : 42;
    const at = now + 0.012;
    const returns = input
      .slice(0, 6)
      .map((value) => {
        const distance = bound(value.distance);
        return Object.freeze({
          distance,
          pan: bound(value.pan, -1, 1),
          intensity: bound(value.intensity),
          surface: bound(value.surface),
          at: at + 0.09 + distance * 0.9,
        });
      })
      .filter((value) => value.intensity > 0);
    const voices = new Set<OwnedVoice>();
    groups.add(voices);
    const own = (voice: OwnedVoice) => {
      voices.add(voice);
    };
    try {
      own(pulse.play({ at, seed, gainDb: -12 * (1 - strength) }));
      returns.forEach((value, index) => {
        const surface = value.surface * (1 - 0.55 * value.distance);
        const gainDb = Math.max(
          -60,
          -3 -
            24 * (1 - value.intensity) -
            10 * value.distance -
            12 * (1 - strength),
        );
        own(
          reflection.play({
            at: value.at,
            seed: (seed + index * 101 + 1) >>> 0,
            pan: value.pan,
            gainDb,
            parameters: { surface },
          }),
        );
        own(
          diffusion.play({
            at: value.at + 0.037 + value.distance * 0.045,
            seed: (seed + index * 101 + 2) >>> 0,
            pan: value.pan * -0.65,
            gainDb: Math.max(-60, gainDb - 5),
            parameters: { surface },
          }),
        );
      });
    } catch (cause) {
      // Roll back this emission without touching other users of a shared engine.
      for (const voice of voices) voice.stop();
      void Promise.all([...voices].map((voice) => voice.ended)).then(() =>
        groups.delete(voices),
      );
      throw cause;
    }
    lastEmission = now;
    const ended = Promise.all([...voices].map((voice) => voice.ended)).then(
      () => {
        groups.delete(voices);
      },
    );
    return Object.freeze({
      at,
      reflections: Object.freeze(returns),
      ended,
      stop() {
        for (const voice of voices) voice.stop();
      },
    });
  }

  const unsubscribe = audio.subscribe((state) => {
    if (state !== "running" && state !== "starting") stop();
  });
  function dispose() {
    if (disposed) return;
    disposed = true;
    stop();
    unsubscribe();
    pulse.dispose();
    reflection.dispose();
    diffusion.dispose();
  }
  return {
    emit,
    stop,
    dispose,
    get active() {
      return groups.size;
    },
  };
}
