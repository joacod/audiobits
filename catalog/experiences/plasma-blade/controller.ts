import type { AudioEngine, Voice } from "audiobits";
import {
  plasmaBlade,
  bladeIgnition,
  bladeSwing,
  bladeClash,
  bladeRetraction,
} from "./recipe";
import { motionLevel, smoothMotion } from "./motion";

export type BladeState = "stopped" | "starting" | "running";
export function createPlasmaBlade(
  audio: AudioEngine,
  feedback: {
    state(value: BladeState): void;
    error(cause: unknown): void;
    impact?(target: number, force: number): void;
  },
) {
  const hum = audio.sound(plasmaBlade);
  const ignition = audio.sound(bladeIgnition);
  const swing = audio.sound(bladeSwing);
  const clash = audio.sound(bladeClash);
  const retraction = audio.sound(bladeRetraction);
  let voice: Voice<typeof plasmaBlade> | undefined;
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
  const targets = new Map<number, number>();
  function publish(value: BladeState) {
    state = value;
    feedback.state(value);
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
    targets.clear();
    if (!disposed) publish("stopped");
  }
  function ignite() {
    if (disposed || state !== "stopped") return;
    const token = ++generation;
    publish("starting");
    // Called synchronously from the host's user gesture, before any await.
    void audio
      .start()
      .then(() => {
        if (disposed || token !== generation) return;
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
      })
      .catch((cause: unknown) => {
        if (disposed || token !== generation) return;
        stop();
        feedback.error(cause);
      });
  }
  function update(speed: number, elapsed: number, direction = 0) {
    if (disposed || state !== "running") return 0;
    const dt = Math.min(
      64,
      Math.max(0, Number.isFinite(elapsed) ? elapsed : 0),
    );
    clock += dt;
    motion = smoothMotion(motion, motionLevel(speed), dt);
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
  function impact(target: number, force: number) {
    if (
      disposed ||
      state !== "running" ||
      !Number.isInteger(target) ||
      target < 0 ||
      target > 2 ||
      !Number.isFinite(force)
    )
      return false;
    if (
      clock - lastImpact < 100 ||
      clock - (targets.get(target) ?? -Infinity) < 850
    )
      return false;
    const bounded = Math.max(0, Math.min(1, force));
    targets.set(target, clock);
    lastImpact = clock;
    accent(() =>
      clash.play({
        parameters: { force: bounded },
        seed: generation + target,
        pan: (target - 1) * 0.35,
      }),
    );
    feedback.impact?.(target, bounded);
    return true;
  }
  function retract() {
    if (disposed) return;
    const active = state === "running";
    stop();
    if (active && audio.state === "running")
      accent(() => retraction.play({ seed: 42 }));
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
    impact,
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
