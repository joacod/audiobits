import type { AudioEngine, Voice } from "audiobits";
import {
  lightsaber,
  bladeIgnition,
  bladeSwing,
  bladeClash,
  bladeRetraction,
} from "./recipe";

export type BladeState = "stopped" | "starting" | "running";
export function createLightsaber(
  audio: AudioEngine,
  feedback: {
    state?(value: BladeState): void;
  } = {},
) {
  const hum = audio.sound(lightsaber);
  const ignition = audio.sound(bladeIgnition);
  const swing = audio.sound(bladeSwing);
  const clash = audio.sound(bladeClash);
  const retraction = audio.sound(bladeRetraction);
  let voice: Voice<typeof lightsaber> | undefined;
  type Accent = Pick<Voice, "stop" | "ended">;
  const accents = new Set<Accent>();
  let state: BladeState = "stopped",
    generation = 0,
    disposed = false;
  let motion = 0,
    clock = 0,
    lastSwing = -Infinity,
    lastImpact = -Infinity;
  let armed = true;
  let lastDirection = 0;
  function publish(value: BladeState) {
    state = value;
    feedback.state?.(value);
  }
  function accent(play: () => Accent) {
    const current = play();
    accents.add(current);
    void current.ended.then(() => accents.delete(current));
  }
  function stop() {
    generation++;
    voice?.stop();
    voice = undefined;
    for (const current of accents) current.stop();
    accents.clear();
    motion = 0;
    clock = 0;
    armed = true;
    lastDirection = 0;
    lastSwing = lastImpact = -Infinity;
    if (!disposed) publish("stopped");
  }
  /** The application must await audio.start() before calling ignite. */
  function ignite() {
    if (disposed || state !== "stopped") return;
    generation++;
    try {
      accent(() => ignition.play({ seed: 42 }));
      voice = hum.play({
        seed: 42,
        parameters: { motion: 0, drift: 0.5, sweep: 0 },
      });
      const current = voice;
      publish("running");
      void current.ended.then(() => {
        if (voice === current) stop();
      });
    } catch (cause) {
      stop();
      throw cause;
    }
  }
  function update(movement: number, elapsed: number, direction = 0) {
    if (disposed || state !== "running") return 0;
    const dt = Math.min(
      64,
      Math.max(0, Number.isFinite(elapsed) ? elapsed : 0),
    );
    clock += dt;
    motion = smoothMotion(motion, bounded(movement), dt);
    const signed = Number.isFinite(direction)
      ? Math.max(-1, Math.min(1, direction))
      : 0;
    if (voice?.state === "active")
      voice.set({
        motion,
        drift: 0.5 + 0.45 * Math.sin(clock / 1300),
        sweep: motion * signed,
      });
    // A return stroke can sound even when a fast back-and-forth never reaches idle.
    if (Math.abs(signed) > 0.2 && motion > 0.2) {
      if (lastDirection && Math.sign(signed) !== lastDirection) armed = true;
      lastDirection = Math.sign(signed);
    }
    if (motion < 0.2) {
      armed = true;
      lastDirection = 0;
    }
    if (armed && motion > 0.48 && clock - lastSwing >= 220) {
      armed = false;
      lastSwing = clock;
      accent(() =>
        swing.play({
          parameters: { force: motion },
          seed: generation,
          pan: signed * 0.2,
        }),
      );
    }
    return motion;
  }
  /** Generic contact intensity [0, 1] and stereo placement [-1, 1]. */
  function clashAt(force: number, pan = 0) {
    if (disposed || state !== "running" || !Number.isFinite(force))
      return false;
    if (clock - lastImpact < 100) return false;
    accent(() =>
      clash.play({
        parameters: { force: bounded(force) },
        seed: generation,
        pan: Number.isFinite(pan) ? Math.max(-1, Math.min(1, pan)) : 0,
      }),
    );
    lastImpact = clock;
    return true;
  }
  function retract() {
    if (disposed) return;
    if (state !== "running") {
      // Settle a cancelled host startup without cutting an existing retract tail.
      publish("stopped");
      return;
    }
    stop();
    if (audio.state === "running") accent(() => retraction.play({ seed: 42 }));
  }
  const unsubscribe = audio.subscribe((value) => {
    if (state === "running" && value !== "running" && value !== "starting")
      stop();
  });
  function dispose() {
    if (disposed) return;
    stop();
    disposed = true;
    unsubscribe();
    for (const sound of [hum, ignition, swing, clash, retraction])
      sound.dispose();
  }
  return {
    ignite,
    retract,
    update,
    clash: clashAt,
    stop,
    dispose,
    get state() {
      return state;
    },
    get motion() {
      return motion;
    },
  };
}

const bounded = (value: number) =>
  Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;

export function smoothMotion(
  previous: number,
  target: number,
  elapsed: number,
) {
  const dt = Math.min(64, Math.max(0, Number.isFinite(elapsed) ? elapsed : 0));
  const tau = target > previous ? 22 : 100;
  return previous + (target - previous) * (1 - Math.exp(-dt / tau));
}
