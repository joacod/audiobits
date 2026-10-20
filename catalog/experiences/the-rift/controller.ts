import type { AudioEngine, Bus, Voice } from "audiobits";
import {
  riftCollapse,
  riftCrackle,
  riftEcho,
  riftField,
  riftGroan,
  riftImplosion,
  riftOpening,
} from "./recipe";

export type RiftPhase = "idle" | "opening" | "active" | "collapsing";
export type RiftEvent =
  "open" | "settle" | "cancel" | "collapse" | "collapsed" | "stop";

/** The complete lifecycle. Unlisted pairs keep the current phase. */
export function nextPhase(phase: RiftPhase, event: RiftEvent): RiftPhase {
  if (event === "stop") return "idle";
  switch (phase) {
    case "idle":
      return event === "open" ? "opening" : phase;
    case "opening":
      return event === "settle"
        ? "active"
        : event === "cancel"
          ? "idle"
          : phase;
    case "active":
      return event === "collapse" ? "collapsing" : phase;
    case "collapsing":
      return event === "collapsed" ? "idle" : phase;
  }
}

/** Normalized fracture shape, each in [0, 1]. */
export interface RiftShape {
  readonly aperture: number;
  readonly tension: number;
  readonly instability: number;
}

/** A scheduled disturbance on the audio clock, for application feedback. */
export interface RiftDisturbance {
  readonly kind: "crackle" | "groan" | "echo";
  readonly at: number;
  readonly strength: number;
  readonly pan: number;
}

/** Audio-clock times of a collapse, for application feedback. */
export interface RiftCollapseTimeline {
  readonly at: number;
  readonly implodeAt: number;
}

type Mood = "settle" | "swell" | "strain" | "recede";
// Autonomous character: drift moves the whistle and low pressure, breath the
// undertow, rate scales disturbance density. Recede is deliberate restraint.
const moods: Record<
  Mood,
  {
    drift: readonly [number, number];
    breath: readonly [number, number];
    /** Field level in dB, approached over the mood change. */
    level: number;
    rate: number;
    next: readonly Mood[];
  }
> = {
  settle: {
    level: -3,
    drift: [0.35, 0.6],
    breath: [0.3, 0.5],
    rate: 0.35,
    next: ["swell", "strain", "recede"],
  },
  swell: {
    level: 0,
    drift: [0.55, 0.9],
    breath: [0.65, 0.95],
    rate: 0.6,
    next: ["recede", "strain", "settle"],
  },
  strain: {
    level: -1,
    drift: [0.7, 1],
    breath: [0.4, 0.7],
    rate: 1.1,
    next: ["recede", "settle"],
  },
  recede: {
    level: -9,
    drift: [0.1, 0.35],
    breath: [0, 0.15],
    rate: 0.05,
    next: ["settle", "swell"],
  },
};

/** Evolution refill period and its audio-clock horizon, in seconds. */
export const evolutionPeriod = 1;
const maxAccents = 4;
const collapseLead = 1.12;

const bounded = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value))
    : fallback;

function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

// Timers exist in browsers and Node; typed here without DOM or Node libraries.
const clock = globalThis as unknown as {
  setTimeout(run: () => void, milliseconds: number): unknown;
  clearTimeout(timer: unknown): void;
};

let instances = 0;

/**
 * Sound only. The application activates the engine, maps its own input to a
 * normalized shape, and decides when an opening is valid (settle) or abandoned
 * (cancel). Collapse is a deliberate application action, never a cancellation.
 */
export function createRift(
  audio: AudioEngine,
  feedback: {
    phase?(value: RiftPhase): void;
    disturbance?(value: RiftDisturbance): void;
  } = {},
) {
  const instance = ++instances;
  const field = audio.sound(riftField);
  const opening = audio.sound(riftOpening);
  const crackle = audio.sound(riftCrackle);
  const groan = audio.sound(riftGroan);
  const echo = audio.sound(riftEcho);
  const fold = audio.sound(riftCollapse);
  const implosion = audio.sound(riftImplosion);
  const listeners = new Set<(value: RiftPhase) => void>();
  const timers = new Set<unknown>();
  const retiring = new Set<Bus>();
  type Accent = Pick<Voice, "stop" | "ended">;
  let accents = new Set<Accent>();
  let phase: RiftPhase = "idle";
  let generation = 0;
  let disposed = false;
  let shape: RiftShape = { aperture: 0.5, tension: 0.35, instability: 0.2 };
  let bus: Bus | undefined;
  let fieldBus: Bus | undefined;
  let voice: Voice<typeof riftField> | undefined;
  let draw = random(42);
  let mood: Mood = "settle";
  let moodEnds = 0;
  let drift = 0.5;
  let breath = 0.4;

  function publish(event: RiftEvent) {
    const next = nextPhase(phase, event);
    if (next === phase) return;
    phase = next;
    feedback.phase?.(next);
    for (const listener of listeners) {
      try {
        listener(next);
      } catch {
        /* Observers cannot interrupt ownership transitions. */
      }
    }
  }
  function later(token: number, seconds: number, run: () => void) {
    const timer = clock.setTimeout(() => {
      timers.delete(timer);
      if (token === generation && !disposed) run();
    }, seconds * 1000);
    timers.add(timer);
  }
  function release(target: Bus | undefined, fade: number) {
    if (!target) return;
    retiring.add(target);
    try {
      target.setGainDb(-60, fade);
    } catch {
      /* A closed context already silenced it. */
    }
    // Cleanup belongs to this bus, not to a session, so it always runs.
    const timer = clock.setTimeout(
      () => {
        timers.delete(timer);
        drop(target);
      },
      (fade + 0.05) * 1000,
    );
    timers.add(timer);
  }
  function drop(target: Bus) {
    retiring.delete(target);
    try {
      target.dispose();
    } catch {
      /* Engine disposal already released it. */
    }
  }
  function accent(token: number, play: () => Accent, required = false) {
    // Disturbances respect the budget; lifecycle sounds are never refused.
    if (!required && accents.size >= maxAccents) return false;
    const own = accents;
    const current = play();
    own.add(current);
    void current.ended.then(() => {
      if (token === generation) own.delete(current);
    });
    return true;
  }
  function reset(fade: number) {
    generation++;
    for (const timer of timers) clock.clearTimeout(timer);
    timers.clear();
    // Retiring buses lose their cleanup timers above; drop them now.
    for (const target of [...retiring]) drop(target);
    const current = bus;
    bus = fieldBus = voice = undefined;
    accents = new Set();
    release(current, fade);
  }

  /** Immediate, click-free silence and reset. Safe to repeat. */
  function stop() {
    if (disposed) return;
    reset(0.02);
    publish("stop");
  }

  /** The application must await audio.start() before calling open. */
  function open(initial: Partial<RiftShape> = {}) {
    if (disposed || phase !== "idle" || audio.state !== "running")
      return undefined;
    update(initial);
    reset(0.02);
    const token = generation;
    const seed = (Math.imul(token, 0x9e3779b9) ^ instance) >>> 0;
    draw = random(seed);
    mood = "settle";
    try {
      bus = audio.bus(`rift-${instance}-${token}`);
      fieldBus = audio.bus(`rift-${instance}-${token}-field`, bus);
      fieldBus.setGainDb(moods.settle.level, 0);
      const at = audio.native.context.currentTime + 0.01;
      accent(token, () => opening.play({ at, seed, bus }), true);
      const current = field.play({
        at: at + 0.08,
        seed,
        bus: fieldBus,
        parameters: { ...shape, drift, breath },
      });
      voice = current;
      void current.ended.then(() => {
        if (token === generation && voice === current) stop();
      });
      moodEnds = at + 3;
      publish("open");
      evolve(token);
      return Object.freeze({ at });
    } catch (cause) {
      stop();
      throw cause;
    }
  }

  /** Normalized shape updates. Ignored while collapsing. */
  function update(next: Partial<RiftShape>) {
    if (disposed || phase === "collapsing" || typeof next !== "object" || !next)
      return shape;
    shape = Object.freeze({
      aperture: bounded(next.aperture, shape.aperture),
      tension: bounded(next.tension, shape.tension),
      instability: bounded(next.instability, shape.instability),
    });
    if (voice?.state === "active" && audio.state === "running")
      voice.set(shape);
    return shape;
  }

  /** A valid opening stays open after the gesture ends. */
  function settle() {
    if (!disposed) publish("settle");
  }

  /** An abandoned opening heals quickly. Never a collapse. */
  function cancel() {
    if (disposed || phase !== "opening") return;
    reset(0.25);
    publish("cancel");
  }

  // Runs from open() and from its own generation-checked timer in later().
  function evolve(token: number) {
    if (!voice || audio.state !== "running") return;
    const now = audio.native.context.currentTime;
    if (now >= moodEnds) {
      const options = moods[mood].next;
      mood = options[Math.floor(draw() * options.length)];
      moodEnds = now + 4 + draw() * 5;
      // Long bounded swells and withdrawals instead of fast modulation.
      fieldBus?.setGainDb(moods[mood].level, 2.5);
    }
    const target = moods[mood];
    const walk = (value: number, [low, high]: readonly [number, number]) =>
      Math.max(low, Math.min(high, value + (draw() - 0.5) * 0.3));
    drift = walk(drift, target.drift);
    breath = walk(breath, target.breath);
    if (voice.state === "active") voice.set({ drift, breath });
    if (phase === "active") {
      // Expected disturbances in this refill, at most two, on the audio clock.
      const expected =
        target.rate *
        (0.3 + 1.7 * shape.instability) *
        (0.6 + 0.6 * shape.aperture) *
        evolutionPeriod;
      for (let index = 0; index < 2 && draw() < expected - index; index++)
        disturb(token, now + 0.05 + draw() * (evolutionPeriod - 0.1));
    }
    later(token, evolutionPeriod, () => evolve(token));
  }

  function disturb(token: number, at: number, kind?: RiftDisturbance["kind"]) {
    const weights = [
      0.3 + shape.instability,
      0.2 + shape.tension,
      0.15 + 0.5 * shape.aperture,
    ];
    let pick = draw() * (weights[0] + weights[1] + weights[2]);
    const chosen =
      kind ??
      (pick < weights[0]
        ? "crackle"
        : (pick -= weights[0]) < weights[1]
          ? "groan"
          : "echo");
    const strength = Math.min(
      1,
      0.35 + 0.4 * shape.instability + 0.25 * draw(),
    );
    const pan = draw() * 1.4 - 0.7;
    const seed = Math.floor(draw() * 0x100000000);
    const played = accent(token, () =>
      chosen === "crackle"
        ? crackle.play({ at, seed, pan, bus, parameters: { strength } })
        : chosen === "groan"
          ? groan.play({
              at,
              seed,
              pan,
              bus,
              parameters: { strength, tension: shape.tension },
            })
          : echo.play({ at, seed, pan, bus, parameters: { strength } }),
    );
    if (played) feedback.disturbance?.({ kind: chosen, at, strength, pan });
  }

  /** The deliberate finale. Returns its audio-clock timeline. */
  function collapse(): RiftCollapseTimeline | undefined {
    if (disposed || phase !== "active" || audio.state !== "running" || !bus)
      return undefined;
    const token = ++generation;
    // Pending evolution belongs to the previous generation and now expires.
    publish("collapse");
    const context = audio.native.context;
    const at = context.currentTime + 0.01;
    const implodeAt = at + collapseLead;
    const current = voice;
    try {
      if (current?.state === "active")
        current.set({
          tension: Math.min(1, shape.tension + 0.35),
          instability: 1,
        });
      fieldBus?.setGainDb(-60, collapseLead);
      accent(
        token,
        () =>
          fold.play({
            at,
            seed: token,
            bus,
            parameters: { aperture: shape.aperture, tension: shape.tension },
          }),
        true,
      );
      disturb(token, at + 0.34, "crackle");
      disturb(token, at + 0.71, "crackle");
      const seal = implosion.play({ at: implodeAt, seed: token, bus });
      accents.add(seal);
      void seal.ended.then(() => {
        if (token === generation) finish();
      });
      later(token, collapseLead + 0.05, () => current?.stop());
      // Bounded even if an ended notification is delayed.
      later(token, collapseLead + 4, finish);
      return Object.freeze({ at, implodeAt });
    } catch (cause) {
      stop();
      throw cause;
    }
  }
  function finish() {
    reset(0.02);
    publish("collapsed");
  }

  const unsubscribe = audio.subscribe((state) => {
    if (phase !== "idle" && state !== "running" && state !== "starting") stop();
  });

  /** Permanent release of owned sounds, buses, timers and listeners. */
  function dispose() {
    if (disposed) return;
    stop();
    disposed = true;
    for (const timer of timers) clock.clearTimeout(timer);
    timers.clear();
    for (const target of [...retiring]) drop(target);
    unsubscribe();
    listeners.clear();
    for (const sound of [field, opening, crackle, groan, echo, fold, implosion])
      sound.dispose();
  }

  return {
    open,
    update,
    settle,
    cancel,
    collapse,
    stop,
    dispose,
    /** Subscribe to phase changes; returns an unsubscribe function. */
    onPhase(listener: (value: RiftPhase) => void) {
      if (disposed) return () => {};
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    get phase() {
      return phase;
    },
    get shape() {
      return shape;
    },
    get disposed() {
      return disposed;
    },
  };
}
