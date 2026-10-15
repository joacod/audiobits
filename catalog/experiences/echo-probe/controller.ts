import type { AudioEngine, Voice } from "audiobits";
import { echoProbe, probeReflection, probeDiffusion } from "./recipe";

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
  /** Audio-clock retirement/Stop time, or null while not cancelled. */
  readonly cancelledAt: number | null;
  readonly ended: Promise<void>;
  stop(): void;
}

const bound = (value: number, min = 0, max = 1) =>
  Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : 0;

/** Two foreground emissions and one fading group; at most ten voices each. */
export function createEchoProbe(audio: AudioEngine) {
  type Group = {
    voices: Pick<Voice, "stop" | "ended">[];
    sounds: Set<{ dispose(): void }>;
    retiringAt: number;
    cancelLate(): void;
  };
  const groups = new Set<Group>();
  let nextEmission = -Infinity;
  let disposed = false;
  let clock: { readonly currentTime: number } | undefined;

  function retire(group: Group, now: number) {
    if (group.retiringAt !== Infinity) return;
    group.retiringAt = now;
    group.cancelLate();
    for (const voice of group.voices) voice.stop();
  }
  function release(group: Group) {
    if (!groups.delete(group)) return;
    for (const sound of group.sounds) sound.dispose();
  }
  function stop() {
    const now = clock?.currentTime ?? 0;
    for (const group of groups) retire(group, now);
    nextEmission = -Infinity;
  }

  /** Null means not running, zero strength, cooldown, or three still-fading groups. */
  function emit(
    input: readonly ProbeReflection[] = [],
    options: { readonly strength?: number; readonly seed?: number } = {},
  ): ProbeEmission | null {
    if (disposed || audio.state !== "running") return null;
    const context = audio.native.context;
    clock = context;
    const now = context.currentTime;
    if (now < nextEmission) return null;
    const strength = bound(options.strength ?? 0.8);
    if (strength === 0) return null;
    // Early recipes release in <= 40 ms with a 50 ms filter tail. Late
    // delay graphs are cut separately. Reclaim only
    // after that audio-clock deadline, even if ended callbacks were delayed.
    for (const group of groups)
      if (now - group.retiringAt >= 0.09) release(group);
    if (groups.size >= 3) return null;
    const foreground = [...groups].filter((g) => g.retiringAt === Infinity);
    // Quiet late energy yields first. Preserve early returns for two emissions.
    for (const group of foreground) group.cancelLate();
    if (foreground.length >= 2) retire(foreground[0], now);

    const seed = Number.isFinite(options.seed) ? options.seed! >>> 0 : 42;
    const group: Group = {
      voices: [],
      sounds: new Set(),
      retiringAt: Infinity,
      cancelLate() {},
    };
    groups.add(group);
    const own = (voice: Pick<Voice, "stop" | "ended">) => {
      group.voices.push(voice);
    };
    const gain = (value: ProbeReflection) =>
      Math.max(
        -60,
        -4 -
          24 * (1 - value.intensity) -
          12 * value.distance -
          12 * (1 - strength),
      );
    try {
      const pulse = audio.sound(echoProbe);
      group.sounds.add(pulse);
      const reflection = audio.sound(probeReflection);
      group.sounds.add(reflection);
      const diffusion = audio.sound(probeDiffusion);
      group.sounds.add(diffusion);
      // Recipe validation can advance the native clock. Take the shared onset
      // only after preparing every sound in this emission.
      const at = context.currentTime + 0.012;
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
      // voice.stop() preserves delay tails. This sound belongs only to this
      // emission, so disposal cancels late repeats without touching early
      // returns or unrelated users of the engine.
      group.cancelLate = () => {
        if (group.sounds.delete(diffusion)) diffusion.dispose();
      };
      own(pulse.play({ at, seed, gainDb: -12 * (1 - strength) }));
      for (const value of returns)
        own(
          reflection.play({
            at: value.at,
            // Recreate the emitted rim and noise, including their exact variation.
            seed,
            pan: value.pan,
            gainDb: gain(value),
            parameters: { surface: value.surface, distance: value.distance },
          }),
        );
      if (returns.length) {
        const latest = Math.max(...returns.map((value) => value.at));
        // Three grains for the whole emission, not a wash for every reflector.
        for (let index = 0; index < 3; index++) {
          const value = returns[index % returns.length];
          const grainSeed =
            (Math.imul(seed ^ Math.imul(index + 1, 0x9e3779b9), 0x85ebca6b) ^
              seed) >>>
            0;
          const variation = grainSeed / 0x100000000;
          own(
            diffusion.play({
              at: latest + 0.11 + index * 0.073 + variation * 0.027,
              seed: grainSeed,
              pan: bound(
                (index % 2 ? 1 : -1) * (0.35 + variation * 0.6) +
                  value.pan * 0.15,
                -1,
                1,
              ),
              gainDb: Math.max(-60, gain(value) - 7 - index * 2.5),
              parameters: {
                surface: value.surface,
                distance: bound(value.distance + index * 0.12),
              },
            }),
          );
        }
      }
      nextEmission = now + 0.12;
      const ended = Promise.all(group.voices.map((voice) => voice.ended)).then(
        () => release(group),
      );
      return Object.freeze({
        at,
        reflections: Object.freeze(returns),
        get cancelledAt() {
          return group.retiringAt === Infinity ? null : group.retiringAt;
        },
        ended,
        stop() {
          if (groups.has(group)) retire(group, clock?.currentTime ?? 0);
        },
      });
    } catch (cause) {
      // A failed construction has no audible result to preserve.
      release(group);
      throw cause;
    }
  }

  const unsubscribe = audio.subscribe((state) => {
    if (state !== "running" && state !== "starting") stop();
  });
  function dispose() {
    if (disposed) return;
    disposed = true;
    stop();
    unsubscribe();
    for (const group of groups) release(group);
    clock = undefined;
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
