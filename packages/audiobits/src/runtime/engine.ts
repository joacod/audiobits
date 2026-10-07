import { defineSound, AudioBitsError } from "../recipe/validate";
import type { Recipe } from "../recipe/generated";
import { compile } from "../compiler/plan";
import { checkNyquist, createGraph } from "../compiler/graph";
import type { Graph } from "../compiler/graph";

export type AudioState =
  | "idle"
  | "starting"
  | "running"
  | "suspended"
  | "interrupted"
  | "closed"
  | "disposed";
export interface AudioOptions {
  readonly maxVoices?: number;
  readonly maxVoicesPerSound?: number;
  readonly masterGainDb?: number;
}
export interface PlayOptions {
  readonly at?: number;
  readonly gainDb?: number;
  readonly pan?: number;
}
export interface Voice {
  readonly ended: Promise<void>;
  readonly state: "active" | "stopping" | "retiring" | "ended";
  stop(): void;
}
export interface Sound {
  readonly recipe: Recipe;
  play(options?: PlayOptions): Voice;
  dispose(): void;
}
export interface AudioEngine {
  readonly state: AudioState;
  readonly counts: { readonly active: number; readonly retiring: number };
  start(): Promise<void>;
  suspend(): Promise<void>;
  sound(input: unknown): Sound;
  stopAll(): void;
  setMuted(muted: boolean): void;
  subscribe(listener: (state: AudioState) => void): () => void;
  dispose(): Promise<void>;
}
interface RecordVoice {
  sound: Sound;
  voice: Voice;
  graph: Graph | undefined;
  finish(): void;
  status: "active" | "stopping" | "retiring" | "ended";
}
function range(value: number, min: number, max: number, name: string): number {
  if (!Number.isFinite(value) || value < min || value > max)
    throw new AudioBitsError(
      "invalid-option",
      `${name} must be in [${min}, ${max}].`,
    );
  return value;
}

// Internal injection boundary for lifecycle tests; native interop is not public.
export function createEngine(
  options: AudioOptions,
  contextFactory: () => AudioContext,
): AudioEngine {
  const maxVoices = range(options.maxVoices ?? 32, 1, 128, "maxVoices");
  const perSound = range(
    options.maxVoicesPerSound ?? 8,
    1,
    128,
    "maxVoicesPerSound",
  );
  if (!Number.isInteger(maxVoices) || !Number.isInteger(perSound))
    throw new AudioBitsError(
      "invalid-option",
      "Voice limits must be integers.",
    );
  const level =
    10 ** (range(options.masterGainDb ?? -12, -60, 0, "masterGainDb") / 20);
  let state: AudioState = "idle";
  let context: AudioContext | undefined;
  let master: GainNode | undefined;
  let muted = false;
  let pending: Promise<void> | undefined;
  let cancelStart: (() => void) | undefined;
  let disposal: Promise<void> | undefined;
  const voices: RecordVoice[] = [];
  const listeners = new Set<(state: AudioState) => void>();
  const emit = (next: AudioState) => {
    state = next;
    for (const listener of listeners) {
      try {
        listener(state);
      } catch {
        /* Observers cannot interrupt ownership transitions. */
      }
    }
  };
  const terminal = () => {
    if (state === "disposed" || state === "closed")
      throw new AudioBitsError(
        "disposed",
        "This engine is terminal; create a new engine.",
      );
  };
  const finalize = () => {
    for (const record of [...voices]) record.finish();
  };
  function syncNative() {
    if (!context || state === "disposed") return;
    const native = context.state as string;
    if (native !== "running") finalize();
    if (state !== "starting")
      emit(
        native === "running"
          ? "running"
          : native === "closed"
            ? "closed"
            : native === "interrupted"
              ? "interrupted"
              : "suspended",
      );
  }
  const audio: AudioEngine = {
    get state() {
      return state;
    },
    get counts() {
      return {
        active: voices.filter(
          (record) =>
            record.status === "active" || record.status === "stopping",
        ).length,
        retiring: voices.filter((record) => record.status === "retiring")
          .length,
      };
    },
    start() {
      try {
        terminal();
      } catch (error) {
        return Promise.reject(error);
      }
      if (pending) return pending;
      if (state === "running" && context?.state === "running")
        return Promise.resolve();
      emit("starting");
      if (audio.state === "disposed")
        return Promise.reject(
          new AudioBitsError("disposed", "Engine disposed during startup."),
        );
      let resume: Promise<void>;
      try {
        if (!context) {
          context = contextFactory();
          context.addEventListener("statechange", syncNative);
        }
        if (!master) {
          const gain = context.createGain();
          try {
            gain.gain.value = muted ? 0 : level;
            gain.connect(context.destination);
            master = gain;
          } catch (error) {
            gain.disconnect();
            throw error;
          }
        }
        // Invoke both creation and resume synchronously in the gesture path.
        resume = context.resume();
      } catch {
        emit(context?.state === "closed" ? "closed" : "suspended");
        return Promise.reject(
          new AudioBitsError(
            "start-failed",
            "Audio activation failed. Retry Play with a user gesture.",
          ),
        );
      }
      const cancellation = new Promise<void>((_, reject) => {
        cancelStart = () =>
          reject(
            new AudioBitsError("disposed", "Engine disposed during startup."),
          );
      });
      // Some browsers leave blocked resume promises pending instead of rejecting.
      // A wall-clock activation deadline exposes a retry; sound scheduling still
      // uses only the context clock.
      let activationTimer: ReturnType<typeof setTimeout>;
      const deadline = new Promise<void>((_, reject) => {
        activationTimer = setTimeout(
          () =>
            reject(
              new AudioBitsError(
                "start-failed",
                "Audio activation timed out. Retry Play with a user gesture.",
              ),
            ),
          2000,
        );
      });
      const operation = Promise.race([resume, cancellation, deadline])
        .then(() => {
          if (state === "disposed")
            throw new AudioBitsError(
              "disposed",
              "Engine disposed during startup.",
            );
          if (context?.state !== "running")
            throw new AudioBitsError(
              "start-failed",
              "Audio is blocked. Retry Play with a user gesture.",
            );
          emit("running");
        })
        .catch((error: unknown) => {
          if (state === "disposed")
            throw new AudioBitsError(
              "disposed",
              "Engine disposed during startup.",
            );
          emit(context?.state === "closed" ? "closed" : "suspended");
          throw error instanceof AudioBitsError
            ? error
            : new AudioBitsError(
                "start-failed",
                "Audio activation failed. Retry Play with a user gesture.",
              );
        })
        .finally(() => {
          clearTimeout(activationTimer);
          if (pending === operation) {
            pending = undefined;
            cancelStart = undefined;
          }
        });
      pending = operation;
      return operation;
    },
    async suspend() {
      terminal();
      if (pending) await pending;
      terminal();
      finalize();
      if (context) {
        await context.suspend();
        syncNative();
      }
    },
    sound(input) {
      terminal();
      const recipe = defineSound(input);
      const plan = compile(recipe);
      let disposed = false;
      const sound: Sound = {
        recipe,
        play(playOptions = {}) {
          terminal();
          if (disposed)
            throw new AudioBitsError("disposed", "Sound has been disposed.");
          if (state !== "running" || context?.state !== "running" || !master)
            throw new AudioBitsError(
              "not-ready",
              "Call start() from a user gesture before playing.",
            );
          const now = context.currentTime;
          const at = playOptions.at ?? now;
          range(at, now, Number.MAX_SAFE_INTEGER, "at");
          const gainDb = range(playOptions.gainDb ?? 0, -60, 0, "gainDb");
          const pan = range(playOptions.pan ?? 0, -1, 1, "pan");
          checkNyquist(plan, context.sampleRate);
          // Reserved future starts count as active. At most one global retiree,
          // which also guarantees at most one retiree for any individual sound.
          const active = () =>
            voices.filter(
              (record) =>
                record.status === "active" || record.status === "stopping",
            );
          const own = active().filter((record) => record.sound === sound);
          const victim =
            own.length >= perSound
              ? own[0]
              : active().length >= maxVoices
                ? active()[0]
                : undefined;
          if (victim) {
            for (const record of [...voices])
              if (record.status === "retiring") record.finish();
            victim.status = "retiring";
            victim.graph?.stop(0.005);
          }
          let resolveEnded!: () => void;
          const ended = new Promise<void>((resolve) => {
            resolveEnded = resolve;
          });
          const record: RecordVoice = {
            sound,
            status: "active",
            graph: undefined,
            voice: {
              ended,
              get state() {
                return record.status;
              },
              stop() {
                if (record.status !== "active") return;
                record.status = "stopping";
                if (context?.state !== "running") record.finish();
                else record.graph?.stop();
              },
            },
            finish() {
              if (record.status === "ended") return;
              record.status = "ended";
              record.graph?.finish();
              const index = voices.indexOf(record);
              if (index !== -1) voices.splice(index, 1);
              resolveEnded();
            },
          };
          voices.push(record);
          try {
            record.graph = createGraph(
              context,
              master,
              plan,
              at,
              gainDb,
              pan,
              record.finish,
            );
          } catch (error) {
            record.finish();
            throw error;
          }
          return record.voice;
        },
        dispose() {
          if (disposed) return;
          disposed = true;
          for (const record of [...voices])
            if (record.sound === sound) record.finish();
        },
      };
      return sound;
    },
    stopAll() {
      for (const record of [...voices]) record.voice.stop();
    },
    setMuted(value) {
      terminal();
      if (typeof value !== "boolean")
        throw new AudioBitsError("invalid-option", "Mute must be boolean.");
      muted = value;
      if (master && context) {
        const now = context.currentTime;
        const current = master.gain.value;
        master.gain.cancelAndHoldAtTime(now);
        master.gain.setValueAtTime(current, now);
        master.gain.linearRampToValueAtTime(muted ? 0 : level, now + 0.005);
      }
    },
    subscribe(listener) {
      terminal();
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose() {
      if (disposal) return disposal;
      if (state === "disposed") return Promise.resolve();
      emit("disposed");
      cancelStart?.();
      finalize();
      listeners.clear();
      master?.disconnect();
      if (context) context.removeEventListener("statechange", syncNative);
      disposal =
        context && context.state !== "closed"
          ? context.close()
          : Promise.resolve();
      return disposal;
    },
  };
  return audio;
}
export function createAudio(options: AudioOptions = {}): AudioEngine {
  return createEngine(options, () => {
    if (typeof globalThis.AudioContext !== "function")
      throw new AudioBitsError(
        "unsupported-browser",
        "Web Audio is unavailable.",
      );
    return new globalThis.AudioContext();
  });
}
